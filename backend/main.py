from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import ollama
import json
import re
import io
from typing import List, Optional, Dict, Any
import sys
import os
from datetime import datetime

try:
    ollama_client = ollama.Client()
except (AttributeError, TypeError):
    ollama_client = None

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from csv_knowledge_base_optimized import get_knowledge_base
    _kb_available = True
except Exception as e:
    print(f"⚠️ csv_knowledge_base_optimized: {e}")
    _kb_available = False

try:
    from legal_section_matcher_optimized import get_section_matcher
    _matcher_available = True
except Exception as e:
    print(f"⚠️ legal_section_matcher_optimized: {e}")
    _matcher_available = False

try:
    from structured_extractor import get_structured_extractor
    _extractor_available = True
except Exception as e:
    print(f"⚠️ structured_extractor: {e}")
    _extractor_available = False

try:
    from answer_generator import get_answer_generator
    _answer_gen_available = True
except Exception as e:
    print(f"⚠️ answer_generator: {e}")
    _answer_gen_available = False

try:
    from general_conversation import handle_general_conversation
except Exception as e:
    print(f"⚠️ general_conversation: {e}")
    handle_general_conversation = None

# Optional BiLSTM-GRU case type classifier
try:
    from case_type_model import get_case_type_classifier
    _case_classifier_available = True
except Exception as e:
    print(f"⚠️ case_type_model: {e}")
    _case_classifier_available = False

app = FastAPI(title="Legal AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_keywords_with_mistral(text: str, language: str = 'en') -> Dict[str, Any]:
    """
    Use Mistral LLM to extract structured keywords in key-value pairs format
    Returns structured data with combined date-time pairs
    Handles complex cases like land disputes, property issues, etc.
    """
    try:
        language_name = 'Tamil' if language.startswith('ta') else 'English'
        
        prompt = f"""Extract all relevant information from this legal text and format it as key-value pairs in JSON format.
This can be a complex case involving property disputes, land issues, civil matters, or criminal incidents.

Text: {text}

Extract and format the following information (if available):
- "Complainant/Reporter Name": Full name of the person reporting/complaining
- "Victim Name": Full name of the victim (if different from complainant)
- "Accused/Defendant Name": Full name of accused, defendant, or opposing party
- "Company/Organization Name": Names of companies, developers, organizations involved
- "Date and Time": Combine ALL dates and times mentioned in format "DD/MM/YYYY&HH:MM AM/PM" (separate multiple with semicolon)
- "Location/Address": Full address, property details, survey numbers, village names
- "Property Details": Survey numbers, acreage, property descriptions, land measurements
- "Incident Type": Type of incident (land dispute, property encroachment, fraud, forgery, threat, etc.)
- "Case Type": Classify as "Civil" or "Criminal" based on the nature
- "Witness Names": Names of any witnesses mentioned
- "Vehicle Details": Vehicle registration, bike numbers, vehicle descriptions
- "Phone Numbers": Contact numbers
- "Email Addresses": Email addresses
- "Monetary Amounts": Any money amounts, property values mentioned
- "Case/FIR Number": Case or FIR numbers if mentioned
- "Legal Sections": Any legal sections mentioned (IPC, CrPC, CPC, etc.)
- "Documents Mentioned": All documents (sale deeds, patta, agreements, receipts, etc.)
- "Key Allegations": Main complaints or allegations
- "Threats/Intimidation": Any threats or intimidation mentioned
- "Additional Details": Other important information

Return ONLY a valid JSON object with these key-value pairs. Use null for missing information.
Format dates and times as: "date and time":"DD/MM/YYYY&HH:MM AM/PM; DD/MM/YYYY&HH:MM AM/PM" for multiple
Example: {{"date and time":"03/02/2025&10:30 AM; 05/02/2025&7:45 PM", "Complainant/Reporter Name":"S. Rajendran"}}

JSON:"""

        available_models = []
        try:
            if ollama_client:
                available_models = [getattr(m, 'model', str(m)) for m in ollama_client.list().models]
            else:
                available_models = [m.get('name', '') for m in ollama.list().get('models', [])]
        except:
            pass
        
        # Use Mistral for keyword extraction (input handling)
        extraction_model = None
        for preferred in ['mistral']:
            extraction_model = next((m for m in available_models if preferred in m.lower()), None)
            if extraction_model:
                break
        
        if not extraction_model:
            extraction_model = next((m for m in available_models if 'mistral' in m.lower()), 'mistral')
            if extraction_model != 'mistral':
                print(f"✅ Using Mistral model for keyword extraction: {extraction_model}")
        
        if ollama_client:
            resp = ollama_client.chat(
                model=extraction_model,
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.1, 'num_predict': 1024}
            )
            # Handle different response formats
            if hasattr(resp, 'message'):
                if hasattr(resp.message, 'content'):
                    content = resp.message.content
                elif isinstance(resp.message, dict):
                    content = resp.message.get('content', '')
                else:
                    content = str(resp.message)
            elif isinstance(resp, dict):
                content = resp.get('message', {}).get('content', '')
            else:
                content = str(resp)
        else:
            resp = ollama.chat(
                model=extraction_model,
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.1, 'num_predict': 1024}
            )
            if isinstance(resp, dict):
                content = resp.get('message', {}).get('content', '')
                if not content:
                    content = resp.get('content', '')
            else:
                content = str(resp)
        
        # Check if it's a memory error
        if 'memory' in content.lower() or 'system memory' in content.lower() or content.startswith('LLM_ERROR'):
            print(f"⚠️ Memory error in keyword extraction, trying alternative Mistral model...")
            smaller_models = ['mistral']
            for smaller_model in smaller_models:
                if smaller_model in [m.lower() for m in available_models]:
                    try:
                        if ollama_client:
                            resp = ollama_client.chat(
                                model=smaller_model,
                                messages=[{'role': 'user', 'content': prompt}],
                                options={'temperature': 0.1, 'num_predict': 512}
                            )
                            if hasattr(resp, 'message'):
                                content = getattr(resp.message, 'content', '')
                            elif isinstance(resp, dict):
                                content = resp.get('message', {}).get('content', '')
                            else:
                                content = str(resp)
                        else:
                            resp = ollama.chat(
                                model=smaller_model,
                                messages=[{'role': 'user', 'content': prompt}],
                                options={'temperature': 0.1, 'num_predict': 512}
                            )
                            if isinstance(resp, dict):
                                content = resp.get('message', {}).get('content', '')
                                if not content:
                                    content = resp.get('content', '')
                            else:
                                content = str(resp)
                        
                        if content and not content.startswith('LLM_ERROR'):
                            print(f"✅ Keywords extracted with {smaller_model}")
                            break
                    except:
                        continue
        
        # Try to parse JSON from response
        try:
            # Extract JSON from response (might have markdown code blocks)
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
            if json_match:
                keywords_dict = json.loads(json_match.group(0))
            else:
                # Fallback: try to parse entire content
                keywords_dict = json.loads(content)
        except:
            # If JSON parsing fails, use regex-based extraction as fallback
            keywords_dict = extract_keywords_fallback(text)
        
        return keywords_dict
        
    except Exception as e:
        print(f"⚠️ Keyword extraction error: {e}")
        return extract_keywords_fallback(text)

