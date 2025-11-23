"""
Test script for keyword extraction optimization
Run this to test if the extraction correctly identifies Reporter, Victim, Suspect, etc.
"""

import requests
import json

# Test text from user
TEST_TEXT = """My name is Rina Sharma, and I live in Apartment 3A at Greenview Apartments, Andheri West. I would like to report a serious incident that took place last night, 9th November 2025, involving my neighbor, Mr. Arjun Malhotra, who lives in Apartment 3B. Around 10:15 p.m., I heard loud arguing coming from his flat. It sounded like two men were having a heated dispute about money or some kind of betrayal. I also heard the sound of glass breaking, after which things went silent. I thought they might have settled it, so I didn't check further at that time. This morning, around 6:45 a.m., the security guard informed me that Mr. Malhotra had been found lying unconscious in his living room, and he immediately called the police. When the officers arrived, they found him deceased with what appeared to be injuries to his head and cuts from broken glass. The guard mentioned that a man named Karan Verma, who often visited Mr. Malhotra and was known to be his business associate, had come to visit last night around 9:45 p.m. and left hurriedly around 11:00 p.m. I believe this information may help in your investigation, as I am aware that the two had ongoing financial disputes in recent weeks"""

# Expected results
EXPECTED_KEYWORDS = {
    "Reporter": "Rina Sharma",
    "Victim": "Mr. Arjun Malhotra",
    "Suspect": "Karan Verma",
    "Witness": "Security Guard",
    "Time of incident": "10:15 p.m.",
    "Time when victim was found": "6:45 a.m.",
    "Visitor time": "9:45 p.m.",
    "Location": "Apartment 3A at Greenview Apartments, Andheri West"
}

def test_extraction():
    """Test the keyword extraction"""
    
    print("="*80)
    print("🧪 TESTING KEYWORD EXTRACTION")
    print("="*80)
    
    try:
        # Send request to API
        response = requests.post(
            "http://localhost:8000/api/chat/complete",
            json={"text": TEST_TEXT, "language": "en"},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n✅ API Response Received\n")
            
            # Extract keywords
            keywords = result.get("keywords", [])
            
            print("📋 EXTRACTED KEYWORDS:")
            print("-" * 80)
            
            # Create a dictionary for easy comparison
            extracted_dict = {k["label"]: k["value"] for k in keywords}
            
            # Check each expected keyword
            matches = 0
            total = len(EXPECTED_KEYWORDS)
            
            for label, expected_value in EXPECTED_KEYWORDS.items():
                extracted_value = extracted_dict.get(label, "NOT FOUND")
                
                # Check if it's a match (case-insensitive and flexible matching)
                is_match = False
                if label in extracted_dict:
                    # For names and locations, check if they're similar
                    if label in ["Reporter", "Victim", "Suspect", "Witness", "Location"]:
                        is_match = expected_value.lower() in extracted_value.lower() or extracted_value.lower() in expected_value.lower()
                    # For times, check if the time value matches
                    elif "Time" in label:
                        # Extract just the time part (e.g., "10:15" from "10:15 p.m.")
                        expected_time = expected_value.replace(" ", "").replace(".", "").lower()
                        extracted_time = extracted_value.replace(" ", "").replace(".", "").lower()
                        is_match = expected_time in extracted_time or extracted_time in expected_time
                    else:
                        is_match = expected_value.lower() == extracted_value.lower()
                
                if is_match:
                    matches += 1
                    print(f"✅ {label:30} : {extracted_value}")
                else:
                    print(f"❌ {label:30} : {extracted_value}")
                    print(f"   Expected: {expected_value}")
            
            # Print additional extracted keywords
            print("\n📌 ALL EXTRACTED KEYWORDS:")
            print("-" * 80)
            for kw in keywords:
                print(f"   {kw['label']:30} : {kw['value']}")
            
            # Calculate accuracy
            accuracy = (matches / total) * 100
            print("\n" + "="*80)
            print(f"🎯 ACCURACY: {matches}/{total} ({accuracy:.1f}%)")
            print("="*80)
            
            # Print summary
            print("\n📝 SUMMARY:")
            print("-" * 80)
            print(result.get("summary", "No summary generated"))
            
            return accuracy >= 75  # Pass if 75% or more matches
            
        else:
            print(f"❌ API Error: Status {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API at http://localhost:8000")
        print("   Please make sure the backend server is running:")
        print("   cd backend && python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_extraction()
    
    if success:
        print("\n🎉 TEST PASSED! Extraction is working correctly.")
    else:
        print("\n⚠️ TEST FAILED! Some keywords were not extracted correctly.")
        print("\nTroubleshooting tips:")
        print("1. Make sure Ollama is running: ollama list")
        print("2. Make sure Mistral model is available: ollama pull mistral")
        print("3. Restart the backend server: python backend/main.py")
        print("4. Check if the patterns in build_labeled_keywords() need adjustment")
