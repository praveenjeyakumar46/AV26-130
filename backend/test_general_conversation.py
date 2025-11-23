import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from general_conversation import handle_general_conversation

def test_conversation():
    test_cases = [
        ("hi", True),
        ("hello", True),
        ("Hello there", True),
        ("what can you do", True),
        ("who are you", True),
        ("help", True),
        ("thanks", True),
        ("thank you", True),
        ("I have a legal issue", False),
        ("Section 302 IPC", False),
        ("My neighbor is harassing me", False)
    ]
    
    print("Running tests...")
    passed = 0
    for text, expected_success in test_cases:
        result = handle_general_conversation(text)
        is_success = result is not None
        
        status = "✅" if is_success == expected_success else "❌"
        print(f"{status} Input: '{text}' -> Expected: {expected_success}, Got: {is_success}")
        
        if is_success == expected_success:
            passed += 1
            
    print(f"\nPassed {passed}/{len(test_cases)} tests.")
    
    if passed == len(test_cases):
        print("All tests passed!")
        sys.exit(0)
    else:
        print("Some tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    test_conversation()
