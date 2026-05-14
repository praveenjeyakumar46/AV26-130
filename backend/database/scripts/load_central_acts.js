/**
 * Script to load all Central Acts PDFs into Supabase
 * Handles:
 *   - Normal text PDFs
 *   - PDFs with Unicode escape errors (sanitized)
 *   - Scanned/image PDFs (stored as title-only placeholder)
 *
 * Run with: node database/scripts/load_central_acts.js
 */

// Force IPv4 to avoid IPv6 connectivity issues
require('dns').setDefaultResultOrder('ipv4first');

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Load .env ────────────────────────────────────────────────────────────────
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`📝 Loaded .env from: ${envPath}`);
    break;
  }
}

// ── Load pdf-parse ───────────────────────────────────────────────────────────
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.error('❌ pdf-parse not installed. Run: npm install pdf-parse');
  process.exit(1);
}

const CENTRAL_ACTS_DIR = path.join(__dirname, '../data/Central Acts');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect all PDFs with their category folder */
function getAllPdfs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllPdfs(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      results.push({
        filePath: fullPath,
        fileName: entry.name,
        category: path.basename(path.dirname(fullPath)),
      });
    }
  }
  return results;
}

/**
 * Sanitize extracted text:
 *  - Remove null bytes and non-printable control chars
 *  - Replace Windows-1252 / Latin-1 mojibake with safe equivalents
 *  - Collapse excessive whitespace
 */
function sanitizeText(raw) {
  return raw
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove non-printable control characters except tab, newline, carriage return
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace Windows smart quotes / dashes with ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    // Remove other non-ASCII chars that cause JSON issues (keep basic Latin + common Unicode)
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0900-\u097F\u0B80-\u0BFF]/g, ' ')
    // Collapse multiple spaces/newlines
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

/**
 * Try multiple strategies to extract text from a PDF:
 * 1. Normal parse
 * 2. Parse with sanitization (handles Unicode escape errors)
 * 3. Return null if all fail (scanned/image PDF)
 */
async function extractPdfText(filePath) {
  const buf = fs.readFileSync(filePath);

  // Strategy 1: Normal parse
  try {
    const result = await pdfParse(buf);
    const text = sanitizeText(result.text || '');
    if (text.length >= 50) return { text, method: 'normal' };
  } catch (err) {
    // fall through to strategy 2
  }

  // Strategy 2: Parse with custom render to suppress bad chars
  try {
    const result = await pdfParse(buf, {
      // Override the page render to catch and sanitize each page
      pagerender: async (pageData) => {
        try {
          const content = await pageData.getTextContent();
          return content.items
            .map((item) => {
              // item.str can contain bad Unicode — sanitize it
              const str = (item.str || '')
                .replace(/\x00/g, '')
                .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0900-\u097F\u0B80-\u0BFF]/g, ' ');
              return str;
            })
            .join(' ');
        } catch (e) {
          return '';
        }
      },
    });
    const text = sanitizeText(result.text || '');
    if (text.length >= 50) return { text, method: 'sanitized' };
  } catch (err) {
    // fall through to strategy 3
  }

  // Strategy 3: Store as placeholder (scanned/image PDF)
  return null;
}

/** Clean act name from filename */
function getActName(fileName) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/^The\s+/i, '')
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function loadCentralActs() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🔗 Connected to Supabase\n');

  if (!fs.existsSync(CENTRAL_ACTS_DIR)) {
    console.error(`❌ Central Acts directory not found: ${CENTRAL_ACTS_DIR}`);
    process.exit(1);
  }

  const pdfs = getAllPdfs(CENTRAL_ACTS_DIR);
  console.log(`📂 Found ${pdfs.length} PDF files across all categories\n`);

  let loaded    = 0;  // text extracted + saved
  let placeholders = 0; // scanned PDFs saved as title-only
  let dbErrors  = 0;

  for (const { filePath, fileName, category } of pdfs) {
    const actName  = getActName(fileName);
    const catClean = category.replace(/^\d+\.\s*/, '');
    process.stdout.write(`📄 ${actName}  ...  `);

    const extracted = await extractPdfText(filePath);

    let content;
    let isPlaceholder = false;

    if (extracted) {
      content = extracted.text;
    } else {
      // Scanned PDF — store a placeholder so the act is at least findable by title
      content = `[Scanned PDF — text not extractable]\n\nAct: ${actName}\nCategory: ${catClean}\n\nThis document is a scanned image PDF. Please refer to the original PDF for content.`;
      isPlaceholder = true;
    }

    const { error } = await supabase
      .from('legal_documents')
      .upsert(
        {
          title:      actName,
          full_title: fileName.replace(/\.pdf$/i, ''),
          category:   catClean,
          content,
          source:     isPlaceholder ? 'Central Acts PDF (scanned)' : 'Central Acts PDF',
          language:   'en',
          file_name:  fileName,
        },
        { onConflict: 'file_name' }
      );

    if (error) {
      console.log(`❌ DB error: ${error.message}`);
      dbErrors++;
    } else if (isPlaceholder) {
      console.log(`⚠️  Placeholder saved (scanned PDF)`);
      placeholders++;
    } else {
      console.log(`✅ Loaded (${content.length.toLocaleString()} chars, ${extracted.method})`);
      loaded++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('✨ Done!');
  console.log(`   ✅ Text extracted & loaded : ${loaded}`);
  console.log(`   ⚠️  Placeholders (scanned)  : ${placeholders}`);
  console.log(`   ❌ DB errors               : ${dbErrors}`);
  console.log(`   📊 Total PDFs              : ${pdfs.length}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`\n📌 Total saved to Supabase: ${loaded + placeholders} / ${pdfs.length}`);
}

loadCentralActs().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