def extract_keywords_fallback(text: str) -> Dict[str, Any]:
    """Fallback regex-based extraction if LLM fails - Enhanced for complex cases"""
    keywords = {}
    
    # Extract names (including initials like S. Rajendran)
    names = re.findall(r'\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Shri|Smt\.?)?\s*([A-Z]\.?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', text)
    if not names:
        # Try pattern without titles
        names = re.findall(r'\b([A-Z]\.?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
    
    if names:
        keywords["Complainant/Reporter Name"] = names[0].strip()
        if len(names) > 1:
            keywords["Accused/Defendant Name"] = names[1].strip()
        if len(names) > 2:
            keywords["Witness Names"] = ', '.join([n.strip() for n in names[2:5]])
    
    # Extract all dates and times
    dates = re.findall(r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b', text)
    times = re.findall(r'\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b', text)
    
    date_time_pairs = []
    for i, date in enumerate(dates):
        date_str = date.replace('-', '/')
        if i < len(times):
            date_time_pairs.append(f"{date_str}&{times[i]}")
        else:
            date_time_pairs.append(date_str)
    
    if date_time_pairs:
        keywords["Date and Time"] = '; '.join(date_time_pairs)
    elif times:
        keywords["Date and Time"] = '; '.join(times)
    
    # Extract location (enhanced patterns)
    location_patterns = [
        r'(?:residing at|located at|situated in|address:?)\s*([^,]+(?:,\s*[^,]+){0,3})',
        r'(?:Survey No\.?|Survey Number)\s*([\d/]+[A-Z]?)',
        r'([A-Z][a-z]+\s+Village)',
        r'([A-Z][a-z]+\s+Nagar)',
    ]
    
    for pattern in location_patterns:
        location = re.search(pattern, text, re.IGNORECASE)
        if location:
            keywords["Location/Address"] = location.group(1).strip()
            break
    
    # Extract property details
    survey_match = re.search(r'Survey\s+No\.?\s*([\d/]+[A-Z]?)', text, re.IGNORECASE)
    acreage_match = re.search(r'(\d+\.?\d*)\s*(?:acres?|hectares?)', text, re.IGNORECASE)
    
    property_details = []
    if survey_match:
        property_details.append(f"Survey No. {survey_match.group(1)}")
    if acreage_match:
        property_details.append(f"{acreage_match.group(1)} acres")
    
    if property_details:
        keywords["Property Details"] = ', '.join(property_details)
    
    # Extract company/organization names
    companies = re.findall(r'([A-Z][A-Za-z\.\s]+(?:Developers?|Builders?|Company|Pvt\.?\s*Ltd\.?|Limited))', text)
    if companies:
        keywords["Company/Organization Name"] = ', '.join(list(set(companies)))
    
    # Extract incident type (enhanced)
    incident_types = re.findall(r'\b(?:land\s+dispute|property\s+dispute|encroachment|fraud|forgery|threat|intimidation|murder|theft|robbery|assault|harassment|death|accident)\b', text, re.IGNORECASE)
    if incident_types:
        keywords["Incident Type"] = ', '.join(list(set([i.lower() for i in incident_types])))
    
    # Extract documents mentioned
    documents = re.findall(r'\b(?:sale\s+deed|patta|agreement|receipt|bill|tax\s+receipt|electricity\s+bill|registration|document)\b', text, re.IGNORECASE)
    if documents:
        keywords["Documents Mentioned"] = ', '.join(list(set([d.lower() for d in documents])))
    
    return keywords

def generate_summary_with_mistral(text: str, language: str = 'en') -> str:
    """Generate a summary of the input using Mistral"""
    try:
        language_name = 'Tamil' if language.startswith('ta') else 'English'
        
        prompt = f"""Provide a clear, concise summary of this legal incident report in {language_name}. 
Summarize in 3-4 sentences covering:
1. Who is involved (reporter, victim, suspect if mentioned)
2. What happened (incident type)
3. When and where it occurred
4. Key details

Text: {text}

Summary:"""

        available_models = []
        try:
            if ollama_client:
                available_models = [getattr(m, 'model', str(m)) for m in ollama_client.list().models]
            else:
                available_models = [m.get('name', '') for m in ollama.list().get('models', [])]
        except:
            pass
        
        # Use Mistral for summary generation (input handling)
        summary_model = None
        for preferred in ['mistral']:
            summary_model = next((m for m in available_models if preferred in m.lower()), None)
            if summary_model:
                break
        
        if not summary_model:
            summary_model = next((m for m in available_models if 'mistral' in m.lower()), 'mistral')
            if summary_model != 'mistral':
                print(f"✅ Using Mistral model for summary generation: {summary_model}")
        
        if ollama_client:
            resp = ollama_client.chat(
                model=summary_model,
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.3, 'num_predict': 300}
            )
            # Handle different response formats
            if hasattr(resp, 'message'):
                if hasattr(resp.message, 'content'):
                    summary = resp.message.content.strip()
                elif isinstance(resp.message, dict):
                    summary = resp.message.get('content', '').strip()
                else:
                    summary = str(resp.message).strip()
            elif isinstance(resp, dict):
                summary = resp.get('message', {}).get('content', '').strip()
            else:
                summary = str(resp).strip()
        else:
            resp = ollama.chat(
                model=summary_model,
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.3, 'num_predict': 300}
            )
            if isinstance(resp, dict):
                summary = resp.get('message', {}).get('content', '').strip()
                if not summary:
                    summary = resp.get('content', '').strip()
            else:
                summary = str(resp).strip()
        
        if not summary or summary.startswith('LLM_ERROR'):
            # Check if it's a memory error and try smaller model
            if 'memory' in summary.lower() or 'system memory' in summary.lower():
                print(f"⚠️ Memory error in summary generation, trying alternative Mistral model...")
                smaller_models = ['mistral']
                for smaller_model in smaller_models:
                    if smaller_model in [m.lower() for m in available_models]:
                        try:
                            if ollama_client:
                                resp = ollama_client.chat(
                                    model=smaller_model,
                                    messages=[{'role': 'user', 'content': prompt}],
                                    options={'temperature': 0.3, 'num_predict': 200}
                                )
                                if hasattr(resp, 'message'):
                                    summary = getattr(resp.message, 'content', '').strip()
                                elif isinstance(resp, dict):
                                    summary = resp.get('message', {}).get('content', '').strip()
                            else:
                                resp = ollama.chat(
                                    model=smaller_model,
                                    messages=[{'role': 'user', 'content': prompt}],
                                    options={'temperature': 0.3, 'num_predict': 200}
                                )
                                summary = resp.get('message', {}).get('content', '').strip()
                            
                            if summary and not summary.startswith('LLM_ERROR'):
                                print(f"✅ Summary generated with {smaller_model}")
                                break
                        except:
                            continue
            
            if not summary or summary.startswith('LLM_ERROR'):
                # Fallback summary
                print(f"⚠️ Summary generation failed, using fallback")
                summary = f"This is a legal incident report. {text[:200]}..."
        
        return summary
        
    except Exception as e:
        print(f"⚠️ Summary generation error: {e}")
        return f"Summary: {text[:200]}..."

