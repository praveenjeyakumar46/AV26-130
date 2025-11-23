"""
Law Library API Test Script
Tests all law library endpoints to verify functionality
"""

import requests
import json
from typing import Dict, Any

API_BASE = "http://localhost:8000/api/law-library"

def print_response(title: str, response: Dict[str, Any], show_full: bool = False):
    """Pretty print API response"""
    print(f"\n{'='*80}")
    print(f"TEST: {title}")
    print(f"{'='*80}")
    
    if not response:
        print("❌ No response received")
        return
    
    if not response.get('success'):
        print(f"❌ FAILED: {response.get('error', 'Unknown error')}")
        return
    
    print("✅ SUCCESS")
    
    # Print relevant data
    if show_full:
        print(json.dumps(response, indent=2, ensure_ascii=False))
    else:
        # Print summary
        for key, value in response.items():
            if key == 'success':
                continue
            if isinstance(value, list):
                print(f"\n{key.title()}: {len(value)} items")
                if value and len(value) > 0:
                    print(f"  First item: {value[0]}")
            elif isinstance(value, dict):
                print(f"\n{key.title()}:")
                for k, v in value.items():
                    if isinstance(v, (list, dict)):
                        print(f"  {k}: {type(v).__name__} with {len(v)} items")
                    else:
                        print(f"  {k}: {v}")
            else:
                print(f"{key}: {value}")

def test_categories():
    """Test: Get all categories"""
    try:
        response = requests.get(f"{API_BASE}/categories", timeout=5)
        data = response.json()
        print_response("Get All Categories", data)
        
        if data.get('success'):
            categories = data.get('categories', [])
            print(f"\n📚 Found {len(categories)} categories:")
            for cat in categories:
                print(f"  • {cat['name']}: {cat['count']} sections, {cat['chapters']} chapters")
        
        return data.get('categories', [])
    except Exception as e:
        print_response("Get All Categories", {'success': False, 'error': str(e)})
        return []

def test_category_details(category_id: str = 'ipc'):
    """Test: Get category details"""
    try:
        response = requests.get(f"{API_BASE}/category/{category_id}", timeout=5)
        data = response.json()
        print_response(f"Get Category Details ({category_id})", data)
        
        if data.get('success'):
            category = data.get('category', {})
            print(f"\n📖 {category.get('name')}")
            print(f"  Total Sections: {category.get('total_sections')}")
            print(f"  Chapters: {len(category.get('chapters', []))}")
            
            chapters = category.get('chapters', [])
            if chapters:
                print(f"\n  First 3 Chapters:")
                for chapter in chapters[:3]:
                    popular = "⭐" if chapter.get('popular') else ""
                    print(f"    • {chapter.get('title')} {popular}")
                    print(f"      Range: {chapter.get('range')}")
        
        return data
    except Exception as e:
        print_response(f"Get Category Details ({category_id})", {'success': False, 'error': str(e)})
        return {}

def test_search(query: str = "murder", category: str = None):
    """Test: Search sections"""
    try:
        params = {'query': query}
        if category:
            params['category'] = category
        
        response = requests.get(f"{API_BASE}/search", params=params, timeout=5)
        data = response.json()
        
        title = f"Search '{query}'"
        if category:
            title += f" in {category}"
        
        print_response(title, data)
        
        if data.get('success'):
            results = data.get('results', [])
            print(f"\n🔍 Found {len(results)} results:")
            
            for i, result in enumerate(results[:3], 1):
                print(f"\n  Result {i}:")
                print(f"    Section: {result.get('Section')}")
                print(f"    Title: {result.get('Title')}")
                print(f"    Category: {result.get('category', 'N/A')}")
                if 'match_score' in result:
                    print(f"    Match Score: {result.get('match_score')}")
                if 'matched_fields' in result:
                    print(f"    Matched Fields: {', '.join(result.get('matched_fields', []))}")
        
        return data
    except Exception as e:
        print_response(f"Search '{query}'", {'success': False, 'error': str(e)})
        return {}

def test_section_by_number(section_number: str = "302"):
    """Test: Get specific section"""
    try:
        response = requests.get(f"{API_BASE}/section/{section_number}", timeout=5)
        data = response.json()
        print_response(f"Get Section {section_number}", data)
        
        if data.get('success'):
            section = data.get('section', {})
            print(f"\n📄 {section.get('Section')} - {section.get('Title')}")
            print(f"  Act: {section.get('Act')}")
            print(f"  Description: {section.get('Description', '')[:100]}...")
            print(f"  Punishment: {section.get('Punishment')}")
            print(f"  Bailable: {section.get('Bailable')}")
            print(f"  Cognizable: {section.get('Cognizable')}")
        
        return data
    except Exception as e:
        print_response(f"Get Section {section_number}", {'success': False, 'error': str(e)})
        return {}

