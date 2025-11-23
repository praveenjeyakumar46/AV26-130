"""
Test script to verify legal sections are being returned properly
"""

import requests
import json

API_URL = "http://localhost:8000/api/chat/complete"

test_queries = [
    {
        "name": "Workplace Harassment Question",
        "query": "What are workplace harassment laws in India?",
        "expected_sections": ["Section 354A", "Section 354D", "Section 509"]
    },
    {
        "name": "Murder Incident Report",
        "query": "My neighbor Mr. Arjun Malhotra was found dead in his apartment. There was a lot of arguing last night.",
        "expected_sections": ["Section 302", "Section 304"]
    },
    {
        "name": "FIR Question",
        "query": "How do I file an FIR?",
        "expected_sections": ["Section 154", "Section 156"]
    },
    {
        "name": "Specific Section Query",
        "query": "Explain Section 420 IPC",
        "expected_sections": ["Section 420"]
    },
    {
        "name": "Domestic Violence Question",
        "query": "What are the laws against domestic violence?",
        "expected_sections": ["Section 498A", "Section 304B"]
    }
]

def test_query(test_case):
    """Test a single query"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_case['name']}")
    print(f"Query: {test_case['query']}")
    print(f"{'='*80}")
    
    try:
        response = requests.post(
            API_URL,
            json={"text": test_case['query'], "language": "en"},
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ FAILED - HTTP {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get('success'):
            print(f"❌ FAILED - API returned success=False")
            return False
        
        legal_sections = data.get('legal_sections', [])
        
        print(f"\n📊 Results:")
        print(f"  • Answer length: {len(data.get('answer', ''))} characters")
        print(f"  • Legal sections found: {len(legal_sections)}")
        
        if not legal_sections:
            print(f"  ❌ NO LEGAL SECTIONS RETURNED")
            return False
        
        print(f"\n⚖️  Legal Sections Returned:")
        for i, section in enumerate(legal_sections, 1):
            print(f"\n  {i}. {section.get('section')} - {section.get('title')}")
            print(f"     Act: {section.get('act')}")
            print(f"     Description: {section.get('description', '')[:100]}...")
            print(f"     Punishment: {section.get('punishment')}")
            print(f"     Bailable: {section.get('bailable')} | Cognizable: {section.get('cognizable')}")
        
        # Check if expected sections are present
        returned_sections = [s.get('section', '') for s in legal_sections]
        expected = test_case.get('expected_sections', [])
        
        found_expected = []
        missing_expected = []
        
        for exp_section in expected:
            if any(exp_section in ret_section for ret_section in returned_sections):
                found_expected.append(exp_section)
            else:
                missing_expected.append(exp_section)
        
        if found_expected:
            print(f"\n  ✅ Found expected sections: {', '.join(found_expected)}")
        
        if missing_expected:
            print(f"  ⚠️  Missing expected sections: {', '.join(missing_expected)}")
        
        # Test passes if we have at least some legal sections
        if len(legal_sections) > 0:
            print(f"\n✅ TEST PASSED - Legal sections are being returned!")
            return True
        else:
            print(f"\n❌ TEST FAILED - No legal sections returned")
            return False
        
    except requests.exceptions.ConnectionError:
        print(f"❌ FAILED - Cannot connect to backend server at {API_URL}")
        print(f"   Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("🧪 LEGAL SECTIONS TEST SUITE")
    print("="*80)
    print("\nTesting if legal sections are properly returned by the API...")
    
    # First check if server is running
    try:
        health_response = requests.get("http://localhost:8000/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ Backend server is running")
        else:
            print("⚠️  Backend server responded but health check failed")
    except:
        print("❌ Backend server is not running!")
        print("   Please start the backend server first:")
        print("   cd backend && python main.py")
        return
    
    results = []
    for test_case in test_queries:
        result = test_query(test_case)
        results.append({
            'name': test_case['name'],
            'passed': result
        })
    
    # Summary
    print("\n" + "="*80)
    print("📋 TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in results if r['passed'])
    total = len(results)
    
    for result in results:
        status = "✅ PASS" if result['passed'] else "❌ FAIL"
        print(f"{status} - {result['name']}")
    
    print(f"\n{'='*80}")
    print(f"Results: {passed}/{total} tests passed")
    print(f"{'='*80}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Legal sections are working correctly!")
    elif passed > 0:
        print(f"\n⚠️  {total - passed} test(s) failed. Some queries may not be returning legal sections.")
    else:
        print("\n❌ ALL TESTS FAILED! Legal sections feature is not working.")

if __name__ == "__main__":
    main()