def structure_entities(text: str) -> Dict[str, Any]:
    """Legacy function for backward compatibility"""
    structured: Dict[str, Any] = {
        "dates_and_times": [], "monetary_amounts": [], "names": [], "addresses": [],
        "people": [], "incident_types": [], "vehicle_registrations": [], "vehicle_models": [],
        "emails": [], "phones": [], "case_numbers": [], "legal_sections": [], "acts": [],
        "organizations": [], "documents": []
    }
    
    date_patterns = [r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b', r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b']
    times = re.findall(r'\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b', text)
    for pattern in date_patterns:
        for d in re.findall(pattern, text, re.IGNORECASE):
            structured["dates_and_times"].append({"date": d})
    for t in times:
        if structured["dates_and_times"]:
            structured["dates_and_times"][-1]["time"] = t
        else:
            structured["dates_and_times"].append({"time": t})
    
    structured["monetary_amounts"].extend([{"raw": amt.strip(), "formatted": amt.strip()} for amt in re.findall(r'(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d+)?', text, re.IGNORECASE)])
    names = re.findall(r"\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", text)
    for n in names:
        structured["names"].append(n.strip())
        structured["people"].append(n.strip())
    
    structured["addresses"].extend(re.findall(r'Apartment\s*\d+\w?\s*at\s*[A-Za-z\s]+ Apartments(?:,\s*[A-Za-z\s]+)?', text, re.IGNORECASE))
    structured["vehicle_registrations"].extend([v.replace(' ', '').upper() for v in re.findall(r'\b[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{4}\b', text)])
    structured["emails"].extend(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z9.-]+\.[A-Z|a-z]{2,}\b', text))
    structured["phones"].extend(re.findall(r'\b(?:\+91[-\s]?)?[6-9]\d{9}\b', text))
    structured["legal_sections"].extend(re.findall(r'(?:Section|Sec\.?|S\.)\s*\d+[A-Za-z]?', text, re.IGNORECASE))
    structured["incident_types"].extend(list(set([i.lower() for i in re.findall(r'\b(?:accident|theft|robbery|assault|harassment|murder|death)\b', text, re.IGNORECASE)])))
    
    return structured

def build_labeled_keywords(text: str, structured: Dict[str, Any]) -> List[Dict[str, str]]:
    """Convert structured keywords to labeled format"""
    keywords: List[Dict[str, str]] = []
    def add(label: str, value: str):
        if value and value.strip():
            keywords.append({"label": label, "value": value.strip()})
    
    all_names = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', text)
    if all_names:
        add("Reporter", all_names[0])
        if len(all_names) > 1:
            add("Victim", all_names[1])
        if len(all_names) > 2:
            add("Suspect", all_names[2])
    
    for match in re.finditer(r'\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b', text):
        add("Time", match.group(1))
    
    location = re.search(r'(Apartment\s*\d+\w?\s*at\s*[A-Za-z\s]+ Apartments)', text, re.IGNORECASE)
    if location:
        add("Location", location.group(1))
    
    if structured.get('incident_types'):
        add("Incident type", ', '.join(structured['incident_types']))
    
    return keywords