def test_popular_sections(category: str = None, limit: int = 5):
    """Test: Get popular sections"""
    try:
        params = {'limit': limit}
        if category:
            params['category'] = category
        
        response = requests.get(f"{API_BASE}/popular", params=params, timeout=5)
        data = response.json()
        
        title = f"Get Popular Sections"
        if category:
            title += f" ({category})"
        
        print_response(title, data)
        
        if data.get('success'):
            sections = data.get('sections', [])
            print(f"\n⭐ Popular Sections ({len(sections)}):")
            
            for i, section in enumerate(sections, 1):
                print(f"\n  {i}. {section.get('Section')} - {section.get('Title')}")
                print(f"     {section.get('Act')}")
                print(f"     Punishment: {section.get('Punishment', 'N/A')}")
        
        return data
    except Exception as e:
        print_response(title, {'success': False, 'error': str(e)})
        return {}

def test_chapter_sections(category_id: str = "ipc", chapter_range: str = "Sections 299-377"):
    """Test: Get chapter sections"""
    try:
        params = {'chapter_range': chapter_range}
        response = requests.get(f"{API_BASE}/chapter/{category_id}", params=params, timeout=5)
        data = response.json()
        print_response(f"Get Chapter Sections ({category_id}: {chapter_range})", data)
        
        if data.get('success'):
            total = data.get('total', 0)
            sections = data.get('sections', [])
            print(f"\n📂 Chapter has {total} sections")
            print(f"  Showing {len(sections)} sections:")
            
            for section in sections[:3]:
                print(f"    • {section.get('Section')} - {section.get('Title')}")
        
        return data
    except Exception as e:
        print_response(f"Get Chapter Sections", {'success': False, 'error': str(e)})
        return {}

def test_category_sections(category_id: str = "ipc", limit: int = 5):
    """Test: Get category sections with pagination"""
    try:
        params = {'limit': limit, 'offset': 0}
        response = requests.get(f"{API_BASE}/sections/{category_id}", params=params, timeout=5)
        data = response.json()
        print_response(f"Get Category Sections ({category_id}, limit={limit})", data)
        
        if data.get('success'):
            total = data.get('total', 0)
            sections = data.get('sections', [])
            has_more = data.get('has_more', False)
            
            print(f"\n📚 Category: {data.get('category')}")
            print(f"  Total Sections: {total}")
            print(f"  Showing: {len(sections)}")
            print(f"  Has More: {'Yes' if has_more else 'No'}")
            
            print(f"\n  First {len(sections)} sections:")
            for section in sections:
                print(f"    • {section.get('Section')} - {section.get('Title')}")
        
        return data
    except Exception as e:
        print_response(f"Get Category Sections", {'success': False, 'error': str(e)})
        return {}

def test_statistics():
    """Test: Get library statistics"""
    try:
        response = requests.get(f"{API_BASE}/statistics", timeout=5)
        data = response.json()
        print_response("Get Library Statistics", data)
        
        if data.get('success'):
            stats = data.get('statistics', {})
            print(f"\n📊 Library Statistics:")
            print(f"  Total Categories: {stats.get('total_categories')}")
            print(f"  Total Sections: {stats.get('total_sections')}")
            
            categories = stats.get('categories', {})
            print(f"\n  Categories Breakdown:")
            for cat_id, cat_info in categories.items():
                print(f"    • {cat_info.get('name')}: {cat_info.get('count')} sections, {cat_info.get('chapters')} chapters")
        
        return data
    except Exception as e:
        print_response("Get Library Statistics", {'success': False, 'error': str(e)})
        return {}

def run_all_tests():
    """Run all API tests"""
    print("\n" + "="*80)
    print("🧪 LAW LIBRARY API TEST SUITE")
    print("="*80)
    print("\nTesting all law library endpoints...")
    print("Backend should be running on http://localhost:8000")
    
    # Test 1: Categories
    categories = test_categories()
    
    # Test 2: Category Details
    if categories:
        test_category_details('ipc')
    
    # Test 3: Search - Various queries
    test_search("murder")
    test_search("theft")
    test_search("Section 420")
    test_search("FIR", "crpc")
    
    # Test 4: Specific Sections
    test_section_by_number("302")
    test_section_by_number("420")
    test_section_by_number("498A")
    
    # Test 5: Popular Sections
    test_popular_sections(limit=5)
    test_popular_sections("ipc", limit=3)
    
    # Test 6: Chapter Sections
    test_chapter_sections("ipc", "Sections 299-377")
    
    # Test 7: Category Sections (Paginated)
    test_category_sections("ipc", limit=5)
    
    # Test 8: Statistics
    test_statistics()
    
    # Summary
    print("\n" + "="*80)
    print("✅ TEST SUITE COMPLETE")
    print("="*80)
    print("\nAll endpoints tested!")
    print("Check above for any failures (❌)")
    print("\nIf all tests passed (✅), your law library API is working correctly!")

if __name__ == "__main__":
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/health", timeout=2)
        if response.status_code == 200:
            print("✅ Backend server is running")
            run_all_tests()
        else:
            print("❌ Backend server responded but health check failed")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server!")
        print("   Please start the backend first:")
        print("   cd backend && python main.py")
    except Exception as e:
        print(f"❌ Error: {e}")
