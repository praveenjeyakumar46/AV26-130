"""
Fine-tuned Legal Keyword Extractor - Production Ready
Handles large texts with intelligent chunking and robust parsing
"""

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch
import json
import re
from typing import Dict, List, Any

class FineTunedLegalExtractor:
    def __init__(self, model_path="./data/trained_model"):
        print("🔄 Loading fine-tuned legal extraction model...")
        
        try:
            # Load base model with optimized settings
            base_model = AutoModelForCausalLM.from_pretrained(
                "mistralai/Mistral-7B-Instruct-v0.2",
                torch_dtype=torch.float16,
                device_map="auto",
                low_cpu_mem_usage=True
            )
            
            # Load fine-tuned LoRA weights
            self.model = PeftModel.from_pretrained(base_model, model_path)
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.tokenizer.pad_token = self.tokenizer.eos_token
            self.tokenizer.padding_side = "right"
            
            print("✅ Model loaded successfully")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not load fine-tuned model: {e}")
            print("💡 Falling back to base model...")
            # Fallback to base model if fine-tuned not available
            self.model = AutoModelForCausalLM.from_pretrained(
                "mistralai/Mistral-7B-Instruct-v0.2",
                torch_dtype=torch.float16,
                device_map="auto"
            )
            self.tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct-v0.2")
            self.tokenizer.pad_token = self.tokenizer.eos_token
    
    def _chunk_text_by_sentences(self, text: str, max_tokens: int = 1500) -> List[str]:
        """
        Intelligently chunk text by sentences to preserve context
        """
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            # Rough token estimation (1 token ≈ 4 chars)
            sentence_tokens = len(sentence) // 4
            
            if current_tokens + sentence_tokens > max_tokens and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_tokens = sentence_tokens
            else:
                current_chunk.append(sentence)
                current_tokens += sentence_tokens
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks if chunks else [text]
    
    def _merge_chunk_results(self, results: List[Dict]) -> Dict:
        """
        Intelligently merge results from multiple chunks
        """
        if not results:
            return self._empty_result()
        
        # Use first chunk for primary fields
        merged = {
            "legal_domain": results[0].get("legal_domain", "General"),
            "incident_type": results[0].get("incident_type", "Legal Matter"),
            "case_category": results[0].get("case_category", "General"),
            "urgency_level": self._determine_max_urgency([r.get("urgency_level", "Low") for r in results])
        }
        
        # Merge keywords from all chunks
        all_keywords = []
        all_sections = []
        
        for result in results:
            all_keywords.extend(result.get("legal_keywords", []))
            all_sections.extend(result.get("relevant_sections", []))
        
        # Deduplicate while preserving order
        merged["legal_keywords"] = list(dict.fromkeys([k.strip() for k in all_keywords if k and k.strip()]))
        merged["relevant_sections"] = list(dict.fromkeys([s.strip() for s in all_sections if s and s.strip()]))
        
        return merged
    
    def _determine_max_urgency(self, urgencies: List[str]) -> str:
        """Determine highest urgency level"""
        urgency_priority = {"High": 3, "Medium": 2, "Low": 1, "Unknown": 0}
        max_urgency = max(urgencies, key=lambda x: urgency_priority.get(x, 0))
        return max_urgency
    
    def _empty_result(self) -> Dict:
        """Return empty result structure"""
        return {
            "legal_domain": "Unknown",
            "incident_type": "Not determined",
            "legal_keywords": [],
            "relevant_sections": [],
            "case_category": "General",
            "urgency_level": "Medium"
        }
    
    def extract_legal_keywords(self, user_description: str) -> Dict[str, Any]:
        """
        Main extraction method with automatic chunking for large texts
        """
        if not user_description or len(user_description.strip()) < 10:
            return {"error": "Text too short for extraction"}
        
        # Chunk large texts
        chunks = self._chunk_text_by_sentences(user_description, max_tokens=1500)
        
        if len(chunks) > 1:
            print(f"📄 Processing {len(chunks)} chunks...")
        
        results = []
        for i, chunk in enumerate(chunks):
            if len(chunks) > 1:
                print(f"  ⏳ Chunk {i+1}/{len(chunks)}...")
            
            result = self._extract_from_single_chunk(chunk)
            if "error" not in result:
                results.append(result)
        
        if not results:
            return {"error": "Failed to extract from any chunk"}
        
        # Merge results from all chunks
        final_result = self._merge_chunk_results(results)
        return final_result
    
    def _extract_from_single_chunk(self, text: str) -> Dict[str, Any]:
        """
        Extract from a single text chunk
        """
        # Construct prompt with explicit formatting
        prompt = f"""[INST] You are an expert legal keyword extraction system for Indian law.

Extract precise legal information from this incident description.

CRITICAL INSTRUCTIONS:
1. Extract COMPLETE legal terms (never truncate words)
2. Use full official names for acts and sections
3. Output ONLY valid JSON
4. No explanations outside JSON

Required JSON format:
{{
  "legal_domain": "Criminal/Civil/Family/Labor/Consumer/Constitutional",
  "incident_type": "brief description",
  "legal_keywords": ["complete term 1", "complete term 2", "complete term 3"],
  "relevant_sections": ["Section X of Y Act", "Section Z of W Act"],
  "case_category": "category name",
  "urgency_level": "High/Medium/Low"
}}

Incident Description:
{text}

JSON Output: [/INST]

{{"""
        
        try:
            # Tokenize with truncation
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=3500,
                padding=True
            ).to(self.model.device)
            
            # Generate with optimized parameters
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=1024,
                    temperature=0.15,  # Very low for precise extraction
                    top_p=0.9,
                    top_k=50,
                    do_sample=True,
                    repetition_penalty=1.1,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    num_return_sequences=1
                )
            
            # Decode response
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract JSON portion
            if "[/INST]" in response:
                response = response.split("[/INST]")[-1].strip()
            
            # Parse JSON with multiple strategies
            result = self._extract_json_robust(response)
            
            if result:
                # Validate and clean
                result = self._validate_result(result)
                return result
            else:
                # Fallback extraction
                return self._fallback_extraction(text)
                
        except Exception as e:
            print(f"⚠️ Extraction error: {e}")
            return self._fallback_extraction(text)
    
    def _extract_json_robust(self, text: str) -> Dict:
        """
        Robust JSON extraction with multiple fallback strategies
        """
        # Strategy 1: Find complete JSON object
        json_pattern = r'\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}'
        matches = re.findall(json_pattern, text, re.DOTALL)
        
        for match in matches:
            try:
                result = json.loads(match)
                if isinstance(result, dict) and 'legal_keywords' in result:
                    return result
            except:
                continue
        
        # Strategy 2: Try to fix common JSON errors
        text = text.strip()
        if text.startswith('{'):
            # Add missing closing brace
            if not text.endswith('}'):
                text += '}'
            
            try:
                return json.loads(text)
            except:
                # Try to fix trailing commas
                text = re.sub(r',(\s*[}\]])', r'\1', text)
                try:
                    return json.loads(text)
                except:
                    pass
        
        return None
    
    def _validate_result(self, result: Dict) -> Dict:
        """
        Validate and clean extraction result
        """
        # Ensure all required fields exist
        validated = {
            "legal_domain": str(result.get("legal_domain", "General")),
            "incident_type": str(result.get("incident_type", "Legal matter")),
            "legal_keywords": [],
            "relevant_sections": [],
            "case_category": str(result.get("case_category", "General")),
            "urgency_level": str(result.get("urgency_level", "Medium"))
        }
        
        # Clean keywords
        keywords = result.get("legal_keywords", [])
        if isinstance(keywords, list):
            for kw in keywords:
                kw_str = str(kw).strip()
                # Remove truncation artifacts
                kw_str = re.sub(r'[^\w\s\-\(\)]$', '', kw_str)
                if kw_str and 3 <= len(kw_str) <= 100:
                    validated["legal_keywords"].append(kw_str)
        
        # Clean sections
        sections = result.get("relevant_sections", [])
        if isinstance(sections, list):
            for sec in sections:
                sec_str = str(sec).strip()
                # Validate section format
                if sec_str and len(sec_str) >= 5:
                    validated["relevant_sections"].append(sec_str)
        
        return validated
    
    def _fallback_extraction(self, text: str) -> Dict:
        """
        Fallback extraction using regex patterns when JSON parsing fails
        """
        print("⚠️ Using fallback extraction method...")
        
        result = self._empty_result()
        
        # Extract legal keywords using patterns
        keywords = set()
        
        # Pattern 1: IPC/CrPC/CPC sections
        section_matches = re.findall(
            r'(?:Section|Sec\.?|S\.)\s*\d+[A-Za-z]?(?:\s*\([a-z0-9]+\))?(?:\s+of\s+[\w\s]+(?:Act|Code|IPC|CrPC|CPC))?',
            text,
            re.IGNORECASE
        )
        keywords.update(section_matches)
        result["relevant_sections"] = list(set(section_matches))
        
        # Pattern 2: Legal terms
        legal_terms = re.findall(
            r'\b(?:accused|plaintiff|defendant|petitioner|respondent|complainant|witness|victim|FIR|chargesheet|bail|custody|arrest|summons|warrant|judgment|decree|injunction|appeal|revision|writ|habeas corpus|mandamus|certiorari|quo warranto|prohibition)\b',
            text,
            re.IGNORECASE
        )
        keywords.update([term.lower() for term in legal_terms])
        
        # Pattern 3: Amounts
        amounts = re.findall(r'(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d+)?', text, re.IGNORECASE)
        keywords.update(amounts)
        
        # Pattern 4: Dates
        dates = re.findall(
            r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b',
            text,
            re.IGNORECASE
        )
        keywords.update(dates)
        
        # Pattern 5: Acts and laws
        acts = re.findall(
            r'\b[\w\s]+(?:Act|Code|Law|Constitution|Amendment|Ordinance|Regulation)\b',
            text,
            re.IGNORECASE
        )
        keywords.update([act.strip() for act in acts if len(act.strip()) > 5])
        
        # Determine domain from keywords
        if any(term in text.lower() for term in ['ipc', 'criminal', 'fir', 'arrest', 'bail', 'accused']):
            result["legal_domain"] = "Criminal"
            result["incident_type"] = "Criminal matter"
        elif any(term in text.lower() for term in ['civil', 'suit', 'plaintiff', 'defendant', 'decree']):
            result["legal_domain"] = "Civil"
            result["incident_type"] = "Civil dispute"
        elif any(term in text.lower() for term in ['consumer', 'deficiency', 'service', 'product']):
            result["legal_domain"] = "Consumer"
            result["incident_type"] = "Consumer complaint"
        else:
            result["legal_domain"] = "General"
            result["incident_type"] = "Legal matter"
        
        # Clean and limit keywords
        result["legal_keywords"] = [k for k in list(keywords)[:20] if len(k) >= 3]
        
        return result

# Global singleton instance
_extractor_instance = None

def get_extractor():
    """
    Get or create singleton instance of the extractor
    """
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = FineTunedLegalExtractor()
    return _extractor_instance