def llm_chat(model: str, messages: List[Dict[str, str]], options: Dict[str, Any] = None) -> str:
    if options is None:
        options = {"temperature": 0.1, "num_predict": 512}
    try:
        if ollama_client:
            resp = ollama_client.chat(model=model, messages=messages, options=options)
            # Handle different response formats from ollama_client
            if hasattr(resp, 'message'):
                if hasattr(resp.message, 'content'):
                    content = resp.message.content
                elif isinstance(resp.message, dict):
                    content = resp.message.get('content', '')
                else:
                    content = str(resp.message)
            elif isinstance(resp, dict):
                content = resp.get('message', {}).get('content', '')
            else:
                content = str(resp)
            
            if not content or content.strip() == '':
                print(f"⚠️ Empty response from model {model}")
                return f"LLM_ERROR: Empty response from model {model}"
            
            return content.strip()
        else:
            resp = ollama.chat(model=model, messages=messages, options=options)
            # Handle response from ollama.chat()
            if isinstance(resp, dict):
                content = resp.get('message', {}).get('content', '')
                if not content:
                    # Try alternative response structure
                    content = resp.get('content', '')
            else:
                content = str(resp)
            
            if not content or content.strip() == '':
                print(f"⚠️ Empty response from model {model}")
                return f"LLM_ERROR: Empty response from model {model}"
            
            return content.strip()
    except Exception as e:
        error_msg = f"LLM_ERROR: {str(e)}"
        print(f"⚠️ {error_msg}")
        import traceback
        traceback.print_exc()
        return error_msg

def is_general_legal_question(text: str) -> bool:
    return bool(re.search(r'^\s*(?:what|how|when|where|who|why|which|can|could|should|would|is|are|do|does)', text.lower()) or re.search(r'\?\s*$', text))

def answer_from_knowledge_base(query: str, language: str = 'en') -> Optional[Dict[str, Any]]:
    if not _kb_available or not _matcher_available:
        return None
    
    try:
        matcher = get_section_matcher()
        kb = get_knowledge_base()
        
        legal_sections = matcher.get_relevant_sections(query=query, limit=5)
        # Prefer semantic search for answers; fall back to keyword search.
        try:
            results = kb.search_semantic(query, limit=3)
        except Exception as e:
            print(f"⚠️ Semantic KB search failed, falling back to keyword search: {e}")
            results = kb.search_by_keyword(query, limit=3)
        
        if results:
            data = results[0].get('data', {})
            if 'Answer' in data:
                answer = f"**{data.get('Topic', 'Legal Information')}**\n\n{data['Answer']}"
                if legal_sections:
                    answer += "\n\n**Related Sections:**\n"
                    for section in legal_sections[:2]:
                        answer += f"\n• **{section.get('section')}**: {section.get('description')[:150]}...\n"
                return {'answer': answer, 'legal_sections': legal_sections}
        
        if any(word in query.lower() for word in ['section', 'ipc', 'cpc', 'crpc']):
            section_match = re.search(r'section\s*(\d+[a-z]?)', query, re.IGNORECASE)
            if section_match and legal_sections:
                for section in legal_sections:
                    if section_match.group(1) in section.get('section', ''):
                        answer = f"**{section.get('section')}** - {section.get('title')}\n\n{section.get('description')}\n\n"
                        answer += f"**Punishment:** {section.get('punishment')}\n**Bailable:** {section.get('bailable')}"
                        return {'answer': answer, 'legal_sections': [section]}
        
        if legal_sections:
            return {'answer': '', 'legal_sections': legal_sections}
        
        return None
    except Exception as e:
        print(f"KB Error: {e}")
        return None

