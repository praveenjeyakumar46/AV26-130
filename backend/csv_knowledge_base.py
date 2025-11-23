"""
CSV Knowledge Base Integration
Handles legal document database from CSV files
"""

import pandas as pd
import os
from typing import List, Dict, Any, Optional
import re
from pathlib import Path
import numpy as np

class CSVKnowledgeBase:
    def __init__(self, csv_directory: str = "data"):
        """
        Initialize CSV knowledge base
        Args:
            csv_directory: Directory containing CSV files
        """
        self.csv_dir = Path(csv_directory)
        self.dataframes: Dict[str, pd.DataFrame] = {}
        self.load_csv_files()
    
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
                df = pd.read_csv(csv_file)
                file_name = csv_file.stem  # filename without extension
                self.dataframes[file_name] = df
                print(f"✅ Loaded: {file_name}.csv ({len(df)} records)")
            except Exception as e:
                print(f"❌ Error loading {csv_file.name}: {e}")
    
    def search_by_keyword(self, keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search across all CSV files for a keyword
        Returns list of matching records with source information
        """
        results = []
        keyword_lower = keyword.lower()
        
        for file_name, df in self.dataframes.items():
            # Search across all text columns
            for col in df.columns:
                if df[col].dtype == 'object':  # Text columns only
                    mask = df[col].astype(str).str.lower().str.contains(keyword_lower, na=False, regex=False)
                    matches = df[mask]
                    
                    for _, row in matches.head(limit).iterrows():
                        record = row.to_dict()
                        # Clean record values to be JSON serializable (convert NaN -> None, numpy types -> native)
                        cleaned = {k: (None if pd.isna(v) else (v.item() if isinstance(v, np.generic) else v)) for k, v in record.items()}
                        result = {
                            "source": file_name,
                            "matched_column": col,
                            "data": cleaned
                        }
                        results.append(result)
                    
                    if len(results) >= limit:
                        break
            
            if len(results) >= limit:
                break
        
        return results[:limit]
    
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
                    cleaned = {k: (None if pd.isna(v) else (v.item() if isinstance(v, np.generic) else v)) for k, v in record.items()}
                    results.append({
                        "source": file_name,
                        "type": doc_type,
                        "data": cleaned
                    })
        
        # Also search in content
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
            # Search for requirement-related columns
            for col in df.columns:
                if df[col].dtype == 'object':
                    col_lower = col.lower()
                    
                    # Check if column contains relevant information
                    if any(term in col_lower for term in ['requirement', 'document', 'needed', 'required']):
                        mask = df[col].astype(str).str.lower().str.contains(doc_type_lower, na=False, regex=False)
                        matches = df[mask]
                        
                        for _, row in matches.iterrows():
                            for key, value in row.items():
                                # Skip empty/NaN values
                                if pd.isna(value):
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
            # Search by legal sections
            sections = extracted_entities.get('legal_sections', [])
            for section in sections:
                docs = self.search_by_keyword(section, limit=2)
                relevant_docs.extend(docs)
            
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
            "files": {}
        }
        
        for file_name, df in self.dataframes.items():
            stats["files"][file_name] = {
                "records": len(df),
                "columns": list(df.columns),
                "sample": []
            }
            if not df.empty:
                sample_record = df.head(1).to_dict('records')[0]
                cleaned_sample = {k: (None if pd.isna(v) else (v.item() if isinstance(v, np.generic) else v)) for k, v in sample_record.items()}
                stats["files"][file_name]["sample"] = [cleaned_sample]

        return stats


# Global singleton
_knowledge_base = None

def get_knowledge_base(csv_directory: str = "data") -> CSVKnowledgeBase:
    """Get or create singleton instance"""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = CSVKnowledgeBase(csv_directory)
    return _knowledge_base
