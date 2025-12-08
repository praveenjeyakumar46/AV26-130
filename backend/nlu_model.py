"""
Enhanced Legal NLU Model - Production Ready
Combines zero-shot classification with robust entity extraction
and (optionally) a domain-specific LegalBERT classifier.
"""

from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import re
from typing import Dict, List, Any, Optional
import torch

class LegalNLU:
    def __init__(self, device: int = -1):
        """
        Initialize NLU pipelines
        device: -1 for CPU, 0+ for GPU
        """
        print("🔄 Loading NLU models...")
        
        try:
            # Zero-shot classifier for intent detection (general-domain)
            self.classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=device
            )
            
            # Optional: domain-specific LegalBERT classifier
            # NOTE: this expects a sequence-classification checkpoint. If a
            # compatible checkpoint is not available, loading will fail
            # gracefully and the rest of the NLU will continue to work.
            self.legalbert_model_name = "nlpaueb/legal-bert-base-uncased"
            self.legalbert_tokenizer: Optional[AutoTokenizer] = None
            self.legalbert_model: Optional[AutoModelForSequenceClassification] = None
            try:
                print(f"🔄 Loading LegalBERT classifier: {self.legalbert_model_name} ...")
                self.legalbert_tokenizer = AutoTokenizer.from_pretrained(self.legalbert_model_name)
                self.legalbert_model = AutoModelForSequenceClassification.from_pretrained(
                    self.legalbert_model_name
                )
                if device >= 0:
                    self.legalbert_model.to(device)
                print("✅ LegalBERT classifier loaded successfully")
            except Exception as le:
                print(f"⚠️ Warning: Could not load LegalBERT classifier: {le}")
                self.legalbert_tokenizer = None
                self.legalbert_model = None
            
            # Named Entity Recognition
            self.ner = pipeline(
                "ner",
                model="dslim/bert-base-NER",
                aggregation_strategy="simple",
                device=device
            )
            
            print("✅ NLU models loaded successfully")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not load NLU models: {e}")
            self.classifier = None
            self.ner = None
        
        # Supported intents
        self.intents = [
            "file a complaint",
            "file a civil suit",
            "consumer complaint",
            "seek legal advice",
            "draft legal document",
            "check legal section",
            "property dispute",
            "payment dispute",
            "employment issue",
            "family matter",
            "other"
        ]
        
        # Enhanced regex patterns for Indian legal context
        self.patterns = {
            "date": re.compile(
                r'\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[a-z]*\s+\d{4})\b',
                re.IGNORECASE
            ),
            "amount": re.compile(
                r'(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d+)?(?:\s*(?:crore|lakh|thousand|hundred))?',
                re.IGNORECASE
            ),
            "vehicle_reg": re.compile(
                r'\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}\b'
            ),
            "organization": re.compile(
                r'\b(?:Regional\s+Transport\s+Office|RTO|Transport\s+Office|Court|Police|Bank|Company|Department|Ministry|Commission|Authority|Board|Corporation)\b',
                re.IGNORECASE
            ),
            "ipc_section": re.compile(
                r'(?:Section|Sec\.?|S\.)\s*\d+[A-Za-z0-9\-\(\)\/]*(?:\s+of\s+(?:IPC|CrPC|CPC|[\w\s]+Act))?',
                re.IGNORECASE
            ),
            "act": re.compile(
                r'\b[\w\s]{3,}(?:Act|Code|Law|Constitution|Amendment|Ordinance|Regulation)\b',
                re.IGNORECASE
            ),
            "person": re.compile(
                r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b'
            ),
            "email": re.compile(
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            ),
            "phone": re.compile(
                r'\b(?:\+91[-\s]?)?[6-9]\d{9}\b'
            ),
            "case_number": re.compile(
                r'\b(?:Case|FIR|Complaint)\s+No\.?\s*[A-Z0-9\-/]+\b',
                re.IGNORECASE
            )
        }
    
    def _regex_extract(self, text: str) -> Dict[str, List[str]]:
        """
        Extract entities using regex patterns
        """
        extracted = {}
        
        for key, pattern in self.patterns.items():
            matches = pattern.findall(text)
            # Deduplicate while preserving order
            unique_matches = list(dict.fromkeys([m.strip() for m in matches if m.strip()]))
            extracted[key] = unique_matches
        
        return extracted
    
    def _merge_ner_tokens(self, ner_entities: List[Dict[str, Any]]) -> List[str]:
        """
        Merge fragmented NER tokens into complete entities
        Example: ["Hyundai", "i", "20"] -> ["Hyundai i20"]
        """
        if not ner_entities:
            return []
        
        merged = []
        buffer = []
        prev_end = -1
        
        for ent in ner_entities:
            word = ent.get("word", "").strip().replace("##", "")
            start = ent.get("start", 0)
            end = ent.get("end", 0)
            
            # Join if tokens are close together (within 2 characters)
            if start - prev_end <= 2 and buffer:
                buffer.append(word)
            else:
                if buffer:
                    merged_entity = " ".join(buffer).strip()
                    merged_entity = re.sub(r'\s+', ' ', merged_entity)
                    merged.append(merged_entity)
                buffer = [word]
            
            prev_end = end
        
        # Add last buffer
        if buffer:
            merged_entity = " ".join(buffer).strip()
            merged_entity = re.sub(r'\s+', ' ', merged_entity)
            merged.append(merged_entity)
        
        # Post-process: join alphanumeric patterns like "i 20" -> "i20"
        processed = []
        for entity in merged:
            entity = re.sub(r'\b([A-Za-z])\s+(\d+)\b', r'\1\2', entity)
            processed.append(entity)
        
        return list(dict.fromkeys(processed))
    
    def classify_with_legalbert(self, text: str) -> Optional[Dict[str, Any]]:
        """Classify text with LegalBERT sequence classifier, if available.

        Returns a dict with `label` and `score`, or None if the classifier
        is not configured or an error occurs.
        """
        if not self.legalbert_model or not self.legalbert_tokenizer:
            return None

        try:
            inputs = self.legalbert_tokenizer(
                text,
                truncation=True,
                padding=True,
                return_tensors="pt",
            )
            device = next(self.legalbert_model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}

            with torch.no_grad():
                logits = self.legalbert_model(**inputs).logits
                probs = torch.softmax(logits, dim=-1)[0]

            label_id = int(torch.argmax(probs).item())
            score = float(probs[label_id].item())
            label = self.legalbert_model.config.id2label.get(label_id, str(label_id))
            return {"label": label, "score": score}
        except Exception as e:
            print(f"⚠️ LegalBERT classification error: {e}")
            return None

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Main NLU analysis function
        Returns comprehensive entity and intent analysis
        """
        if not text or not text.strip():
            return {
                "error": "Empty text provided",
                "intent": "unknown",
                "intent_confidence": 0.0,
                "entities": {},
                "combined_entities": []
            }
        
        text = text.strip()
        
        # 1. Intent Detection (zero-shot, general-domain)
        intent = "other"
        intent_score = 0.0
        
        if self.classifier:
            try:
                intent_result = self.classifier(
                    text,
                    candidate_labels=self.intents,
                    multi_label=False
                )
                intent = intent_result["labels"][0]
                intent_score = round(intent_result["scores"][0], 3)
            except Exception as e:
                print(f"⚠️ Intent detection error: {e}")
        
        # 1b. Optional LegalBERT classification (does not override base intent
        # yet; exposed as additional signal)
        legalbert_result = self.classify_with_legalbert(text)
        
        # 2. Named Entity Recognition
        ner_entities = []
        if self.ner:
            try:
                ner_result = self.ner(text)
                ner_entities = self._merge_ner_tokens(ner_result)
            except Exception as e:
                print(f"⚠️ NER error: {e}")
        
        # 3. Regex-based extraction
        regex_entities = self._regex_extract(text)
        
        # 4. Combine all entities
        all_entities = []
        
        # Add regex entities
        for entity_list in regex_entities.values():
            all_entities.extend(entity_list)
        
        # Add NER entities
        all_entities.extend(ner_entities)
        
        # 5. Clean and deduplicate
        combined = []
        seen = set()
        
        for entity in all_entities:
            entity_clean = entity.strip()
            entity_lower = entity_clean.lower()
            
            # Skip very short or very long entities
            if len(entity_clean) < 2 or len(entity_clean) > 100:
                continue
            
            # Skip if already seen (case-insensitive)
            if entity_lower in seen:
                continue
            
            seen.add(entity_lower)
            combined.append(entity_clean)
        
        # Sort by length (longer entities first, likely more specific)
        combined.sort(key=len, reverse=True)
        
        # 6. Normalize vehicle registration numbers
        normalized_vehicles = []
        for veh in regex_entities.get("vehicle_reg", []):
            normalized = re.sub(r'\s+', '', veh.upper())
            normalized_vehicles.append(normalized)
        
        # 7. Build result
        result = {
            "intent": intent,
            "intent_confidence": intent_score,
            "legalbert_intent": legalbert_result.get("label") if legalbert_result else None,
            "legalbert_confidence": legalbert_result.get("score") if legalbert_result else None,
            "entities": {
                "persons": regex_entities.get("person", []),
                "organizations": regex_entities.get("organization", []),
                "sections": regex_entities.get("ipc_section", []),
                "acts": regex_entities.get("act", []),
                "amounts": regex_entities.get("amount", []),
                "dates": regex_entities.get("date", []),
                "vehicles": normalized_vehicles,
                "emails": regex_entities.get("email", []),
                "phones": regex_entities.get("phone", []),
                "case_numbers": regex_entities.get("case_number", [])
            },
            "combined_entities": combined[:30],  # Limit to top 30
            "ner_entities": ner_entities[:20]  # Raw NER output
        }
        
        return result
    
    def get_legal_context(self, text: str) -> Dict[str, Any]:
        """
        Quick legal context analysis
        """
        analysis = self.analyze(text)
        
        # Determine legal domain
        domain = "General"
        if any(sec for sec in analysis["entities"]["sections"] if "IPC" in sec.upper()):
            domain = "Criminal"
        elif any(sec for sec in analysis["entities"]["sections"] if "CPC" in sec.upper()):
            domain = "Civil"
        elif "consumer" in text.lower():
            domain = "Consumer"
        elif any(term in text.lower() for term in ["family", "marriage", "divorce", "custody"]):
            domain = "Family"
        
        return {
            "domain": domain,
            "intent": analysis["intent"],
            "confidence": analysis["intent_confidence"],
            "key_entities": analysis["combined_entities"][:10],
            "has_sections": len(analysis["entities"]["sections"]) > 0,
            "has_amounts": len(analysis["entities"]["amounts"]) > 0,
            "has_dates": len(analysis["entities"]["dates"]) > 0
        }

# Global singleton instance
_nlu_instance = None

def get_nlu():
    """
    Get or create singleton instance of NLU
    """
    global _nlu_instance
    if _nlu_instance is None:
        _nlu_instance = LegalNLU()
    return _nlu_instance