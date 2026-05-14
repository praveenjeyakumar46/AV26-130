"""
ocr_tamil_pdf.py
────────────────
Converts the VANAVIL-encoded Tamil Constitution PDF into a Unicode Tamil text
file that your app can actually use.

Requirements:
  pip install pytesseract pillow pdf2image
  sudo apt install tesseract-ocr tesseract-ocr-tam poppler-utils
  (or: brew install tesseract tesseract-lang)

Usage:
  python ocr_tamil_pdf.py --input constitution_tamil.pdf --output constitution_tamil_unicode.txt
  python ocr_tamil_pdf.py --input constitution_tamil.pdf --output constitution_tamil_unicode.txt --pages 1-50
"""

import argparse
import sys
import os

def setup_tesseract():
    """Find and configure Tesseract on Windows."""
    import pytesseract
    import shutil

    # If tesseract is already in PATH, nothing to do
    if shutil.which('tesseract'):
        return

    # Common Windows installation paths
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.join(os.environ.get('USERPROFILE', ''), 'AppData', 'Local', 'Tesseract-OCR', 'tesseract.exe'),
    ]
    for p in windows_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            print(f"   Found Tesseract at: {p}")
            return

    # Not found anywhere
    print("❌ Tesseract not found on this Windows machine.")
    print("   Download and install it from:")
    print("   https://github.com/UB-Mannheim/tesseract/wiki")
    print("   During install, tick 'Additional script data' and select Tamil.")
    print("   Then re-run this script.")
    sys.exit(1)


def check_dependencies():
    missing = []
    try:
        import pytesseract
        setup_tesseract()
        # Check Tamil language pack is installed
        langs = pytesseract.get_languages()
        if 'tam' not in langs:
            print("❌ Tesseract Tamil language pack not found.")
            print("   Re-run the Tesseract installer and tick 'Additional script data' > Tamil.")
            sys.exit(1)
    except ImportError:
        missing.append('pytesseract')
    try:
        from pdf2image import convert_from_path
    except ImportError:
        missing.append('pdf2image')
    try:
        from PIL import Image
    except ImportError:
        missing.append('pillow')

    if missing:
        print(f"❌ Missing packages: {', '.join(missing)}")
        print(f"   Run: pip install {' '.join(missing)}")
        sys.exit(1)

def parse_page_range(s, total_pages):
    """Parse '1-50' or '1,5,10' or 'all' into a list of 0-based page indices."""
    if not s or s.lower() == 'all':
        return list(range(total_pages))
    result = []
    for part in s.split(','):
        part = part.strip()
        if '-' in part:
            a, b = part.split('-')
            result.extend(range(int(a) - 1, int(b)))
        else:
            result.append(int(part) - 1)
    return [p for p in result if 0 <= p < total_pages]

def ocr_pdf(input_path, output_path, page_range_str=None, dpi=300):
    check_dependencies()
    import pytesseract
    from pdf2image import convert_from_path
    from pdf2image.pdf2image import pdfinfo_from_path

    print(f"📄 Loading PDF: {input_path}")
    print(f"   Getting page count...")

    info = pdfinfo_from_path(input_path)
    total_pages = info.get('Pages', 0)
    print(f"   Total pages: {total_pages}")

    page_indices = parse_page_range(page_range_str, total_pages)
    print(f"   Processing {len(page_indices)} pages...")

    all_text = []
    for i, page_num in enumerate(page_indices):
        # Convert one page at a time to save memory
        images = convert_from_path(
            input_path,
            dpi=dpi,
            first_page=page_num + 1,
            last_page=page_num + 1
        )
        if not images:
            continue

        img = images[0]
        # OCR with Tamil language
        text = pytesseract.image_to_string(img, lang='tam')
        all_text.append(text)

        if (i + 1) % 10 == 0 or (i + 1) == len(page_indices):
            print(f"   ✓ {i + 1}/{len(page_indices)} pages done", end='\r')

    print()
    combined = '\n\n'.join(all_text)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(combined)

    tamil_count = len([c for c in combined if '\u0B80' <= c <= '\u0BFF'])
    print(f"\n✅ Done! Written to: {output_path}")
    print(f"   Total characters  : {len(combined):,}")
    print(f"   Tamil Unicode chars: {tamil_count:,}")
    if tamil_count < 1000:
        print("   ⚠️  Low Tamil char count — OCR quality may be poor.")
        print("      Try re-running with --dpi 400 for better results.")
    return output_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='OCR Tamil PDF to Unicode text')
    parser.add_argument('--input',  required=True, help='Path to Tamil PDF')
    parser.add_argument('--output', required=True, help='Output .txt file path')
    parser.add_argument('--pages',  default='all',  help='Page range, e.g. "1-100" or "all"')
    parser.add_argument('--dpi',    type=int, default=300, help='DPI for image conversion (default 300)')
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"❌ File not found: {args.input}")
        sys.exit(1)

    ocr_pdf(args.input, args.output, args.pages, args.dpi)
