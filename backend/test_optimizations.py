"""
Test script to verify optimizations are working
"""

import time
from csv_knowledge_base_optimized import get_knowledge_base
from legal_section_matcher_optimized import get_section_matcher

print("="*60)
print("Testing Optimized IPC/CPC/CrPC Access")
print("="*60)

# Test 1: Initialize knowledge base
print("\n1. Initializing knowledge base...")
start = time.time()
kb = get_knowledge_base()
print(f"   ✓ Initialized in {(time.time() - start)*1000:.2f}ms")

# Test 2: Get statistics
print("\n2. Getting statistics...")
start = time.time()
stats = kb.get_stats()
print(f"   ✓ Retrieved stats in {(time.time() - start)*1000:.2f}ms")
print(f"   - Total files: {stats['total_files']}")
print(f"   - Total records: {stats['total_records']}")
print(f"   - Indexed files: {stats['indexed_files']}")

# Test 3: Fast section lookup
print("\n3. Testing fast section lookup...")
test_sections = ['302', '498A', '354A', '420', '376']
for section in test_sections:
    start = time.time()
    result = kb.search_by_section_number(section)
    elapsed = (time.time() - start)*1000
    if result:
        print(f"   ✓ Section {section}: {elapsed:.2f}ms - {result['data'].get('Title', 'N/A')[:50]}")
    else:
        print(f"   ✗ Section {section}: Not found")

# Test 4: Initialize section matcher
print("\n4. Initializing section matcher...")
start = time.time()
matcher = get_section_matcher()
print(f"   ✓ Initialized in {(time.time() - start)*1000:.2f}ms")

# Test 5: Query-based section matching
print("\n5. Testing query-based section matching...")
test_queries = [
    "workplace harassment by boss",
    "murder case investigation",
    "anticipatory bail application",
    "cheating and fraud case"
]

for query in test_queries:
    start = time.time()
    sections = matcher.get_relevant_sections(query, limit=3)
    elapsed = (time.time() - start)*1000
    print(f"\n   Query: '{query}'")
    print(f"   Time: {elapsed:.2f}ms")
    print(f"   Found {len(sections)} sections:")
    for sec in sections:
        print(f"      - {sec.get('section')}: {sec.get('title')[:40]}")

# Test 6: Cache performance
print("\n6. Testing cache performance (second query should be faster)...")
query = "workplace harassment by boss"

start = time.time()
sections1 = matcher.get_relevant_sections(query, limit=3)
time1 = (time.time() - start)*1000

start = time.time()
sections2 = matcher.get_relevant_sections(query, limit=3)
time2 = (time.time() - start)*1000

print(f"   First query:  {time1:.2f}ms")
print(f"   Second query: {time2:.2f}ms")
print(f"   Speed improvement: {((time1-time2)/time1*100):.1f}%")

# Test 7: Keyword search performance
print("\n7. Testing keyword search...")
keywords = ['harassment', 'murder', 'theft', 'bail']
for keyword in keywords:
    start = time.time()
    results = kb.search_by_keyword(keyword, limit=3)
    elapsed = (time.time() - start)*1000
    print(f"   '{keyword}': {elapsed:.2f}ms - Found {len(results)} results")

print("\n" + "="*60)
print("Optimization Test Complete!")
print("="*60)
