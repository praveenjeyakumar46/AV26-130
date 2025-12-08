"""
Enhanced Legal Section Matcher - OPTIMIZED VERSION
Intelligently matches queries with relevant legal sections from IPC, CPC, and CrPC
Uses improved caching and indexing for faster performance
"""

from typing import List, Dict, Any, Optional
from csv_knowledge_base_optimized import get_knowledge_base
from functools import lru_cache
import re

class LegalSectionMatcherOptimized:
    def __init__(self):
        self.kb = get_knowledge_base()
        
        # Pre-compile regex patterns for better performance
        self.section_pattern = re.compile(r'(?:section|sec\.?|s\.)\s*(\d+[a-z]?\d?)', re.IGNORECASE)
        
        # Optimized topic mappings with most common sections first
        self.topic_mappings = {
            'workplace harassment': ['354A', '354B', '354C', '354D', '509'],
            'sexual harassment': ['354A', '354B', '354C', '376'],
            'harassment': ['354A', '354D', '509', '506'],
            'stalking': ['354D'],
            'voyeurism': ['354C'],
            'modesty': ['354', '509'],
            'rape': ['376', '376A', '376B', '376C', '376D'],
            'murder': ['302', '304', '307'],
            'death': ['302', '304', '304B'],
            'dowry': ['498A', '304B', '406'],
            'domestic violence': ['498A', '304B', '323', '506'],
            'theft': ['379', '380'],
            'cheating': ['420'],
            'fraud': ['420', '406'],
            'assault': ['323', '324', '354'],
            'hurt': ['323', '324', '325', '326'],
            'criminal intimidation': ['506'],
            'insult': ['504', '509'],
            'defamation': ['499', '500'],
            'forgery': ['467', '471'],
            'wrongful confinement': ['342', '343'],
            'wrongful restraint': ['341'],
            'criminal conspiracy': ['120B'],
            
            # CrPC related
            'fir': ['154', '156', '157'],
            'police': ['154', '156', '161', '167'],
            'arrest': ['167', '438', '439'],
            'bail': ['438', '439', '437', '389'],
            'anticipatory bail': ['438'],
            'investigation': ['156', '161', '173'],
            'charge sheet': ['173'],
            'cognizance': ['190', '204'],
            'trial': ['228', '244', '245', '313'],
            'appeal': ['389', '397', '399'],
            'revision': ['397', '401'],
            'compensation': ['357'],
            
            # CPC related
            'civil suit': ['9', '26'],
            'plaint': [],  # Will use Order 7
            'summons': [],  # Will use Order 5
            'written statement': [],  # Will use Order 8
            'injunction': [],  # Will use Order 39
            'temporary injunction': [],
            'execution': [],  # Will use Order 21
            'appeal civil': ['96', '100', '107'],
            'second appeal': ['100'],
            'res judicata': ['11'],
            'limitation': ['3', '5']
        }
        
        # Cache for section lookups
        self._section_cache = {}
    
    @lru_cache(maxsize=50)
    def _get_section_fast(self, section_number: str) -> Optional[Dict[str, Any]]:
        """Cached fast section lookup"""
        # Try direct section number lookup first (fastest)
        result = self.kb.search_by_section_number(section_number)
        if result:
            return self._format_section(result.get('data', {}))
        return None
    
    def get_relevant_sections(self, query: str, keywords: List[Dict[str, str]] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        OPTIMIZED: Get relevant legal sections based on query and extracted keywords
        Returns list of section dictionaries with full details
        """
        query_lower = query.lower()
        relevant_sections = []
        seen_sections = set()
        
        # 1. Direct section number extraction (FASTEST)
        section_matches = self.section_pattern.findall(query_lower)
        
        for section_num in section_matches:
            section_num_clean = section_num.upper()
            if section_num_clean not in seen_sections:
                section_dict = self._get_section_fast(section_num_clean)
                if section_dict:
                    relevant_sections.append(section_dict)
                    seen_sections.add(section_num_clean)
        
        # 2. Topic-based matching (FAST - uses pre-defined mappings)
        for topic, sections in self.topic_mappings.items():
            if topic in query_lower:
                for section_num in sections[:2]:  # Limit to top 2 per topic
                    if section_num not in seen_sections:
                        section_dict = self._get_section_fast(section_num)
                        if section_dict:
                            relevant_sections.append(section_dict)
                            seen_sections.add(section_num)
                            
                            if len(relevant_sections) >= limit:
                                return relevant_sections
        
        # 3. Keyword-based extraction from keywords list
        if keywords:
            incident_type = None
            for kw in keywords:
                if kw.get('label') == 'Incident type':
                    incident_type = kw.get('value', '').lower()
                    break
            
            if incident_type:
                for topic, sections in self.topic_mappings.items():
                    if topic in incident_type or incident_type in topic:
                        for section_num in sections[:2]:  # Limit to top 2
                            if section_num not in seen_sections:
                                section_dict = self._get_section_fast(section_num)
                                if section_dict:
                                    relevant_sections.append(section_dict)
                                    seen_sections.add(section_num)
                                    
                                    if len(relevant_sections) >= limit:
                                        return relevant_sections
        
        # 4. Fallback: Search in knowledge base (semantic first, then keyword)
        if len(relevant_sections) < 3:
            # Try semantic search to capture conceptually similar sections
            try:
                search_results = self.kb.search_semantic(query, limit=10)
            except Exception as e:
                print(f"⚠️ Semantic search in matcher failed, falling back to keyword search: {e}")
                search_results = self.kb.search_by_keyword(query, limit=10)

            for result in search_results:
                source = result.get('source', '')
                # Only use legal section files
                if source in ['legal_sections_ipc', 'legal_sections_cpc', 'legal_sections_crpc', 'legal_sections_comprehensive']:
                    section_data = result.get('data', {})
                    section_name = section_data.get('Section', '')
                    
                    # Extract section number
                    section_num_match = re.search(r'(\d+[A-Za-z]?)', section_name)
                    if section_num_match:
                        section_num = section_num_match.group(1)
                        if section_num not in seen_sections:
                            section_dict = self._format_section(section_data)
                            if section_dict:
                                relevant_sections.append(section_dict)
                                seen_sections.add(section_num)
                                
                                if len(relevant_sections) >= limit:
                                    break
        
        return relevant_sections[:limit]
    
    def _format_section(self, section_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format section data into standard dictionary"""
        if not section_data.get('Section'):
            return None
        
        return {
            'section': section_data.get('Section', ''),
            'title': section_data.get('Title', 'N/A'),
            'description': section_data.get('Description', 'N/A'),
            'punishment': section_data.get('Punishment', 'N/A'),
            'act': section_data.get('Act', 'Indian Penal Code'),
            'bailable': section_data.get('Bailable', 'N/A'),
            'cognizable': section_data.get('Cognizable', 'N/A'),
            'category': section_data.get('Category', 'General')
        }
    
    def get_sections_by_category(self, category: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get all sections in a specific category"""
        results = self.kb.search_by_keyword(category, limit=limit)
        sections = []
        seen = set()
        
        for result in results:
            section_data = result.get('data', {})
            section_name = section_data.get('Section', '')
            if section_name and section_name not in seen:
                section_dict = self._format_section(section_data)
                if section_dict and section_dict.get('category', '').lower() == category.lower():
                    sections.append(section_dict)
                    seen.add(section_name)
        
        return sections


# Global singleton
_section_matcher_optimized = None

def get_section_matcher_optimized() -> LegalSectionMatcherOptimized:
    """Get or create singleton instance of optimized matcher"""
    global _section_matcher_optimized
    if _section_matcher_optimized is None:
        _section_matcher_optimized = LegalSectionMatcherOptimized()
    return _section_matcher_optimized


# Backward compatibility
def get_section_matcher() -> LegalSectionMatcherOptimized:
    """Backward compatible function - returns optimized version"""
    return get_section_matcher_optimized()
