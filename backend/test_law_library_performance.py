"""
Test Law Library Performance
Verifies the optimizations are working correctly
"""

import time
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from law_library_enhanced import get_enhanced_law_library
    from csv_knowledge_base_optimized import get_knowledge_base
    enhanced_available = True
except ImportError:
    enhanced_available = False
    print("⚠️  Enhanced library not installed. Run: python migrate_to_enhanced_library.py")
    sys.exit(1)

def measure_time(func, *args, **kwargs):
    """Measure execution time"""
    start = time.time()
    result = func(*args, **kwargs)
    elapsed = (time.time() - start) * 1000  # Convert to ms
    return result, elapsed

def test_performance():
    """Run performance tests"""
    print("=" * 70)
    print("🧪 LAW LIBRARY PERFORMANCE TEST")
    print("=" * 70)
    print()
    
    # Initialize
    print("📦 Initializing library...")
    library = get_enhanced_law_library()
    kb = get_knowledge_base()
    print("✅ Library initialized")
    print()
    
    # Test 1: Paginated sections load
    print("Test 1: Paginated Section Load (50 sections)")
    print("-" * 70)
    result, elapsed = measure_time(library.get_sections_paginated, 'ipc', 1, 50)
    
    if elapsed < 100:
        status = "✅ EXCELLENT"
    elif elapsed < 200:
        status = "✅ GOOD"
    elif elapsed < 500:
        status = "⚠️  ACCEPTABLE"
    else:
        status = "❌ SLOW"
    
    print(f"   Time: {elapsed:.0f}ms")
    print(f"   Status: {status}")
    print(f"   Loaded: {len(result.get('sections', []))} sections")
    print(f"   Total available: {result.get('total', 0)}")
    print()
    
    # Test 2: Search performance
    print("Test 2: Search Performance")
    print("-" * 70)
    result, elapsed = measure_time(library.search_sections_fast, 'murder', 'ipc', 1, 20)
    
    if elapsed < 200:
        status = "✅ EXCELLENT"
    elif elapsed < 300:
        status = "✅ GOOD"
    elif elapsed < 500:
        status = "⚠️  ACCEPTABLE"
    else:
        status = "❌ SLOW"
    
    print(f"   Time: {elapsed:.0f}ms")
    print(f"   Status: {status}")
    print(f"   Results found: {result.get('total', 0)}")
    print()
    
    # Test 3: Section lookup (uncached)
    print("Test 3: Section Lookup (First Time)")
    print("-" * 70)
    result, elapsed = measure_time(library.get_section_by_number_fast, '302', 'ipc')
    
    if elapsed < 50:
        status = "✅ EXCELLENT"
    elif elapsed < 100:
        status = "✅ GOOD"
    elif elapsed < 200:
        status = "⚠️  ACCEPTABLE"
    else:
        status = "❌ SLOW"
    
    print(f"   Time: {elapsed:.0f}ms")
    print(f"   Status: {status}")
    print(f"   Section found: {result.get('Section', 'Not found') if result else 'Not found'}")
    print()
    
    # Test 4: Section lookup (cached)
    print("Test 4: Section Lookup (Cached)")
    print("-" * 70)
    result, elapsed = measure_time(library.get_section_by_number_fast, '302', 'ipc')
    
    if elapsed < 20:
        status = "✅ EXCELLENT (Cached)"
    elif elapsed < 50:
        status = "✅ GOOD"
    elif elapsed < 100:
        status = "⚠️  ACCEPTABLE"
    else:
        status = "❌ SLOW"
    
    print(f"   Time: {elapsed:.0f}ms")
    print(f"   Status: {status}")
    print()
    
    # Test 5: Popular sections
    print("Test 5: Popular Sections Load")
    print("-" * 70)
    result, elapsed = measure_time(library.get_popular_sections, 'ipc', 10)
    
    if elapsed < 50:
        status = "✅ EXCELLENT"
    elif elapsed < 100:
        status = "✅ GOOD"
    elif elapsed < 200:
        status = "⚠️  ACCEPTABLE"
    else:
        status = "❌ SLOW"
    
    print(f"   Time: {elapsed:.0f}ms")
    print(f"   Status: {status}")
    print(f"   Sections loaded: {len(result)}")
    print()
    
    # Test 6: Statistics
    print("Test 6: Library Statistics")
    print("-" * 70)
    stats = library.get_statistics()
    kb_stats = kb.get_stats()
    
    print(f"   Total sections: {stats['total_sections']}")
    print(f"   Categories: {stats['total_categories']}")
    print(f"   Cache size: {stats['cache_size']} items")
    
    if 'cache_size' in kb_stats and hasattr(kb_stats['cache_size'], 'hits'):
        cache_info = kb_stats['cache_size']
        total_requests = cache_info.hits + cache_info.misses
        hit_rate = (cache_info.hits / total_requests * 100) if total_requests > 0 else 0
        print(f"   KB Cache hits: {cache_info.hits}")
        print(f"   KB Cache misses: {cache_info.misses}")
        print(f"   KB Hit rate: {hit_rate:.1f}%")
    print()
    
    # Summary
    print("=" * 70)
    print("📊 PERFORMANCE SUMMARY")
    print("=" * 70)
    print()
    print("✅ Expected Performance:")
    print("   • Paginated load: <100ms")
    print("   • Search: <200ms")
    print("   • Section lookup: <50ms")
    print("   • Cached lookup: <20ms")
    print("   • Popular sections: <50ms")
    print()
    print("🎯 Your Results:")
    print("   If all tests show ✅ EXCELLENT or ✅ GOOD, your optimization is working!")
    print("   If you see ⚠️  or ❌, check COMPLETE_LAW_LIBRARY_FIX.md for troubleshooting")
    print()
    print("💡 Tips:")
    print("   • Run this test multiple times to see caching benefits")
    print("   • First run builds indices and may be slightly slower")
    print("   • Subsequent runs should be much faster due to caching")
    print()
    print("=" * 70)

if __name__ == "__main__":
    try:
        test_performance()
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        print("\nCheck that:")
        print("1. Migration completed successfully")
        print("2. CSV files are in data/ directory")
        print("3. Server dependencies are installed")
