"""
Process IPC Sections Data and Create Optimized CSV
Converts the comprehensive IPC data into the required format
"""

import csv
import re
from pathlib import Path

def parse_ipc_section(text):
    """Parse a single IPC section entry"""
    # Extract section number
    section_match = re.search(r'IPC_(\d+[A-Z]*)', text)
    if not section_match:
        return None
    
    section_num = section_match.group(1)
    section = f"Section {section_num}"
    
    # Extract offense/title
    offense_match = re.search(r'Offense\n([^\n]+)\n', text)
    if not offense_match:
        offense_match = re.search(r'"([^"]+)",([^,]+),IPC_', text)
        if offense_match:
            title = offense_match.group(2).strip()
        else:
            title = "N/A"
    else:
        title = offense_match.group(1).strip()
    
    # Extract punishment
    punishment_match = re.search(r'Punishment\n([^\n]+)\n', text)
    if not punishment_match:
        punishment_match = re.search(r',"([^"]*)",IPC_\d+', text)
        if punishment_match:
            punishment = punishment_match.group(1).strip()
        else:
            punishment = "N/A"
    else:
        punishment = punishment_match.group(1).strip()
    
    # Extract description (Simple Words)
    desc_match = re.search(r'IPC \d+[A-Z]* in Simple Words\n(.+?)(?:\n\n|$)', text, re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip().replace('\n', ' ')
    else:
        # Fallback to full description
        desc_match = re.search(r'Description of IPC Section \d+[A-Z]*\n(.+?)IPC \d+', text, re.DOTALL)
        if desc_match:
            description = desc_match.group(1).strip().replace('\n', ' ')[:500] + "..."
        else:
            description = "N/A"
    
    # Determine bailable and cognizable status based on punishment
    bailable = "Yes"
    cognizable = "Yes"
    
    punishment_lower = punishment.lower()
    
    # Non-bailable offenses
    if any(term in punishment_lower for term in ['death', 'life', 'imprisonment for life', '7 years', '10 years', 'rigorous']):
        bailable = "No"
    
    # All serious crimes are cognizable
    if 'fine' in punishment_lower and 'imprisonment' not in punishment_lower:
        cognizable = "No"
    
    return {
        'Section': section,
        'Act': 'Indian Penal Code',
        'Title': title,
        'Description': description,
        'Punishment': punishment,
        'Bailable': bailable,
        'Cognizable': cognizable
    }

def extract_ipc_sections_from_csv():
    """Extract IPC sections from the CSV data"""
    # Read the uploaded CSV file content
    csv_content = Path('ipc_sections.csv').read_text(encoding='utf-8')
    
    sections = []
    
    # Split by IPC section entries
    entries = csv_content.split('IPC_')[1:]  # Skip first empty split
    
    for entry in entries:
        full_entry = 'IPC_' + entry
        parsed = parse_ipc_section(full_entry)
        if parsed:
            sections.append(parsed)
    
    return sections

def create_optimized_ipc_csv(sections, output_file='data/legal_sections_ipc_complete.csv'):
    """Create an optimized CSV file with all IPC sections"""
    # Sort sections by section number
    def get_section_number(section_dict):
        match = re.search(r'Section (\d+)([A-Z]*)', section_dict['Section'])
        if match:
            num = int(match.group(1))
            suffix = match.group(2) if match.group(2) else ''
            return (num, suffix)
        return (9999, '')
    
    sorted_sections = sorted(sections, key=get_section_number)
    
    # Write to CSV
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['Section', 'Act', 'Title', 'Description', 'Punishment', 'Bailable', 'Cognizable']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        writer.writeheader()
        for section in sorted_sections:
            writer.writerow(section)
    
    print(f"✅ Created {output_file} with {len(sorted_sections)} sections")
    return len(sorted_sections)

if __name__ == "__main__":
    print("🔄 Processing IPC Sections Data...")
    print("=" * 70)
    
    # Note: You need to save the IPC data from the document as 'ipc_sections.csv' first
    print("📝 Place the ipc_sections.csv file in the backend directory")
    print("   Then run this script again")
    print()
    print("For now, I'll create a script to help you process it manually...")