@app.post('/api/chat/complete')
async def api_chat_complete(request: dict):
    text = request.get('text') or request.get('message') or request.get('content')
    language = request.get('language', 'en')
    is_first_input = request.get('is_first_input', True)  # Track if this is initial input
    
    text_str = str(text).strip() if text else ""
    
    # Check for general conversation (greetings, etc.)
    if handle_general_conversation:
        general_response = handle_general_conversation(text_str)
        if general_response:
            return general_response

    if not text or len(text_str) < 5:
        return {"success": False, "error": "Text too short"}

    is_question = is_general_legal_question(text_str)
    
    # For first input (incident report), generate summary and extract keywords
    summary = ""
    keywords_dict = {}
    keywords_labeled = []
    
    if not is_question and is_first_input:
        # Generate summary using Mistral
        print(f"📝 Generating summary for incident report...")
        summary = generate_summary_with_mistral(text_str, language)
        if summary:
            print(f"✅ Summary generated successfully (length: {len(summary)} chars)")
        else:
            print(f"⚠️ Summary generation returned empty")
        
        # Extract structured keywords using Mistral
        print(f"🔍 Extracting keywords...")
        keywords_dict = extract_keywords_with_mistral(text_str, language)
        if keywords_dict:
            print(f"✅ Keywords extracted: {len([k for k, v in keywords_dict.items() if v])} fields")
        
        # Convert to labeled format for display
        keywords_labeled = [{"label": k, "value": str(v)} for k, v in keywords_dict.items() if v]
    
    # Get legal sections
    kb_legal_sections = []
    if is_question:
        kb_result = answer_from_knowledge_base(text_str, language)
        # Don't return early - always generate detailed analysis
        if kb_result:
            kb_legal_sections = kb_result.get('legal_sections', [])
    
    # Get additional legal sections based on keywords
    legal_sections = kb_legal_sections
    try:
        if _matcher_available and len(legal_sections) < 5:
            matcher = get_section_matcher()
            additional_sections = matcher.get_relevant_sections(query=text_str, keywords=keywords_labeled, limit=5)
            seen_sections = {s.get('section') for s in legal_sections}
            for section in additional_sections:
                if section.get('section') not in seen_sections:
                    legal_sections.append(section)
    except Exception as e:
        print(f"Error getting legal sections: {e}")
    
    # Log extracted keywords to backend (not sent to frontend)
    if keywords_dict:
        print("\n" + "="*60)
        print("📋 EXTRACTED KEYWORDS (Backend Log):")
        print("="*60)
        for key, value in keywords_dict.items():
            if value:
                print(f"  {key}: {value}")
        print("="*60 + "\n")
    
    # Generate detailed answer using answer generator (Llama 3.2 or similar)
    answer = ''
    try:
        available_models = []
        try:
            if ollama_client:
                available_models = [getattr(m, 'model', str(m)) for m in ollama_client.list().models]
            else:
                available_models = [m.get('name', '') for m in ollama.list().get('models', [])]
        except:
            pass
        
        # Use Llama 3.2 for answer generation (output generation)
        model_priority = [
            'llama3.2:3b',         # Llama 3.2 3B - preferred for answer generation
            'llama3.2:1b',         # Llama 3.2 1B - fallback
            'llama3.2',            # Any Llama 3.2 variant
        ]
        
        answer_model = None
        for preferred in model_priority:
            answer_model = next((m for m in available_models if preferred in m.lower()), None)
            if answer_model:
                print(f"✅ Found model: {answer_model} (matched pattern: {preferred})")
                break
        
        if not answer_model and available_models:
            # Check if any available model is llama3.2
            llama_model = next((m for m in available_models if 'llama3.2' in m.lower()), None)
            if llama_model:
                answer_model = llama_model
                print(f"⚠️ Using available Llama3.2 model: {answer_model}")
            else:
                answer_model = available_models[0]
                print(f"⚠️ Warning: No Llama3.2 found for answer generation. Using: {answer_model}")
                print(f"💡 Please install: ollama pull llama3.2:3b")
        elif not answer_model:
            answer_model = 'llama3.2:3b'  # Default to llama3.2:3b for answer generation
            print(f"⚠️ No models found, defaulting to: {answer_model}")
            print(f"💡 Please install: ollama pull llama3.2:3b")
        
        language_name = 'Tamil' if language.startswith('ta') else 'English'
        
        # Build context from keywords for LLM (but don't send to frontend)
        context_parts = []
        if keywords_dict:
            for key, value in keywords_dict.items():
                if value:
                    context_parts.append(f"{key}: {value}")
        context_str = "\n".join(context_parts) if context_parts else ""
        
        # Classify case type intelligently
        case_type = "Civil"
        text_lower = text_str.lower()

        # Try optional BiLSTM-GRU classifier first (if available)
        case_type_model_label = None
        case_type_model_score = None
        if _case_classifier_available:
            try:
                classifier = get_case_type_classifier()
                pred = classifier.predict(text_str)
                if pred:
                    case_type_model_label = pred.get("label")
                    case_type_model_score = pred.get("score")
            except Exception as e:
                print(f"⚠️ CaseTypeClassifier prediction error: {e}")
        
        # If the model is confident, we can use it as a strong hint,
        # but still let the heuristic logic refine if needed.
        if case_type_model_label and case_type_model_score and case_type_model_score >= 0.7:
            case_type = case_type_model_label

        # Check for specific acts mentioned - these are definitive
        has_ipc = 'ipc' in text_lower or 'indian penal code' in text_lower
        has_crpc = 'crpc' in text_lower or 'criminal procedure code' in text_lower
        has_cpc = 'cpc' in text_lower or 'civil procedure code' in text_lower
        
        # Check for specific IPC sections (these are always criminal)
        ipc_section_pattern = re.search(r'section\s+(\d+)\s*(?:of\s*)?(?:ipc|indian\s+penal\s+code)', text_lower)
        if ipc_section_pattern or has_ipc or has_crpc:
            case_type = "Criminal"
        elif has_cpc:
            case_type = "Civil"
        else:
            # Criminal indicators
            criminal_keywords = ['murder', 'death', 'assault', 'theft', 'robbery', 'rape', 'criminal', 
                                 'fir', 'police', 'arrest', 'bail', 'cognizable', 'non-bailable', 'forgery',
                                 'cheating', 'fraud', 'criminal breach']
            criminal_count = sum(1 for keyword in criminal_keywords if keyword in text_lower)
            
            # Civil indicators
            civil_keywords = ['land dispute', 'property dispute', 'encroachment', 'sale deed', 'patta', 
                             'civil', 'court case', 'suit', 'agreement', 'possession', 'survey number',
                             'developer', 'layout', 'housing', 'real estate', 'lease', 'rent', 'eviction']
            civil_count = sum(1 for keyword in civil_keywords if keyword in text_lower)
            
            # Threat/intimidation (can be both)
            threat_keywords = ['threat', 'intimidation', 'consequences', 'fear', 'warned']
            has_threats = any(keyword in text_lower for keyword in threat_keywords)
            
            # Determine case type
            if criminal_count > 2 and civil_count < 2:
                case_type = "Criminal"
            elif civil_count > 2 and criminal_count < 2:
                case_type = "Civil"
            elif (criminal_count > 0 and civil_count > 0) or (has_threats and civil_count > 0):
                case_type = "Civil and Criminal (Hybrid)"
            elif has_threats:
                case_type = "Criminal"
            else:
                case_type = "Civil"
        
        # Override if user explicitly mentions case type (but warn if contradictory)
        if 'civil case' in text_lower and case_type == "Criminal":
            print(f"⚠️ Warning: User mentioned 'civil case' but query suggests Criminal (IPC section mentioned)")
            # Keep as Criminal since IPC sections are always criminal
        
        # Build legal sections context for the prompt
        legal_sections_context = ""
        if legal_sections:
            legal_sections_context = "\n\n=== RELEVANT LEGAL SECTIONS AVAILABLE ===\n"
            for i, section in enumerate(legal_sections[:5], 1):
                section_num = section.get('section', 'N/A')
                title = section.get('title', 'N/A')
                act = section.get('act', 'N/A')
                description = section.get('description', 'N/A')
                punishment = section.get('punishment', '')
                bailable = section.get('bailable', '')
                cognizable = section.get('cognizable', '')
                
                legal_sections_context += f"\n[{i}] {section_num} - {title}\n"
                legal_sections_context += f"    Act: {act}\n"
                legal_sections_context += f"    Description: {description}\n"
                if punishment:
                    legal_sections_context += f"    Punishment: {punishment}\n"
                if bailable:
                    legal_sections_context += f"    Bailable: {bailable}\n"
                if cognizable:
                    legal_sections_context += f"    Cognizable: {cognizable}\n"
            legal_sections_context += "\n=== END OF LEGAL SECTIONS ===\n"
        
        # Enhanced prompt for detailed answer with structured format
        assistant_prompt = f"""You are an expert legal assistant specializing in Indian law. Provide comprehensive, detailed legal analysis. Answer in {language_name}.

User's Legal Query: {text_str}

{('Extracted Information:\n' + context_str + '\n') if context_str else ''}{legal_sections_context}

CRITICAL INSTRUCTIONS:
1. DO NOT include prefixes like "[User Query]:" or "[Legal Sections]:" in your response
2. DO NOT use formats like "Section 1: Title" or "Section 2: Land Registration"
3. DO NOT include instruction text like "[Continue with the next section...]" or any bracketed instructions in your final response
4. Provide ONLY the structured analysis below. Start directly with "**SUMMARY**"
5. Use the legal sections provided above. Identify ALL relevant IPC, CrPC, CPC, and other applicable sections
6. If the user asks a general question (like "under what sections can theft be complained" or "what activities are considered theft"), answer comprehensively:
   - Identify the relevant section(s) (e.g., Section 379 IPC for theft)
   - Explain what activities are considered under that section in detail
   - Provide comprehensive information about the section
   - Include related sections if applicable
   - Provide step-by-step guidance on how to file complaints
7. Do NOT repeat the same "Step X:" line or paragraph. Each step number must appear only once and with unique content.
8. Be comprehensive, detailed, and specific. Reference actual facts from the user's query
9. Follow the EXACT format below. Do not deviate.

REQUIRED FORMAT (Follow EXACTLY - Start your response with this):

**SUMMARY**

[Write a comprehensive, detailed summary (5-8 sentences) that covers:
- If it's a specific case/dispute: The complete nature of the case/dispute with all key facts, parties involved, evidence mentioned, legal issues, seriousness, what the user is seeking, threats/damages/violations
- If it's a general question (like "what sections apply to theft"): Explain what the user is asking about, why it's important, what legal provisions cover it, and provide context
Make it detailed and comprehensive, like a professional case brief or legal explanation. Include ALL relevant details from the user's query. Be thorough and specific.]

**SECTION 2: LEGAL SECTIONS (BEST SUITED + REASONING)**

[For EACH relevant legal section, use this EXACT format - NO bullet points, NO numbering, just the format below:]

Section [Number] [Act Abbreviation] – [Section Title/Name]

Reason: [Write 2-4 sentences explaining why this specific section applies. Reference specific facts from the user's query. Explain how their situation matches the elements of this section. Be detailed and specific. Connect the facts to the legal provision.]

[Continue listing ALL relevant sections in the same format above. Include 5-15 sections if multiple apply. Use sections from the provided list above, and add other relevant sections from Indian law (IPC, CrPC, CPC, Constitution, specific Acts) as needed. Also include any sections that will be mentioned in the detailed analysis below. Each section should be on its own with the format above.]

**SECTION 3: DETAILED ANALYSIS & STEP-BY-STEP GUIDANCE**

[Start with "Detailed analysis" and then provide content based on the query type:]

[IF THE USER ASKS ABOUT A SPECIFIC CASE/INCIDENT - Provide numbered steps:]

Step 1: [Action Title - Be Very Specific and Descriptive]

[Write a detailed paragraph (3-5 sentences) explaining:
- Exactly what to do
- Where to go (specific location, office, court name)
- What documents to take/prepare
- Who to contact (specific authority/officer designation)
- What to say/request
- Timeline/deadlines if applicable
- Fees if any
- Important warnings or notes
Be extremely specific with names, locations, procedures, and requirements. Make it actionable and practical.]

Step 2: [Action Title - Be Very Specific and Descriptive]

[Same detailed format as Step 1. Continue with comprehensive explanation.]

[Continue with 8-15 detailed steps covering ALL necessary actions from start to finish. Each step should be comprehensive and actionable. Cover: filing complaints, approaching authorities, legal procedures, evidence collection, court procedures, follow-ups, escalation if needed, etc.]

[IF THE USER ASKS A GENERAL QUESTION (like "under what sections can theft be complained" or "what activities are considered theft") - Provide detailed explanation:]

[Write a comprehensive explanation covering:
- The relevant section(s) that apply (e.g., Section 379 IPC for theft)
- What activities/acts are considered under that section (detailed explanation of what constitutes the offense)
- Essential elements required to prove the offense
- Punishment/penalties under the section
- Related sections that might also apply
- How to file a complaint under this section
- Step-by-step procedure for filing
- Documents required
- Where to file
- Important legal points and precedents if relevant
Be extremely detailed and educational. Make sure to answer the question completely and provide actionable information.]

IMPORTANT: 
- Start your response directly with "**SUMMARY**" - no prefixes, no introductions
- Do NOT use formats like "Section 1:", "Section 2:" etc.
- Use ONLY the format specified above
- Be comprehensive, detailed, and reference actual facts from the user's query
- Make every section thorough and actionable"""

        print(f"🤖 Using model: {answer_model} for answer generation")
        print(f"📝 Prompt length: {len(assistant_prompt)} characters")
        print(f"📋 Legal sections available: {len(legal_sections)}")
        if available_models:
            print(f"📊 Available models: {', '.join(available_models[:10])}")
            if len(available_models) > 10:
                print(f"   ... and {len(available_models) - 10} more")
        else:
            print(f"⚠️ No models found! Please install models with: ollama pull mistral or ollama pull llama3.2:3b")
        
        a_resp = llm_chat(
            model=answer_model, 
            messages=[{'role': 'user', 'content': assistant_prompt}], 
            options={'temperature': 0.2, 'num_predict': 3000}  # Lower temperature for consistency, higher tokens for completeness
        )
        
        # Clean up response - remove unwanted prefixes and instruction text
        if a_resp and not a_resp.startswith('LLM_ERROR:'):
            # Remove common unwanted prefixes
            unwanted_prefixes = [
                '[User Query]:',
                '[Legal Sections]:',
                'User Query:',
                'Legal Sections:',
                'Based on your query:',
                'Regarding your query:',
            ]
            for prefix in unwanted_prefixes:
                if a_resp.startswith(prefix):
                    a_resp = a_resp[len(prefix):].strip()
            
            # Remove patterns like "Section 1:", "Section 2:" etc. if they appear at the start
            a_resp = re.sub(r'^Section\s+\d+:\s*', '', a_resp, flags=re.MULTILINE)
            
            # Remove instruction text patterns like "[Continue with...]", "[List ALL...]", etc.
            instruction_patterns = [
                r'\[Continue with[^\]]+\]',
                r'\[List ALL[^\]]+\]',
                r'\[Continue listing[^\]]+\]',
                r'\[DO NOT include[^\]]+\]',
                r'\[Same detailed format[^\]]+\]',
                r'\[IF THE USER[^\]]+\]',
                r'\[Write a comprehensive[^\]]+\]',
                r'\[Start with[^\]]+\]',
                r'\[For EACH[^\]]+\]',
            ]
            for pattern in instruction_patterns:
                a_resp = re.sub(pattern, '', a_resp, flags=re.IGNORECASE | re.MULTILINE)
            
            # Deduplicate accidentally repeated step lines like
            # "Step 1: ... Step 1: ..." that some models may produce.
            a_resp = re.sub(r'(Step\s+\d+:[^\n]+?)(?:\s*\1)+', r'\1', a_resp)
            
            # Clean up multiple newlines that might result from removals
            a_resp = re.sub(r'\n{3,}', '\n\n', a_resp)
        
        if a_resp.startswith('LLM_ERROR:'):
            print(f"❌ LLM Error: {a_resp}")
            
            # Check if it's a memory error
            is_memory_error = 'memory' in a_resp.lower() or 'system memory' in a_resp.lower()
            
            if is_memory_error:
                print(f"⚠️ Memory error detected with {answer_model}. Trying alternative Llama3.2 models...")
                # Try alternative Llama3.2 models
                alternative_models = ['llama3.2:1b', 'llama3.2:3b', 'llama3.2']
                for alt_model_pattern in alternative_models:
                    matching_models = [m for m in available_models if alt_model_pattern in m.lower() and m.lower() != answer_model.lower()]
                    if matching_models:
                        alt_model = matching_models[0]
                        print(f"🔄 Trying alternative model: {alt_model}...")
                        a_resp = llm_chat(
                            model=alt_model,
                            messages=[{'role': 'user', 'content': assistant_prompt}],
                            options={'temperature': 0.2, 'num_predict': 2000}
                        )
                        if not a_resp.startswith('LLM_ERROR:'):
                            # Clean unwanted prefixes
                            for prefix in ['[User Query]:', '[Legal Sections]:', 'User Query:', 'Legal Sections:']:
                                if a_resp.startswith(prefix):
                                    a_resp = a_resp[len(prefix):].strip()
                            a_resp = re.sub(r'^Section\s+\d+:\s*', '', a_resp, flags=re.MULTILINE)
                            answer = a_resp.strip()
                            print(f"✅ Successfully used {alt_model}")
                            break
            else:
                # For non-memory errors, try alternative Llama3.2 models
                alternative_models = ['llama3.2:3b', 'llama3.2:1b', 'llama3.2']
                for alt_model_pattern in alternative_models:
                    matching_models = [m for m in available_models if alt_model_pattern in m.lower() and m.lower() != answer_model.lower()]
                    if matching_models:
                        alt_model = matching_models[0]
                        print(f"🔄 Trying alternative Llama3.2 model: {alt_model}...")
                        a_resp = llm_chat(
                            model=alt_model,
                            messages=[{'role': 'user', 'content': assistant_prompt}],
                            options={'temperature': 0.2, 'num_predict': 3000}
                        )
                        if not a_resp.startswith('LLM_ERROR:'):
                            # Clean unwanted prefixes
                            for prefix in ['[User Query]:', '[Legal Sections]:', 'User Query:', 'Legal Sections:']:
                                if a_resp.startswith(prefix):
                                    a_resp = a_resp[len(prefix):].strip()
                            a_resp = re.sub(r'^Section\s+\d+:\s*', '', a_resp, flags=re.MULTILINE)
                            answer = a_resp.strip()
                            print(f"✅ Fallback to {alt_model} succeeded")
                            break
        else:
            answer = a_resp.strip()
            if answer:
                print(f"✅ Answer generated successfully (length: {len(answer)} chars)")
            else:
                print(f"⚠️ Answer is empty after stripping")
    except Exception as e:
        print(f"❌ Answer generation error: {e}")
        import traceback
        traceback.print_exc()
    
    if not answer:
        # Provide more helpful error message
        error_details = ""
        if available_models:
            error_details = f"\n\nAvailable models: {', '.join(available_models[:5])}"
            if len(available_models) > 5:
                error_details += f" and {len(available_models) - 5} more..."
        
        answer = f"""I apologize, but I encountered an error generating the detailed answer. This may be due to insufficient system memory.{error_details}

**However, I can still help you with:**
• The legal sections identified above
• General legal guidance based on your query
• Step-by-step procedures for your case

Please try:
1. Restarting the application to free up memory
2. Using a smaller model if available
3. Rephrasing your question in a shorter format

The legal sections and summary above are still available and accurate."""
    
    response = {
        "answer": answer,
        "legal_sections": legal_sections[:5],
        "success": True,
        "query_type": "general_question" if is_question else "incident_report"
    }
    
    # Add summary for incident reports (but NOT keywords - they're only in backend logs)
    if not is_question:
        if summary:
            response["summary"] = summary
        # Keywords are logged in backend but NOT sent to frontend
        response["structured_data"] = structure_entities(text_str)  # Legacy format for compatibility
    
    return response

