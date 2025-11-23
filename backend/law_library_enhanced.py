"""
Enhanced Law Library with Performance Optimizations
Handles large IPC/CPC datasets efficiently with pagination and caching
"""

from typing import List, Dict, Any, Optional
from csv_knowledge_base_optimized import get_knowledge_base
import pandas as pd
from pathlib import Path
import re
from functools import lru_cache
import time

class EnhancedLawLibrary:
    def __init__(self):
        self.kb = get_knowledge_base()
        self._cache = {}
        self._last_cache_clear = time.time()
        
        self.categories = {
            'ipc': {
                'name': 'Indian Penal Code',
                'icon': 'gavel',
                'file': 'legal_sections_ipc.csv',
                'description': 'Criminal law in India - Comprehensive database',
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
            }
        }
    
    def _clear_old_cache(self):
        """Clear cache if it's older than 5 minutes"""
        current_time = time.time()
        if current_time - self._last_cache_clear > 300:  # 5 minutes
            self._cache.clear()
            self._last_cache_clear = current_time
    
    @lru_cache(maxsize=100)
    def _get_cached_sections(self, category_id: str, page: int, page_size: int) -> tuple:
        """Cache sections by page"""
        cache_key = f"{category_id}_{page}_{page_size}"
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        result = self._fetch_sections_page(category_id, page, page_size)
        self._cache[cache_key] = result
        return result
    
    def _fetch_sections_page(self, category_id: str, page: int, page_size: int) -> tuple:
        """Fetch a single page of sections efficiently"""
        if category_id not in self.categories:
            return ([], 0)
        
        cat_info = self.categories[category_id]
        df_name = cat_info['file'].replace('.csv', '')
        
        if df_name not in self.kb.dataframes:
            return ([], 0)
        
        df = self.kb.dataframes[df_name]
        total = len(df)
        
        # Calculate pagination
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total)
        
        # Get page of data
        sections = df.iloc[start_idx:end_idx].to_dict('records')
        
        return (sections, total)
    
    def _load_ipc_chapters(self) -> List[Dict[str, Any]]:
        """Load IPC chapters with section ranges"""
        return [
            {
                'title': 'Introduction',
                'range': 'Sections 1-52',
                'description': 'Preliminary and General Explanations',
                'sections_start': 1,
                'sections_end': 52,
                'popular': True
            },
            {
                'title': 'Of Punishments',
                'range': 'Sections 53-75',
                'description': 'Various forms of punishment',
                'sections_start': 53,
                'sections_end': 75
            },
            {
                'title': 'Of Offences Against The State',
                'range': 'Sections 121-130',
                'description': 'Waging war, sedition, and related offenses',
                'sections_start': 121,
                'sections_end': 130
            },
            {
                'title': 'Of Offences Against The Human Body',
                'range': 'Sections 299-377',
                'description': 'Murder, hurt, assault, and other offenses',
                'sections_start': 299,
                'sections_end': 377,
                'popular': True
            },
            {
                'title': 'Of Offences Against Property',
                'range': 'Sections 378-462',
                'description': 'Theft, robbery, cheating, and property crimes',
                'sections_start': 378,
                'sections_end': 462,
                'popular': True
            },
            {
                'title': 'Of Criminal Intimidation, Insult And Annoyance',
                'range': 'Sections 503-510',
                'description': 'Intimidation and insult offenses',
                'sections_start': 503,
                'sections_end': 510,
                'popular': True
            }
        ]
    
    def _load_crpc_chapters(self) -> List[Dict[str, Any]]:
        """Load CrPC chapters"""
        return [
            {
                'title': 'Information to Police and Their Powers',
                'range': 'Sections 36-76',
                'description': 'FIR, investigation, arrest procedures',
                'sections_start': 36,
                'sections_end': 76,
                'popular': True
            },
            {
                'title': 'Bail and Bonds',
                'range': 'Sections 436-450',
                'description': 'Bail procedures and conditions',
                'sections_start': 436,
                'sections_end': 450,
                'popular': True
            },
            {
                'title': 'Trial Procedures',
                'range': 'Sections 225-265',
                'description': 'Trial of various offenses',
                'sections_start': 225,
                'sections_end': 265
            }
        ]
    
    def _load_cpc_chapters(self) -> List[Dict[str, Any]]:
        """Load CPC chapters"""
        return [
            {
                'title': 'Summons',
                'range': 'Order V',
                'description': 'Issue and service of summons',
                'order': 5,
                'popular': True
            },
            {
                'title': 'Temporary Injunctions',
                'range': 'Order XXXIX',
                'description': 'Injunction procedures',
                'order': 39,
                'popular': True
            },
            {
                'title': 'Appeals',
                'range': 'Sections 96-112',
                'description': 'Appeal from decrees and orders',
                'sections_start': 96,
                'sections_end': 112,
                'popular': True
            }
        ]
    
    def get_all_categories(self) -> List[Dict[str, Any]]:
        """Get list of all law categories with counts"""
        categories = []
        for cat_id, cat_info in self.categories.items():
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
        
        total_sections = 0
        if df_name in self.kb.dataframes:
            total_sections = len(self.kb.dataframes[df_name])
        
        return {
            'id': category_id,
            'name': cat_info['name'],
            'description': cat_info['description'],
            'chapters': cat_info.get('chapters', []),
            'total_sections': total_sections,
            'icon': cat_info['icon']
        }
    
    def get_sections_paginated(self, category_id: str, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Get sections with efficient pagination"""
        self._clear_old_cache()
        
        if category_id not in self.categories:
            return {'error': 'Category not found', 'sections': [], 'total': 0}
        
        # Get cached page
        sections, total = self._get_cached_sections(category_id, page, page_size)
        
        total_pages = (total + page_size - 1) // page_size  # Ceiling division
        
        return {
            'category': self.categories[category_id]['name'],
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'sections': sections,
            'has_more': page < total_pages,
            'has_previous': page > 1
        }
    
    def get_chapter_sections(self, category_id: str, chapter_range: str) -> Dict[str, Any]:
        """Get sections within a chapter range efficiently"""
        if category_id not in self.categories:
            return {'error': 'Category not found'}
        
        cat_info = self.categories[category_id]
        df_name = cat_info['file'].replace('.csv', '')
        
        if df_name not in self.kb.dataframes:
            return {'error': 'Data not loaded'}
        
        df = self.kb.dataframes[df_name]
        
        # Find the chapter info
        chapter_info = None
        for chapter in cat_info.get('chapters', []):
            if chapter['range'] == chapter_range:
                chapter_info = chapter
                break
        
        if not chapter_info:
            return {'error': 'Chapter not found'}
        
        # Filter sections efficiently
        if 'sections_start' in chapter_info:
            start_num = chapter_info['sections_start']
            end_num = chapter_info['sections_end']
            
            # Use vectorized operations for filtering
            def extract_section_num(section_str):
                match = re.search(r'(\d+)', str(section_str))
                return int(match.group(1)) if match else 0
            
            df['_temp_num'] = df['Section'].apply(extract_section_num)
            filtered_df = df[(df['_temp_num'] >= start_num) & (df['_temp_num'] <= end_num)]
            sections = filtered_df.drop('_temp_num', axis=1).to_dict('records')
        else:
            # For CPC orders
            sections = []
        
        return {
            'chapter_range': chapter_range,
            'chapter_title': chapter_info.get('title', ''),
            'total': len(sections),
            'sections': sections
        }
    
    def search_sections_fast(self, query: str, category_id: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Fast search with pagination"""
        if not query or len(query.strip()) < 2:
            return {'error': 'Query too short', 'results': [], 'total': 0}
        
        query_lower = query.lower()
        all_results = []
        
        # Determine categories to search
        categories_to_search = [category_id] if category_id else list(self.categories.keys())
        
        for cat_id in categories_to_search:
            if cat_id not in self.categories:
                continue
            
            cat_info = self.categories[cat_id]
            df_name = cat_info['file'].replace('.csv', '')
            
            if df_name not in self.kb.dataframes:
                continue
            
            df = self.kb.dataframes[df_name]
            
            # Use vectorized search (much faster)
            mask = df['_search_text'].str.contains(query_lower, na=False, regex=False, case=False)
            matches = df[mask]
            
            for _, row in matches.iterrows():
                section_dict = row.to_dict()
                # Remove internal columns
                section_dict.pop('_search_text', None)
                section_dict.pop('_section_key', None)
                section_dict['category'] = cat_info['name']
                section_dict['category_id'] = cat_id
                all_results.append(section_dict)
        
        # Paginate results
        total = len(all_results)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_results = all_results[start_idx:end_idx]
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            'query': query,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'results': page_results,
            'has_more': page < total_pages
        }
    
    def get_section_by_number_fast(self, section_number: str, category_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Fast section lookup using indexed search"""
        # Clean section number
        section_clean = re.sub(r'[^\d\w]', '', section_number).upper()
        
        # Try using the optimized knowledge base search
        result = self.kb.search_by_section_number(section_clean)
        if result:
            data = result.get('data', {})
            data['category_id'] = result.get('source', '').replace('legal_sections_', '')
            return data
        
        return None
    
    def get_popular_sections(self, category_id: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get popular sections - optimized"""
        popular_section_numbers = {
            'ipc': ['302', '304', '376', '420', '498A', '354', '307', '120B'],
            'crpc': ['154', '156', '161', '167', '438', '439'],
            'cpc': ['9', '96', '100']
        }
        
        results = []
        categories = [category_id] if category_id else list(popular_section_numbers.keys())
        
        for cat_id in categories:
            if cat_id not in popular_section_numbers:
                continue
            
            for section_num in popular_section_numbers[cat_id]:
                section = self.get_section_by_number_fast(section_num, cat_id)
                if section:
                    section['popular'] = True
                    section['category_id'] = cat_id
                    results.append(section)
                    if len(results) >= limit:
                        return results
        
        return results
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get library statistics"""
        stats = {
            'total_categories': len(self.categories),
            'total_sections': 0,
            'cache_size': len(self._cache),
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
_enhanced_law_library = None

def get_enhanced_law_library() -> EnhancedLawLibrary:
    """Get or create singleton instance"""
    global _enhanced_law_library
    if _enhanced_law_library is None:
        _enhanced_law_library = EnhancedLawLibrary()
    return _enhanced_law_library
