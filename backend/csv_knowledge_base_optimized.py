"""
CSV Knowledge Base Integration - OPTIMIZED VERSION
Handles legal document database from CSV files with improved performance
"""

import pandas as pd
import os
from typing import List, Dict, Any, Optional
import re
from pathlib import Path
import numpy as np
from numpy.linalg import norm
from functools import lru_cache

from legal_embeddings import get_embedding_model


class CSVKnowledgeBaseOptimized:
    def __init__(self, csv_directory: str = "data"):
        """
        Initialize CSV knowledge base with optimizations
        Args:
            csv_directory: Directory containing CSV files
        """
        self.csv_dir = Path(csv_directory)
        self.dataframes: Dict[str, pd.DataFrame] = {}
        self.search_indices: Dict[str, Dict[str, pd.DataFrame]] = {}  # Pre-computed search indices
        # Semantic embeddings per file: file_name -> (N, D) float32 array
        self.embeddings: Dict[str, np.ndarray] = {}
        # Shared LegalBERT embedding model
        self._embedding_model = get_embedding_model()

        self.load_csv_files()
        self._build_search_indices()
        self._build_semantic_indices()
    
    def load_csv_files(self):
        """Load all CSV files from the data directory"""
        if not self.csv_dir.exists():
            print(f"⚠️ Warning: CSV directory '{self.csv_dir}' not found")
            return
        
        csv_files = list(self.csv_dir.glob("*.csv"))
        
        if not csv_files:
            print(f"⚠️ Warning: No CSV files found in '{self.csv_dir}'")
            return
        
        for csv_file in csv_files:
            try:
                # Use optimized reading parameters
                df = pd.read_csv(csv_file, 
                                dtype=str,  # Read all as strings for consistent searching
                                na_filter=False)  # Faster reading, we'll handle NaN later
                file_name = csv_file.stem
                self.dataframes[file_name] = df
                print(f"✅ Loaded: {file_name}.csv ({len(df)} records)")
            except Exception as e:
                print(f"❌ Error loading {csv_file.name}: {e}")
    
    def _build_search_indices(self):
        """Build search indices for faster lookups"""
        print("🔨 Building search indices...")
        
        for file_name, df in self.dataframes.items():
            # Create lowercase indices for each important column
            indices = {}
            
            # Index by Section number (if exists)
            if 'Section' in df.columns:
                # Extract just the section number for faster exact matching
                df['_section_key'] = df['Section'].str.extract(r'(\d+[A-Za-z]?)', expand=False).str.upper()
                indices['section'] = df.set_index('_section_key', drop=False)
            
            # Create full-text search index (concatenate all columns)
            text_columns = [col for col in df.columns if col not in ['_section_key']]
            df['_search_text'] = df[text_columns].apply(
                lambda row: ' '.join(row.values.astype(str)).lower(), 
                axis=1
            )
            
            self.search_indices[file_name] = indices
        
        print(f"✅ Search indices built for {len(self.search_indices)} files")

    def _build_semantic_indices(self) -> None:
        """Build LegalBERT-based embeddings for semantic search.

        For each CSV with legal section-like columns, we create one
        embedding per row based on a concatenation of important fields.
        Fails gracefully if the embedding model is unavailable.
        """
        if not self.dataframes:
            return

        # If embedding model failed to load, skip silently.
        if not getattr(self._embedding_model, "model", None):
            print("⚠️ Skipping semantic index build: LegalBERT embedding model not available")
            return

        print("🔨 Building semantic indices with LegalBERT embeddings...")
        for file_name, df in self.dataframes.items():
            # Heuristic: only build for typical legal-sections files
            if not {"Section", "Title", "Description"}.issubset(df.columns):
                continue

            try:
                texts = (
                    df["Section"].fillna("")
                    + " "
                    + df["Title"].fillna("")
                    + " "
                    + df["Description"].fillna("")
                ).tolist()
                embs = self._embedding_model.encode(texts)
                if embs.size == 0:
                    continue
                self.embeddings[file_name] = embs.astype(np.float32)
                print(f"✅ Semantic index built for {file_name} ({embs.shape[0]} rows)")
            except Exception as e:
                print(f"⚠️ Semantic index build failed for {file_name}: {e}")

    @lru_cache(maxsize=100)
    def _cached_keyword_search(self, keyword: str, file_name: str, limit: int) -> tuple:
        """Cached search for frequently used keywords"""
        keyword_lower = keyword.lower()
        df = self.dataframes[file_name]
        
        # Use vectorized string operations (much faster than iterating)
        mask = df['_search_text'].str.contains(keyword_lower, na=False, regex=False)
        matches = df[mask].head(limit)
        
        # Convert to tuple for caching (immutable)
        results = []
        for _, row in matches.iterrows():
            record = row.to_dict()
            # Remove internal columns
            record.pop('_search_text', None)
            record.pop('_section_key', None)
            cleaned = {k: (None if v == '' or pd.isna(v) else v) for k, v in record.items()}
            results.append(cleaned)
        
        return tuple(results)
    
    def search_by_keyword(self, keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Keyword-based search across all CSV files.

        This is the existing optimized string-search that uses
        the `_search_text` column and an LRU cache.
        """
        results = []
        keyword_lower = keyword.lower()
        
        # Prioritize legal sections files
        priority_files = ['legal_sections_ipc', 'legal_sections_cpc', 'legal_sections_crpc', 'legal_sections_comprehensive']
        other_files = [f for f in self.dataframes.keys() if f not in priority_files]
        
        for file_name in priority_files + other_files:
            if file_name not in self.dataframes:
                continue
            
            # Use cached search
            cached_results = self._cached_keyword_search(keyword, file_name, limit)
            
            for record in cached_results:
                result = {
                    "source": file_name,
                    "matched_column": "all",  # We search across all columns
                    "data": record
                }
                results.append(result)
            
            if len(results) >= limit:
                break
        
        return results[:limit]

    def search_semantic(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Semantic search using LegalBERT embeddings and cosine similarity.

        Returns a list of result dicts similar to `search_by_keyword`, but
        additionally includes a `score` field for each result.
        """
        query = (query or "").strip()
        if not query:
            return []

        # If no semantic indices or model, fall back to keyword search
        if not self.embeddings or not getattr(self._embedding_model, "model", None):
            return self.search_by_keyword(query, limit=limit)

        try:
            q_emb = self._embedding_model.encode([query])[0]
        except Exception as e:
            print(f"⚠️ Semantic search encoding failed, falling back to keyword search: {e}")
            return self.search_by_keyword(query, limit=limit)

        if q_emb.ndim != 1:
            q_emb = q_emb.reshape(-1)
        q_emb = q_emb / (norm(q_emb) + 1e-8)

        all_results: List[Dict[str, Any]] = []
        for file_name, embs in self.embeddings.items():
            if embs.size == 0:
                continue
            # Normalize row embeddings
            denom = norm(embs, axis=1, keepdims=True) + 1e-8
            e_norm = embs / denom
            scores = e_norm @ q_emb  # (N,)

            # Top indices for this file
            top_idx = np.argsort(-scores)[:limit]
            df = self.dataframes[file_name].iloc[top_idx]

            for idx, score in zip(top_idx, scores[top_idx]):
                row = df.loc[df.index == idx].iloc[0].to_dict()
                row.pop("_search_text", None)
                row.pop("_section_key", None)
                cleaned = {
                    k: (None if v == "" or pd.isna(v) else v)
                    for k, v in row.items()
                }
                all_results.append(
                    {
                        "source": file_name,
                        "matched_column": "semantic",
                        "score": float(score),
                        "data": cleaned,
                    }
                )

        # Global top-k across all files
        all_results.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        return all_results[:limit]
    
    def search_by_section_number(self, section_number: str) -> Optional[Dict[str, Any]]:
        """
        OPTIMIZED: Fast lookup by section number using index
        Example: search_by_section_number("302") or search_by_section_number("498A")
        """
        # Clean section number
        section_clean = re.sub(r'[^\d\w]', '', section_number).upper()
        
        # Search in indexed section columns
        for file_name, indices in self.search_indices.items():
            if 'section' not in indices:
                continue
            
            section_df = indices['section']
            
            # Try exact match first
            if section_clean in section_df.index:
                row = section_df.loc[section_clean].iloc[0] if isinstance(section_df.loc[section_clean], pd.DataFrame) else section_df.loc[section_clean]
                record = row.to_dict()
                record.pop('_search_text', None)
                record.pop('_section_key', None)
                return {
                    "source": file_name,
                    "data": {k: (None if v == '' or pd.isna(v) else v) for k, v in record.items()}
                }
        
        # Fallback to regular search
        results = self.search_by_keyword(f"Section {section_number}", limit=1)
        return results[0] if results else None
    
    def search_document_type(self, doc_type: str) -> List[Dict[str, Any]]:
        """
        Search for specific document types
        Examples: 'lease deed', 'rent agreement', 'legal notice'
        """
        results = []
        doc_type_lower = doc_type.lower()
        
        for file_name, df in self.dataframes.items():
            # Check if file name matches document type
            if doc_type_lower in file_name.lower():
                # Return first few records as examples
                for _, row in df.head(3).iterrows():
                    record = row.to_dict()
                    record.pop('_search_text', None)
                    record.pop('_section_key', None)
                    cleaned = {k: (None if v == '' or pd.isna(v) else v) for k, v in record.items()}
                    results.append({
                        "source": file_name,
                        "type": doc_type,
                        "data": cleaned
                    })
        
        # Also search in content if no file name match
        if not results:
            results = self.search_by_keyword(doc_type, limit=3)
        
        return results
    
    def get_document_requirements(self, doc_type: str) -> Dict[str, Any]:
        """
        Extract document requirements, procedure, and considerations
        """
        doc_type_lower = doc_type.lower()
        requirements = {
            "document_type": doc_type,
            "requirements": [],
            "procedure": [],
            "legal_considerations": [],
            "format_details": []
        }
        
        for file_name, df in self.dataframes.items():
            # Use vectorized search
            mask = df['_search_text'].str.contains(doc_type_lower, na=False, regex=False)
            matches = df[mask]
            
            for _, row in matches.iterrows():
                for key, value in row.items():
                    # Skip internal columns and empty values
                    if key.startswith('_') or value == '' or pd.isna(value):
                        continue
                    
                    value_str = str(value).strip()
                    if not value_str:
                        continue
                    
                    key_lower = str(key).lower()
                    
                    if 'requirement' in key_lower or 'document' in key_lower:
                        requirements["requirements"].append(value_str)
                    elif 'procedure' in key_lower or 'step' in key_lower:
                        requirements["procedure"].append(value_str)
                    elif 'legal' in key_lower or 'consideration' in key_lower:
                        requirements["legal_considerations"].append(value_str)
                    elif 'format' in key_lower or 'template' in key_lower:
                        requirements["format_details"].append(value_str)
        
        return requirements
    
    def extract_legal_sections(self, text: str) -> List[str]:
        """Extract legal sections mentioned in text"""
        section_pattern = re.compile(
            r'(?:Section|Sec\.?|S\.)\s*\d+[A-Za-z0-9\-\(\)\/]*(?:\s+of\s+(?:IPC|CrPC|CPC|[\w\s]+Act))?',
            re.IGNORECASE
        )
        return section_pattern.findall(text)
    
    def get_relevant_documents(self, query: str, extracted_entities: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get relevant documents based on query and extracted entities
        """
        relevant_docs = []
        
        # Search by document type if mentioned
        doc_keywords = [
            'lease', 'rent', 'agreement', 'deed', 'notice', 'petition', 
            'bail', 'fir', 'complaint', 'nda', 'trust', 'adoption',
            'separation', 'partition', 'settlement', 'power of attorney',
            'trademark', 'copyright', 'loan', 'defamation'
        ]
        
        for keyword in doc_keywords:
            if keyword in query.lower():
                docs = self.search_document_type(keyword)
                relevant_docs.extend(docs)
        
        # Search by entities
        if extracted_entities:
            # Search by legal sections (use fast section lookup)
            sections = extracted_entities.get('legal_sections', [])
            for section in sections:
                # Extract section number
                section_num = re.search(r'\d+[A-Za-z]?', section)
                if section_num:
                    doc = self.search_by_section_number(section_num.group())
                    if doc:
                        relevant_docs.append(doc)
            
            # Search by acts
            acts = extracted_entities.get('acts', [])
            for act in acts:
                docs = self.search_by_keyword(act, limit=2)
                relevant_docs.extend(docs)
        
        # Remove duplicates
        seen = set()
        unique_docs = []
        for doc in relevant_docs:
            doc_id = f"{doc['source']}_{doc.get('matched_column', '')}"
            if doc_id not in seen:
                seen.add(doc_id)
                unique_docs.append(doc)
        
        return unique_docs[:10]  # Limit to top 10
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded knowledge base"""
        stats = {
            "total_files": len(self.dataframes),
            "total_records": sum(len(df) for df in self.dataframes.values()),
            "indexed_files": len(self.search_indices),
            "cache_size": self._cached_keyword_search.cache_info(),
            "files": {}
        }
        
        for file_name, df in self.dataframes.items():
            stats["files"][file_name] = {
                "records": len(df),
                "columns": [col for col in df.columns if not col.startswith('_')],
                "indexed": 'section' in self.search_indices.get(file_name, {})
            }

        return stats


# Global singleton
_knowledge_base_optimized = None

def get_knowledge_base_optimized(csv_directory: str = "data") -> CSVKnowledgeBaseOptimized:
    """Get or create singleton instance of optimized knowledge base"""
    global _knowledge_base_optimized
    if _knowledge_base_optimized is None:
        _knowledge_base_optimized = CSVKnowledgeBaseOptimized(csv_directory)
    return _knowledge_base_optimized


# Backward compatibility: also provide same function name as original
def get_knowledge_base(csv_directory: str = "data") -> CSVKnowledgeBaseOptimized:
    """Backward compatible function - returns optimized version"""
    return get_knowledge_base_optimized(csv_directory)