@app.get("/")
def read_root():
    return {"message": "Legal AI Assistant API", "status": "healthy", "version": "6.0"}

@app.get("/health")
def health_check():
    try:
        available_models = []
        try:
            if ollama_client:
                available_models = [getattr(m, 'model', 'unknown') for m in ollama_client.list().models]
            else:
                available_models = [m.get('name', 'unknown') for m in ollama.list().get('models', [])]
        except:
            pass
        return {"status": "healthy", "available_models": available_models}
    except Exception as e:
        return {"status": "healthy", "error": str(e)}

@app.post("/api/chat/structured")
async def api_chat_structured(request: dict):
    return await api_chat_complete(request)

@app.post("/api/chat")
async def api_chat(request: dict):
    return await api_chat_complete(request)

@app.get("/api/law-library/categories")
async def get_law_categories():
    try:
        if not _kb_available:
            return {"success": False, "error": "Library not available"}
        
        kb = get_knowledge_base()
        categories = []
        for cat_id, cat_name, file_name in [
            ('ipc', 'Indian Penal Code', 'legal_sections_ipc'),
            ('crpc', 'Criminal Procedure Code', 'legal_sections_crpc'),
            ('cpc', 'Civil Procedure Code', 'legal_sections_cpc')
        ]:
            count = len(kb.dataframes.get(file_name, [])) if file_name in kb.dataframes else 0
            categories.append({'id': cat_id, 'name': cat_name, 'count': count, 'icon': 'gavel' if cat_id == 'ipc' else 'balance-scale' if cat_id == 'crpc' else 'file-alt'})
        
        return {"success": True, "categories": categories}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/sections/{category_id}")
