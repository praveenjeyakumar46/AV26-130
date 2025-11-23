"""
Law Library API
Comprehensive law sections database with search, filter, and categorization
"""

from typing import List, Dict, Any, Optional
from csv_knowledge_base_optimized import get_knowledge_base
import pandas as pd
from pathlib import Path
import re

class LawLibrary:
    def __init__(self):
        self.kb = get_knowledge_base()
        self.categories = {
            'ipc': {
                'name': 'Indian Penal Code',
                'icon': 'gavel',
                'file': 'legal_sections_ipc.csv',
                'description': 'Criminal law in India',
                'chapters': self._load_ipc_chapters()
            },
            'crpc': {
                'name': 'Criminal Procedure Code',
                'icon': 'balance-scale',
                'file': 'legal_sections_crpc.csv',
                'description': 'Procedure for administration of criminal law',
                'chapters': self._load_crpc_chapters()
            },
            'cpc': {
                'name': 'Civil Procedure Code',
                'icon': 'file-alt',
                'file': 'legal_sections_cpc.csv',
                'description': 'Procedure for civil courts',
                'chapters': self._load_cpc_chapters()
            },
            'comprehensive': {
                'name': 'Comprehensive Law Database',
                'icon': 'book-open',
                'file': 'legal_sections_comprehensive.csv',
                'description': 'Complete legal sections database',
                'chapters': []
            }
        }
    
    def _load_ipc_chapters(self) -> List[Dict[str, Any]]:
        """Load IPC chapters with section ranges"""
        return [
            {
                'title': 'Introduction',
                'range': 'Sections 1-52',
                'description': 'Preliminary and General Explanations',
                'popular': True
            },
            {
                'title': 'Of Punishments',
                'range': 'Sections 53-75',
                'description': 'Various forms of punishment'
            },
            {
                'title': 'Of Offences Against The State',
                'range': 'Sections 121-130',
                'description': 'Waging war, sedition, and related offenses'
            },
            {
                'title': 'Of Offences Against The Public Tranquility',
                'range': 'Sections 141-160',
                'description': 'Unlawful assembly, rioting, and affray'
            },
            {
                'title': 'Of Offences By Or Relating To Public Servants',
                'range': 'Sections 161-171',
                'description': 'Bribery and corruption'
            },
            {
                'title': 'Of Offences Relating To Elections',
                'range': 'Sections 171A-171I',
                'description': 'Electoral offenses'
            },
            {
                'title': 'Of Offences Against The Human Body',
                'range': 'Sections 299-377',
                'description': 'Murder, hurt, assault, and other offenses',
                'popular': True
            },
            {
                'title': 'Of Offences Against Property',
                'range': 'Sections 378-462',
                'description': 'Theft, robbery, cheating, and property crimes',
                'popular': True
            },
            {
                'title': 'Of Offences Relating To Documents',
                'range': 'Sections 463-489',
                'description': 'Forgery and counterfeiting'
            },
            {
                'title': 'Of Offences Relating To Marriage',
                'range': 'Sections 493-498',
                'description': 'Bigamy, cruelty, and related offenses'
            },
            {
                'title': 'Of Defamation',
                'range': 'Sections 499-502',
                'description': 'Defamation offenses'
            },
            {
                'title': 'Of Criminal Intimidation, Insult And Annoyance',
                'range': 'Sections 503-510',
                'description': 'Intimidation and insult offenses',
                'popular': True
            }
        ]
    
    def _load_crpc_chapters(self) -> List[Dict[str, Any]]:
        """Load CrPC chapters"""
        return [
            {
                'title': 'Constitution of Criminal Courts',
                'range': 'Sections 6-25',
                'description': 'Establishment and powers of courts'
            },
            {
                'title': 'Powers of Courts',
                'range': 'Sections 26-35',
                'description': 'Jurisdiction of criminal courts'
            },
            {
                'title': 'Information to Police and Their Powers',
                'range': 'Sections 36-76',
                'description': 'FIR, investigation, arrest procedures',
                'popular': True
            },
            {
                'title': 'Processes to Compel Appearance',
                'range': 'Sections 61-90',
                'description': 'Summons, warrants, and proclamation'
            },
            {
                'title': 'Bail and Bonds',
                'range': 'Sections 436-450',
                'description': 'Bail procedures and conditions',
                'popular': True
            },
            {
                'title': 'Trial Procedures',
                'range': 'Sections 225-265',
                'description': 'Trial of various offenses'
            },
            {
                'title': 'Appeals',
                'range': 'Sections 372-405',
                'description': 'Appeal procedures and provisions'
            },
            {
                'title': 'Execution of Sentences',
                'range': 'Sections 413-424',
                'description': 'Execution of orders and sentences'
            }
        ]
    
    def _load_cpc_chapters(self) -> List[Dict[str, Any]]:
        """Load CPC chapters"""
        return [
            {
                'title': 'Suits in General',
                'range': 'Sections 1-25',
                'description': 'Institution and jurisdiction of suits'
            },
            {
                'title': 'Summons',
                'range': 'Order V',
                'description': 'Issue and service of summons',
                'popular': True
            },
            {
                'title': 'Pleadings',
                'range': 'Orders VI-VIII',
                'description': 'Plaint, written statement, and set-off'
            },
            {
                'title': 'Discovery and Inspection',
                'range': 'Order XI',
                'description': 'Discovery of documents and interrogatories'
            },
            {
                'title': 'Judgment and Decree',
                'range': 'Sections 33-58',
                'description': 'Pronouncement and contents of judgment'
            },
            {
                'title': 'Temporary Injunctions',
                'range': 'Order XXXIX',
                'description': 'Injunction procedures',
                'popular': True
            },
            {
                'title': 'Appeals',
                'range': 'Sections 96-112',
                'description': 'Appeal from decrees and orders',
                'popular': True
            },
            {
                'title': 'Execution',
                'range': 'Sections 36-74, Order XXI',
                'description': 'Execution of decrees and orders'
            }
        ]
    
    def get_all_categories(self) -> List[Dict[str, Any]]:
        """Get list of all law categories"""
        categories = []
        for cat_id, cat_info in self.categories.items():
            # Count sections
            df_name = cat_info['file'].replace('.csv', '')
            count = 0
            if df_name in self.kb.dataframes:
                count = len(self.kb.dataframes[df_name])
            
            categories.append({
                'id': cat_id,
                'name': cat_info['name'],
                'icon': cat_info['icon'],
                'description': cat_info['description'],
                'count': count,
                'chapters': len(cat_info.get('chapters', []))
            })
        return categories
    
    def get_category_details(self, category_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a category"""
        if category_id not in self.categories:
            return None
        
        cat_info = self.categories[category_id]
        df_name = cat_info['file'].replace('.csv', '')
        
        sections = []
        if df_name in self.kb.dataframes:
            df = self.kb.dataframes[df_name]
            sections = df.to_dict('records')
        
        return {
            'id': category_id,
            'name': cat_info['name'],
            'description': cat_info['description'],
            'chapters': cat_info.get('chapters', []),
            'total_sections': len(sections),
            'icon': cat_info['icon']
        }
    
    def get_sections_by_category(self, category_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get all sections in a category with pagination"""
        if category_id not in self.categories:
            return {'error': 'Category not found'}
        
        cat_info = self.categories[category_id]
        df_name = cat_info['file'].replace('.csv', '')
        
        if df_name not in self.kb.dataframes:
            return {'error': 'Data not loaded'}
        
        df = self.kb.dataframes[df_name]
        total = len(df)
        
        # Apply pagination
        sections = df.iloc[offset:offset+limit].to_dict('records')
        
        return {
            'category': cat_info['name'],
            'total': total,
            'offset': offset,
            'limit': limit,
            'sections': sections,
            'has_more': (offset + limit) < total
        }
    
    def get_chapter_sections(self, category_id: str, chapter_range: str) -> Dict[str, Any]:
        """Get sections within a chapter range"""
        if category_id not in self.categories:
            return {'error': 'Category not found'}
        
        cat_info = self.categories[category_id]
        df_name = cat_info['file'].replace('.csv', '')
        
        if df_name not in self.kb.dataframes:
            return {'error': 'Data not loaded'}
        
        df = self.kb.dataframes[df_name]
        
        # Extract section numbers from range (e.g., "Sections 1-52")
        range_match = re.search(r'(\d+)-(\d+)', chapter_range)
        if range_match:
            start_num = int(range_match.group(1))
            end_num = int(range_match.group(2))
            
            # Filter sections within range
            filtered = []
            for _, row in df.iterrows():
                section = row.get('Section', '')
                section_num_match = re.search(r'(\d+)', section)
                if section_num_match:
                    section_num = int(section_num_match.group(1))
                    if start_num <= section_num <= end_num:
                        filtered.append(row.to_dict())
            
            return {
                'chapter_range': chapter_range,
                'total': len(filtered),
                'sections': filtered
            }
        
        return {'error': 'Invalid chapter range'}
    
    def search_sections(self, query: str, category_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Search sections across all or specific category"""
        results = []
        query_lower = query.lower()
        
        # Determine which categories to search
        categories_to_search = [category_id] if category_id else list(self.categories.keys())
        
        for cat_id in categories_to_search:
            if cat_id not in self.categories:
                continue
            
            cat_info = self.categories[cat_id]
            df_name = cat_info['file'].replace('.csv', '')
            
            if df_name not in self.kb.dataframes:
                continue
            
            df = self.kb.dataframes[df_name]
            
            # Search in all text columns
            for _, row in df.iterrows():
                match_score = 0
                matched_fields = []
                
                for col in df.columns:
                    if pd.notna(row[col]):
                        cell_value = str(row[col]).lower()
                        if query_lower in cell_value:
                            match_score += 1
                            matched_fields.append(col)
                
                if match_score > 0:
                    section_dict = row.to_dict()
                    section_dict['category'] = cat_info['name']
                    section_dict['category_id'] = cat_id
                    section_dict['match_score'] = match_score
                    section_dict['matched_fields'] = matched_fields
                    results.append(section_dict)
        
        # Sort by match score
        results.sort(key=lambda x: x['match_score'], reverse=True)
        
        return results[:limit]
    
    def get_section_by_number(self, section_number: str, category_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get specific section by number"""
        # Clean section number
        section_clean = section_number.strip().upper()
        if not section_clean.startswith('SECTION'):
            section_clean = f"SECTION {section_clean}"
        
        # Search in specific or all categories
        categories_to_search = [category_id] if category_id else list(self.categories.keys())
        
        for cat_id in categories_to_search:
            if cat_id not in self.categories:
                continue
            
            cat_info = self.categories[cat_id]
            df_name = cat_info['file'].replace('.csv', '')
            
            if df_name not in self.kb.dataframes:
                continue
            
            df = self.kb.dataframes[df_name]
            
            # Search for section
            for _, row in df.iterrows():
                if 'Section' in row:
                    row_section = str(row['Section']).strip().upper()
                    if section_clean in row_section or section_number.upper() in row_section:
                        result = row.to_dict()
                        result['category'] = cat_info['name']
                        result['category_id'] = cat_id
                        return result
        
        return None
    
    def get_popular_sections(self, category_id: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most commonly searched/important sections"""
        # These are pre-defined popular sections
        popular_section_numbers = [
            '302', '304', '376', '420', '498A', '354', '354A', '354D',  # IPC
            '154', '156', '161', '167', '438', '439',  # CrPC
            'Order 7', 'Order 39', 'Section 96'  # CPC
        ]
        
        results = []
        for section_num in popular_section_numbers:
            section = self.get_section_by_number(section_num, category_id)
            if section:
                section['popular'] = True
                results.append(section)
                if len(results) >= limit:
                    break
        
        return results
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get overall library statistics"""
        stats = {
            'total_categories': len(self.categories),
            'total_sections': 0,
            'categories': {}
        }
        
        for cat_id, cat_info in self.categories.items():
            df_name = cat_info['file'].replace('.csv', '')
            count = 0
            if df_name in self.kb.dataframes:
                count = len(self.kb.dataframes[df_name])
            
            stats['categories'][cat_id] = {
                'name': cat_info['name'],
                'count': count,
                'chapters': len(cat_info.get('chapters', []))
            }
            stats['total_sections'] += count
        
        return stats


# Global singleton
_law_library = None

def get_law_library() -> LawLibrary:
    """Get or create singleton instance"""
    global _law_library
    if _law_library is None:
        _law_library = LawLibrary()
    return _law_library
