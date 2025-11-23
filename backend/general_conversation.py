import re
from typing import Optional, Dict, Any

def handle_general_conversation(text: str) -> Optional[Dict[str, Any]]:
    """
    Handle general conversation intents like greetings, capabilities, etc.
    Returns a response dictionary if a match is found, or None.
    """
    text_lower = text.lower().strip()
    
    # Greetings
    greetings_patterns = [
        r'^\s*(?:hi|hello|hey|greetings|good\s*(?:morning|afternoon|evening))\s*$',
        r'^\s*(?:hi|hello|hey)\s+there\s*$'
    ]
    
    if any(re.match(p, text_lower) for p in greetings_patterns):
        return {
            "answer": "Hello! I am your Legal AI Assistant. I can help you understand Indian laws, analyze legal documents, and provide guidance on legal procedures. How can I assist you today?",
            "success": True,
            "query_type": "general_conversation"
        }
        
    # Capabilities / Help
    capabilities_patterns = [
        r'what\s+(?:can|do)\s+you\s+do',
        r'who\s+are\s+you',
        r'^\s*help\s*$',
        r'how\s+can\s+you\s+help'
    ]
    
    if any(re.search(p, text_lower) for p in capabilities_patterns):
        return {
            "answer": """I am a Legal AI Assistant designed to help you with Indian Law. Here is what I can do:

• **Analyze Incidents**: Describe a situation (e.g., "My neighbor is encroaching on my land"), and I will identify the relevant legal sections and suggest next steps.
• **Explain Laws**: Ask about specific laws or sections (e.g., "What is Section 302 IPC?").
• **Document Analysis**: Upload a legal document, and I can summarize it and extract key details.
• **Procedural Guidance**: I can guide you on processes like filing an FIR, consumer complaints, etc.

Please note that I provide legal information, not professional legal advice. For critical matters, please consult a qualified lawyer.""",
            "success": True,
            "query_type": "general_conversation"
        }
        
    # Gratitude
    gratitude_patterns = [
        r'thank\s*you',
        r'^\s*thanks\s*$'
    ]
    
    if any(re.search(p, text_lower) for p in gratitude_patterns):
        return {
            "answer": "You're welcome! If you have any more questions regarding legal matters, feel free to ask.",
            "success": True,
            "query_type": "general_conversation"
        }
        
    return None
