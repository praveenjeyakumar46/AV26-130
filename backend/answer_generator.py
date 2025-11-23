"""
Legal Answer Generator using Llama 3.2
Generates comprehensive, user-friendly answers
"""

import ollama
from typing import Dict, Any, List

class LegalAnswerGenerator:
    def __init__(self, model_name='llama3.2:3b'):
        self.model_name = model_name
        
        # Legal knowledge base templates
        self.templates = {
            'fir': """
Filing an FIR (First Information Report):
1. Visit the nearest police station
2. Provide written/oral complaint details
3. Police must register FIR (Section 154 CrPC)
4. Get a copy of the FIR
5. Note the FIR number for tracking
            """,
            'consumer_complaint': """
Consumer Complaint Process:
1. Send legal notice to seller/service provider
2. If unresolved, file complaint with Consumer Forum
3. District Forum: complaints up to ₹1 crore
4. State Commission: ₹1 crore to ₹10 crore
5. National Commission: above ₹10 crore
            """,
            'workplace_harassment': """
Workplace Harassment Action:
1. Document all incidents with dates/times
2. Report to Internal Complaints Committee (ICC)
3. ICC must complete inquiry within 90 days
4. Legal provisions: Sexual Harassment Act 2013
5. Can approach police if criminal offense
            """
        }
    
    def generate_answer(self, query: str, structured_data: Dict, context: str = "") -> str:
        """
        Generate comprehensive legal answer
        """
        try:
            # Build context from structured data
            data_context = self._build_context_from_data(structured_data)
            
            prompt = f"""You are a legal assistant helping common people understand Indian law. 
Provide a clear, actionable answer in simple language.

User Query: {query}

Extracted Information:
{data_context}

{context}

Provide:
1. Direct answer to the question
2. Step-by-step guidance if applicable
3. Relevant legal sections/acts
4. What documents are needed
5. Where to go for help

Answer in clear, simple language:"""

            response = ollama.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
                options={
                    'temperature': 0.7,
                    'num_predict': 800,
                    'top_p': 0.9
                }
            )
            
            return response['message']['content'].strip()
        
        except Exception as e:
            return f"I apologize, but I encountered an error generating the answer: {str(e)}"
    
    def _build_context_from_data(self, structured_data: Dict) -> str:
        """Build readable context from structured data"""
        context_parts = []
        
        if structured_data.get('dates_and_times'):
            dates = structured_data['dates_and_times']
            context_parts.append(f"Incident occurred on: {dates[0].get('combined', 'Date available')}")
        
        if structured_data.get('monetary_amounts'):
            amounts = structured_data['monetary_amounts']
            context_parts.append(f"Amount involved: {amounts[0]['formatted']}")
        
        if structured_data.get('persons_involved'):
            context_parts.append(f"Persons involved: {', '.join(structured_data['persons_involved'][:3])}")
        
        if structured_data.get('locations'):
            context_parts.append(f"Location: {structured_data['locations'][0]}")
        
        if structured_data.get('legal_terms'):
            context_parts.append(f"Related to: {', '.join(structured_data['legal_terms'][:5])}")
        
        return '\n'.join(context_parts) if context_parts else "No additional context extracted."
    
    def generate_bilingual_answer(self, query: str, structured_data: Dict, language: str = 'en') -> str:
        """
        Generate answer in specified language
        """
        answer_en = self.generate_answer(query, structured_data)
        
        if language == 'ta':
            # Translate to Tamil
            try:
                translate_prompt = f"""Translate this legal answer to Tamil language. Keep technical legal terms in English if needed for clarity.

English Answer:
{answer_en}

Tamil Translation:"""
                
                response = ollama.chat(
                    model=self.model_name,
                    messages=[{'role': 'user', 'content': translate_prompt}],
                    options={'temperature': 0.5, 'num_predict': 800}
                )
                
                return response['message']['content'].strip()
            except:
                return answer_en + "\n\n(Tamil translation unavailable)"
        
        return answer_en

# Singleton
_generator_instance = None

def get_answer_generator():
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = LegalAnswerGenerator()
    return _generator_instance