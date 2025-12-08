"""
Structured Legal Information Extractor
Extracts legal information in organized key-value pairs
"""

import re
from datetime import datetime
from typing import Dict, Any

import ollama

from long_summarizer import get_long_summarizer


class StructuredLegalExtractor:
    def __init__(self):
        self.entity_patterns = {
            'dates': [
                r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b',
                r'\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b'
            ],
            'times': [
                r'\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b',
                r'\b(\d{1,2}\.\d{2}\s*(?:AM|PM|am|pm)?)\b'
            ],
            'amounts': [
                r'(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:crore|lakh|thousand)?'
            ],
            'vehicle_registrations': [
                r'\b([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{4})\b'
            ],
            'case_numbers': [
                r'\b((?:Case|FIR|Complaint|Petition)\s*(?:No\.?|Number)?\s*:?\s*[\w\-/]+)\b'
            ],
            'sections': [
                r'\b((?:Section|Sec\.?|S\.)\s*\d+[A-Za-z]?(?:\s*\([a-z0-9]+\))?(?:\s+of\s+(?:the\s+)?[\w\s]+?(?:Act|Code|IPC|CrPC|CPC))?)\b'
            ],
            'phone_numbers': [
                r'\b(\+91[-\s]?[6-9]\d{9})\b',
                r'\b([6-9]\d{9})\b'
            ],
            'emails': [
                r'\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b'
            ],
            'persons': [
                r'\b(?:(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Advocate|Shri|Smt\.?)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b'
            ],
            'locations': [
                r'\b(Chennai|Mumbai|Delhi|Bangalore|Hyderabad|Kolkata|Pune|Ahmedabad|Jaipur|Lucknow|Chandigarh|Kochi|Coimbatore|Madurai|Thiruvananthapuram|Tamil Nadu|Maharashtra|Karnataka|Kerala)\b'
            ]
        }
    
    def extract_structured_data(self, text: str) -> Dict[str, Any]:
        """
        Extract structured legal information from text
        Returns organized key-value pairs
        """
        structured_data = {
            'dates_and_times': [],
            'monetary_amounts': [],
            'vehicle_information': [],
            'case_references': [],
            'legal_sections': [],
            'contact_information': {},
            'persons_involved': [],
            'locations': [],
            'legal_terms': [],
            'document_types': [],
            'raw_text_summary': text[:200] + '...' if len(text) > 200 else text
        }
        
        # Extract dates
        dates = []
        for pattern in self.entity_patterns['dates']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dates.extend(matches)
        
        # Extract times
        times = []
        for pattern in self.entity_patterns['times']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            times.extend(matches)
        
        # Combine dates and times
        if dates and times:
            for i, date in enumerate(dates):
                time = times[i] if i < len(times) else "Time not specified"
                structured_data['dates_and_times'].append({
                    'date': date,
                    'time': time,
                    'combined': f"{date} at {time}"
                })
        elif dates:
            structured_data['dates_and_times'] = [{'date': d, 'time': 'Not specified'} for d in dates]
        elif times:
            structured_data['dates_and_times'] = [{'date': 'Not specified', 'time': t} for t in times]
        
        # Extract monetary amounts
        for pattern in self.entity_patterns['amounts']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                structured_data['monetary_amounts'].append({
                    'amount': match,
                    'formatted': f"Rs. {match}"
                })
        
        # Extract vehicle information
        for pattern in self.entity_patterns['vehicle_registrations']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                normalized = re.sub(r'\s+', '', match.upper())
                structured_data['vehicle_information'].append({
                    'registration_number': normalized,
                    'original_format': match
                })
        
        # Extract case references
        for pattern in self.entity_patterns['case_numbers']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            structured_data['case_references'].extend(list(set(matches)))
        
        # Extract legal sections
        for pattern in self.entity_patterns['sections']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            structured_data['legal_sections'].extend(list(set(matches)))
        
        # Extract contact information
        emails = []
        for pattern in self.entity_patterns['emails']:
            emails.extend(re.findall(pattern, text))
        
        phones = []
        for pattern in self.entity_patterns['phone_numbers']:
            phones.extend(re.findall(pattern, text))
        
        if emails or phones:
            structured_data['contact_information'] = {
                'emails': list(set(emails)),
                'phone_numbers': list(set(phones))
            }
        
        # Extract persons
        for pattern in self.entity_patterns['persons']:
            matches = re.findall(pattern, text)
            structured_data['persons_involved'].extend(list(set(matches)))
        
        # Extract locations
        for pattern in self.entity_patterns['locations']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            structured_data['locations'].extend(list(set(matches)))
        
        # Extract legal terms
        legal_terms_pattern = r'\b(fraud|cheating|theft|robbery|assault|harassment|discrimination|defamation|trespass|negligence|breach|contract|warranty|guarantee|liability|damages|compensation|bail|custody|arrest|FIR|complaint|petition|appeal|revision|writ|injunction|interim order|summons|warrant|judgment|decree)\b'
        legal_terms = re.findall(legal_terms_pattern, text, re.IGNORECASE)
        structured_data['legal_terms'] = list(set([term.lower() for term in legal_terms]))
        
        # Extract document types
        doc_pattern = r'\b(agreement|contract|deed|invoice|receipt|bill|notice|summons|complaint|FIR|chargesheet|affidavit|power of attorney|will)\b'
        docs = re.findall(doc_pattern, text, re.IGNORECASE)
        structured_data['document_types'] = list(set([doc.lower() for doc in docs]))
        
        # Remove empty fields
        structured_data = {k: v for k, v in structured_data.items() if v}
        
        return structured_data
    
    def generate_summary_with_llm(self, text: str, structured_data: Dict) -> str:
        """
        Use Mistral to generate a comprehensive summary
        """
        try:
            prompt = f"""Analyze this legal text and provide a brief, clear summary in 3-4 sentences.

Text: {text}

Provide ONLY the summary, no additional formatting or labels."""

            response = ollama.chat(
                model='mistral',
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.3, 'num_predict': 200}
            )
            
            return response['message']['content'].strip()
        
        except Exception as e:
            return f"Summary generation failed: {str(e)}"
    
    def extract_and_summarize(self, text: str) -> Dict[str, Any]:
        """Complete extraction with summary.

        Uses Longformer for very long texts, and falls back to the
        existing Mistral-based summarizer for shorter ones.
        """
        structured_data = self.extract_structured_data(text)

        # Heuristic: use Longformer for long documents
        text_str = text or ""
        if len(text_str) > 4000:
            try:
                summarizer = get_long_summarizer()
                summary = summarizer.summarize(text_str)
            except Exception as e:
                print(f"⚠️ Longformer summarization failed, falling back to Mistral: {e}")
                summary = self.generate_summary_with_llm(text_str, structured_data)
        else:
            summary = self.generate_summary_with_llm(text_str, structured_data)
        
        return {
            'summary': summary,
            'structured_data': structured_data,
            'extraction_timestamp': datetime.now().isoformat()
        }

# Singleton instance
_extractor_instance = None

def get_structured_extractor():
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = StructuredLegalExtractor()
    return _extractor_instance