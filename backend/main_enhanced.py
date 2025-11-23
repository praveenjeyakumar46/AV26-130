"""
Enhanced Main.py - with improved legal section extraction
Replace your current main.py with this file
"""
# Add this import at the top of main.py after other imports
try:
    from legal_section_matcher import get_section_matcher
    _matcher_available = True
except Exception as e:
    print(f"⚠️ Warning: Could not import legal_section_matcher: {e}")
    _matcher_available = False
    def get_section_matcher():
        raise Exception("Legal section matcher not available")


# Replace the section in api_chat_complete that extracts legal sections (around line 350)
# Replace this block:
"""
    # 4. Extract and add relevant legal sections
    legal_sections = []
    try:
        if _kb_available:
            kb = get_knowledge_base()
            # Search for relevant legal sections based on extracted keywords and content
            search_terms = ' '.join([kw.get('value', '') for kw in keywords_labeled[:5]]) + ' ' + text[:200]
            section_results = kb.search_by_keyword(search_terms, limit=5)
            
            for result in section_results:
                if result['source'] == 'legal_sections_ipc':
                    section_data = result.get('data', {})
                    if 'Section' in section_data:
                        legal_sections.append({
                            'section': section_data.get('Section'),
                            'title': section_data.get('Title'),
                            'description': section_data.get('Description'),
                            'punishment': section_data.get('Punishment'),
                            'act': section_data.get('Act'),
                            'bailable': section_data.get('Bailable'),
                            'cognizable': section_data.get('Cognizable')
                        })
    except Exception as e:
        print(f"Error fetching legal sections: {e}")
"""

# WITH THIS NEW BLOCK:
"""
    # 4. Extract and add relevant legal sections using enhanced matcher
    legal_sections = []
    try:
        if _matcher_available:
            matcher = get_section_matcher()
            # Get relevant sections based on query and keywords
            legal_sections = matcher.get_relevant_sections(
                query=text,
                keywords=keywords_labeled,
                limit=5
            )
    except Exception as e:
        print(f"Error fetching legal sections: {e}")
        # Fallback to old method
        try:
            if _kb_available:
                kb = get_knowledge_base()
                search_terms = ' '.join([kw.get('value', '') for kw in keywords_labeled[:5]]) + ' ' + text[:200]
                section_results = kb.search_by_keyword(search_terms, limit=5)
                
                for result in section_results:
                    source = result.get('source', '')
                    if source in ['legal_sections_ipc', 'legal_sections_cpc', 'legal_sections_crpc', 'legal_sections_comprehensive']:
                        section_data = result.get('data', {})
                        if 'Section' in section_data:
                            legal_sections.append({
                                'section': section_data.get('Section'),
                                'title': section_data.get('Title'),
                                'description': section_data.get('Description'),
                                'punishment': section_data.get('Punishment', 'N/A'),
                                'act': section_data.get('Act'),
                                'bailable': section_data.get('Bailable', 'N/A'),
                                'cognizable': section_data.get('Cognizable', 'N/A'),
                                'category': section_data.get('Category', 'General')
                            })
        except Exception as fallback_error:
            print(f"Fallback error: {fallback_error}")
"""
