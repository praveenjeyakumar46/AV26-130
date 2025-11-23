"""
Enhanced Legal Section Matcher
Intelligently matches queries with relevant legal sections from IPC, CPC, and CrPC
"""

from typing import List, Dict, Any, Optional
from csv_knowledge_base_optimized import get_knowledge_base
from functools import lru_cache
import re

class LegalSectionMatcher:
    def __init__(self):
        self.kb = get_knowledge_base()
        # Pre-compile regex for better performance
        self.section_pattern = re.compile(r'(?:section|sec\.?|s\.)\s*(\d+[a-z]?\d?)', re.IGNORECASE)
        
        # Topic to section mapping for quick lookups
        self.topic_mappings = {
            'workplace harassment': ['Section 354A', 'Section 354B', 'Section 354C', 'Section 354D', 'Section 509'],
            'sexual harassment': ['Section 354A', 'Section 354B', 'Section 354C', 'Section 376'],
            'harassment': ['Section 354A', 'Section 354D', 'Section 509', 'Section 506'],
            'stalking': ['Section 354D'],
            'voyeurism': ['Section 354C'],
            'modesty': ['Section 354', 'Section 509'],
            'rape': ['Section 376', 'Section 376A', 'Section 376B', 'Section 376C', 'Section 376D'],
            'murder': ['Section 302', 'Section 304', 'Section 307'],
            'death': ['Section 302', 'Section 304', 'Section 304B'],
            'dowry': ['Section 498A', 'Section 304B', 'Section 406'],
            'domestic violence': ['Section 498A', 'Section 304B', 'Section 323', 'Section 506'],
            'theft': ['Section 379', 'Section 380'],
            'cheating': ['Section 420'],
            'fraud': ['Section 420', 'Section 406'],
            'assault': ['Section 323', 'Section 324', 'Section 354'],
            'hurt': ['Section 323', 'Section 324', 'Section 325', 'Section 326'],
            'criminal intimidation': ['Section 506'],
            'insult': ['Section 504', 'Section 509'],
            'defamation': ['Section 499', 'Section 500'],
            'forgery': ['Section 467', 'Section 471'],
            'wrongful confinement': ['Section 342', 'Section 343'],
            'wrongful restraint': ['Section 341'],
            'criminal conspiracy': ['Section 120B'],
            
            # CrPC related
            'fir': ['Section 154', 'Section 156', 'Section 157'],
            'police': ['Section 154', 'Section 156', 'Section 161', 'Section 167'],
            'arrest': ['Section 167', 'Section 438', 'Section 439'],
            'bail': ['Section 438', 'Section 439', 'Section 437', 'Section 389'],
            'anticipatory bail': ['Section 438'],
            'investigation': ['Section 156', 'Section 161', 'Section 173'],
            'charge sheet': ['Section 173'],
            'cognizance': ['Section 190', 'Section 204'],
            'trial': ['Section 228', 'Section 244', 'Section 245', 'Section 313'],
            'appeal': ['Section 389', 'Section 397', 'Section 399'],
            'revision': ['Section 397', 'Section 401'],
            'compensation': ['Section 357'],
            
            # CPC related
            'civil suit': ['Section 9', 'Section 26', 'Order 7'],
            'plaint': ['Order 7'],
            'summons': ['Order 5', 'Section 27'],
            'written statement': ['Order 8'],
            'injunction': ['Order 39'],
            'temporary injunction': ['Order 39'],
            'execution': ['Order 21'],
            'appeal civil': ['Section 96', 'Section 100', 'Section 107'],
            'second appeal': ['Section 100'],
            'res judicata': ['Section 11'],
            'limitation': ['Section 3', 'Section 5']
        }
        
        # Category keywords
        self.category_keywords = {
            'Workplace Harassment': ['workplace', 'office', 'harassment', 'sexual harassment', 'posh act'],
            'Sexual Offenses': ['rape', 'sexual assault', 'molestation'],
            'Violence': ['assault', 'hurt', 'violence', 'attack', 'beating'],
            'Property Offenses': ['theft', 'robbery', 'burglary', 'cheating', 'fraud'],
            'Domestic Violence': ['domestic', 'dowry', 'cruelty', 'husband', 'wife'],
            'Criminal Offenses': ['murder', 'death', 'homicide'],
            'FIR and Investigation': ['fir', 'police', 'investigation', 'complaint'],
            'Bail': ['bail', 'anticipatory', 'arrest'],
            'Civil Procedure': ['civil', 'suit', 'plaint', 'appeal']
        }
        
        # Cache for section lookups
        self._section_cache = {}
    
    @lru_cache(maxsize=50)
    def _get_section_fast(self, section_number: str) -> Optional[Dict[str, Any]]:
        """Cached fast section lookup using optimized KB method"""
        result = self.kb.search_by_section_number(section_number)
        if result:
            return self._format_section(result.get('data', {}))
        return None
    
    def get_relevant_sections(self, query: str, keywords: List[Dict[str, str]] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get relevant legal sections based on query and extracted keywords
        Returns list of section dictionaries with full details
        """
        query_lower = query.lower()
        relevant_sections = []
        seen_sections = set()
        
        # 1. Direct section number extraction (FASTEST - uses pre-compiled regex)
        section_matches = self.section_pattern.findall(query_lower)
        
        for section_num in section_matches:
            section_num_clean = section_num.upper()
            if section_num_clean not in seen_sections:
                section_dict = self._get_section_fast(section_num_clean)
                if section_dict:
                    relevant_sections.append(section_dict)
                    seen_sections.add(section_dict.get('section'))
        
        # 2. Topic-based matching (FAST - uses pre-defined mappings and fast lookup)
        for topic, sections in self.topic_mappings.items():
            if topic in query_lower:
                for section_name in sections[:2]:  # Limit to top 2 per topic for speed
                    # Extract just the number from "Section 302" format
                    section_num = section_name.replace('Section ', '')
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
                        for section_name in sections[:2]:  # Limit to top 2 for speed
                            section_num = section_name.replace('Section ', '')
                            if section_num not in seen_sections:
                                section_dict = self._get_section_fast(section_num)
                                if section_dict:
                                    relevant_sections.append(section_dict)
                                    seen_sections.add(section_num)
                                    
                                    if len(relevant_sections) >= limit:
                                        return relevant_sections
        
        # 4. Fallback: Search in knowledge base
        if len(relevant_sections) < 3:
            search_results = self.kb.search_by_keyword(query, limit=10)
            for result in search_results:
                source = result.get('source', '')
                if source in ['legal_sections_ipc', 'legal_sections_cpc', 'legal_sections_crpc', 'legal_sections_comprehensive']:
                    section_data = result.get('data', {})
                    section_name = section_data.get('Section')
                    if section_name and section_name not in seen_sections:
                        section_dict = self._format_section(section_data)
                        if section_dict:
                            relevant_sections.append(section_dict)
                            seen_sections.add(section_name)
        
        # Sort by relevance (sections directly mentioned first, then by category)
        return relevant_sections[:limit]
    
    def _format_section(self, section_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format section data into standard dictionary"""
        if not section_data.get('Section'):
            return None
        
        return {
            'section': section_data.get('Section'),
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
            section_name = section_data.get('Section')
            if section_name and section_name not in seen:
                section_dict = self._format_section(section_data)
                if section_dict and section_dict.get('category', '').lower() == category.lower():
                    sections.append(section_dict)
                    seen.add(section_name)
        
        return sections


# Global singleton
_section_matcher = None

def get_section_matcher() -> LegalSectionMatcher:
    """Get or create singleton instance"""
    global _section_matcher
    if _section_matcher is None:
        _section_matcher = LegalSectionMatcher()
    return _section_matcher