async def get_category_sections(category_id: str, page: int = 1, page_size: int = 50):
    try:
        if not _kb_available:
            return {"success": False, "error": "Library not available"}
        
        kb = get_knowledge_base()
        file_map = {'ipc': 'legal_sections_ipc', 'crpc': 'legal_sections_crpc', 'cpc': 'legal_sections_cpc'}
        
        if category_id not in file_map:
            return {"success": False, "error": "Category not found"}
        
        df_name = file_map[category_id]
        if df_name not in kb.dataframes:
            return {"success": False, "error": "Data not loaded"}
        
        df = kb.dataframes[df_name]
        total = len(df)
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total)
        
        sections = df.iloc[start_idx:end_idx].to_dict('records')
        for section in sections:
            section.pop('_search_text', None)
            section.pop('_section_key', None)
            section['category'] = category_id
        
        return {
            "success": True,
            "category": category_id,
            "total": total,
            "page": page,
            "page_size": page_size,
            "sections": sections,
            "has_more": end_idx < total
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/search")
async def search_law_sections(query: str, category: Optional[str] = None, limit: int = 20):
    try:
        if not _kb_available:
            return {"success": False, "error": "Library not available"}
        
        if not query or len(query.strip()) < 2:
            return {"success": False, "error": "Query too short"}
        
        kb = get_knowledge_base()
        results = kb.search_by_keyword(query, limit=limit)
        
        formatted_results = []
        for result in results:
            data = result.get('data', {})
            data.pop('_search_text', None)
            data.pop('_section_key', None)
            data['category'] = result.get('source', '').replace('legal_sections_', '')
            formatted_results.append(data)
        
        return {
            "success": True,
            "query": query,
            "total_results": len(formatted_results),
            "results": formatted_results
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/section/{section_number}")
async def get_section_by_number(section_number: str):
    try:
        if not _kb_available:
            return {"success": False, "error": "Library not available"}
        
        kb = get_knowledge_base()
        result = kb.search_by_section_number(section_number)
        
        if not result:
            return {"success": False, "error": "Section not found"}
        
        data = result.get('data', {})
        data.pop('_search_text', None)
        data.pop('_section_key', None)
        data['category'] = result.get('source', '').replace('legal_sections_', '')
        
        return {"success": True, "section": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/upload/document")
async def upload_document(file: UploadFile = File(...), language: str = 'en'):
    """
    Upload and process legal documents (PDF, DOCX, TXT)
    Extracts text and processes it for legal analysis
    """
    try:
        # Check file type
        allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return {"success": False, "error": f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"}
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        text_content = ""
        if file_ext == '.txt':
            text_content = content.decode('utf-8', errors='ignore')
        elif file_ext == '.pdf':
            try:
                import PyPDF2
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                text_content = "\n".join([page.extract_text() for page in pdf_reader.pages])
            except ImportError:
                return {"success": False, "error": "PDF processing requires PyPDF2. Install with: pip install PyPDF2"}
            except Exception as e:
                return {"success": False, "error": f"PDF extraction error: {str(e)}"}
        elif file_ext in ['.docx', '.doc']:
            try:
                from docx import Document
                doc = Document(io.BytesIO(content))
                text_content = "\n".join([para.text for para in doc.paragraphs])
            except ImportError:
                return {"success": False, "error": "DOCX processing requires python-docx. Install with: pip install python-docx"}
            except Exception as e:
                return {"success": False, "error": f"DOCX extraction error: {str(e)}"}
        
        if not text_content or len(text_content.strip()) < 10:
            return {"success": False, "error": "Could not extract meaningful text from document"}
        
        # Process the extracted text
        summary = generate_summary_with_mistral(text_content, language)
        keywords_dict = extract_keywords_with_mistral(text_content, language)
        
        # Log keywords to backend
        if keywords_dict:
            print("\n" + "="*60)
            print("📋 EXTRACTED KEYWORDS FROM DOCUMENT (Backend Log):")
            print("="*60)
            for key, value in keywords_dict.items():
                if value:
                    print(f"  {key}: {value}")
            print("="*60 + "\n")
        
        return {
            "success": True,
            "filename": file.filename,
            "text_content": text_content,
            "summary": summary,
            "message": "Document processed successfully"
        }
    
    except Exception as e:
        return {"success": False, "error": f"Document processing error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("🚀 Legal AI Assistant API v6.0")
    print("="*60)
    print("📍 Server: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
