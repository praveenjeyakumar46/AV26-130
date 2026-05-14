/**
 * Script to load English and Tamil Constitution PDFs into Supabase legal_documents table
 * Run with: node database/scripts/load_constitution_pdfs.js
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

let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.error('❌ pdf-parse not installed. Run: npm install pdf-parse');
  process.exit(1);
}

const DATA_DIR    = path.join(__dirname, '../data');
const ENGLISH_PDF = path.join(DATA_DIR, 'constitution_english.pdf');
const TAMIL_PDF   = path.join(DATA_DIR, 'constitution_tamil.pdf');
const TAMIL_TXT   = path.join(DATA_DIR, 'constitution_tamil_unicode.txt');

// ── Sanitize text ─────────────────────────────────────────────────────────────
function sanitizeText(raw) {
  return raw
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0900-\u097F\u0B80-\u0BFF]/g, ' ')
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

// ── Extract text from PDF with fallback ───────────────────────────────────────
async function extractPdfText(filePath) {
  const buf = fs.readFileSync(filePath);

  // Strategy 1: Normal parse
  try {
    const result = await pdfParse(buf);
    const text = sanitizeText(result.text || '');
    if (text.length >= 100) return text;
  } catch (e) { /* fall through */ }

  // Strategy 2: Sanitized page render
  try {
    const result = await pdfParse(buf, {
      pagerender: async (pageData) => {
        try {
          const content = await pageData.getTextContent();
          return content.items
            .map((item) =>
              (item.str || '')
                .replace(/\x00/g, '')
                .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0900-\u097F\u0B80-\u0BFF]/g, ' ')
            )
            .join(' ');
        } catch (e) { return ''; }
      },
    });
    const text = sanitizeText(result.text || '');
    if (text.length >= 100) return text;
  } catch (e) { /* fall through */ }

  return null;
}

// ── Split English constitution into articles ──────────────────────────────────
function splitEnglishArticles(text) {
  const lines = text.split('\n');
  const articles = [];
  const ARTICLE_START = /^(\d+[A-Z]?)\.\s+(.+?)[—–-]/i;

  let currentNo = '';
  let currentName = '';
  let buf = [];

  const flush = () => {
    if (!currentNo || !buf.length) return;
    const body = buf.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (body.length < 20) return;
    articles.push({ art_no: currentNo, name: currentName, content: body });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(ARTICLE_START);
    if (m) {
      flush();
      buf = [trimmed];
      currentNo = m[1].toUpperCase();
      const dashIdx = trimmed.search(/[—–-]/);
      currentName = dashIdx > 0 ? trimmed.slice(trimmed.indexOf('.') + 1, dashIdx).trim() : '';
    } else if (currentNo) {
      buf.push(trimmed);
    }
  }
  flush();
  return articles;
}

// ── Split Tamil constitution into articles ────────────────────────────────────
function splitTamilArticles(text) {
  const lines = text.split('\n');
  const articles = [];
  const MARKER = /^(?:(?:சட்டப்பிரிவு|பிரிவு|கட்டுரை)\s+(\d+[a-zA-Z]?)\b|(\d+[A-Z]?)\.\s+(\S.*))(\s*.*)?$/i;

  let currentNo = '';
  let currentName = '';
  let buf = [];

  const flush = () => {
    if (!currentNo || !buf.length) return;
    const body = buf.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (body.length < 10) return;
    articles.push({ art_no: currentNo, name: currentName, content: body });
  };

  for (const line of lines) {
    const m = line.match(MARKER);
    if (m) {
      flush();
      buf = [line.trim()];
      currentNo   = m[1] ?? m[2] ?? '';
      currentName = (m[1] !== undefined ? (m[4] || '') : (m[3] || '')).trim().replace(/^[.\-—:\s]+/, '');
    } else if (currentNo) {
      buf.push(line.trim());
    }
  }
  flush();
  return articles;
}

// ── Chunk large text into smaller pieces for Supabase ────────────────────────
function chunkText(text, chunkSize = 8000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function loadConstitutionPdfs() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🔗 Connected to Supabase\n');

  let totalLoaded = 0;
  let totalErrors = 0;

  // ════════════════════════════════════════
  // ENGLISH CONSTITUTION
  // ════════════════════════════════════════
  console.log('═══════════════════════════════════════════════');
  console.log('📘 Loading English Constitution...');
  console.log('═══════════════════════════════════════════════');

  if (!fs.existsSync(ENGLISH_PDF)) {
    console.error(`❌ File not found: ${ENGLISH_PDF}`);
  } else {
    console.log('   Extracting text from PDF...');
    const englishText = await extractPdfText(ENGLISH_PDF);

    if (!englishText) {
      console.error('   ❌ Could not extract text from English constitution PDF');
    } else {
      console.log(`   ✅ Extracted ${englishText.length.toLocaleString()} characters`);

      // Split into articles
      const articles = splitEnglishArticles(englishText);
      console.log(`   📑 Split into ${articles.length} articles`);

      if (articles.length >= 50) {
        // Load article by article
        console.log('   Uploading articles to Supabase...');
        let artLoaded = 0;
        let artErrors = 0;

        for (const article of articles) {
          const { error } = await supabase
            .from('legal_documents')
            .upsert({
              title:      `Article ${article.art_no} - ${article.name || 'Constitution of India'}`,
              full_title: `Constitution of India - Article ${article.art_no}`,
              category:   'Constitutional & Governance',
              content:    article.content,
              source:     'Constitution of India (English PDF)',
              language:   'en',
              file_name:  `constitution_english_article_${article.art_no}.txt`,
            }, { onConflict: 'file_name' });

          if (error) {
            artErrors++;
          } else {
            artLoaded++;
          }
        }

        // Also save the full text as one document for full-text search
        const { error: fullError } = await supabase
          .from('legal_documents')
          .upsert({
            title:      'Constitution of India (Complete - English)',
            full_title: 'The Constitution of India - Complete Text',
            category:   'Constitutional & Governance',
            content:    englishText.substring(0, 100000), // Supabase text limit safe
            source:     'Constitution of India (English PDF)',
            language:   'en',
            file_name:  'constitution_english_full.txt',
          }, { onConflict: 'file_name' });

        if (fullError) {
          console.log(`   ⚠️  Full text save error: ${fullError.message}`);
        } else {
          artLoaded++;
        }

        console.log(`   ✅ Articles loaded: ${artLoaded}`);
        console.log(`   ❌ Errors: ${artErrors}`);
        totalLoaded += artLoaded;
        totalErrors += artErrors;
      } else {
        // Fallback: save as chunks
        console.log(`   ⚠️  Article split found only ${articles.length} articles — saving as chunks`);
        const chunks = chunkText(englishText);
        let chunkLoaded = 0;

        for (let i = 0; i < chunks.length; i++) {
          const { error } = await supabase
            .from('legal_documents')
            .upsert({
              title:      `Constitution of India (English) - Part ${i + 1}`,
              full_title: `Constitution of India - English Part ${i + 1}`,
              category:   'Constitutional & Governance',
              content:    chunks[i],
              source:     'Constitution of India (English PDF)',
              language:   'en',
              file_name:  `constitution_english_chunk_${i + 1}.txt`,
            }, { onConflict: 'file_name' });

          if (!error) chunkLoaded++;
        }
        console.log(`   ✅ Saved ${chunkLoaded} chunks`);
        totalLoaded += chunkLoaded;
      }
    }
  }

  // ════════════════════════════════════════
  // TAMIL CONSTITUTION
  // ════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════');
  console.log('📗 Loading Tamil Constitution...');
  console.log('═══════════════════════════════════════════════');

  let tamilText = null;

  // Prefer pre-OCR'd Unicode text file
  if (fs.existsSync(TAMIL_TXT)) {
    console.log('   Using pre-OCR Unicode text file (constitution_tamil_unicode.txt)');
    tamilText = sanitizeText(fs.readFileSync(TAMIL_TXT, 'utf-8'));
  } else if (fs.existsSync(TAMIL_PDF)) {
    console.log('   Extracting text from Tamil PDF...');
    tamilText = await extractPdfText(TAMIL_PDF);
  } else {
    console.error(`   ❌ Neither Tamil PDF nor Unicode text file found`);
  }

  if (!tamilText) {
    console.error('   ❌ Could not extract Tamil constitution text');
  } else {
    // Detect if it's actually Unicode Tamil
    const tamilCount = (tamilText.match(/[\u0B80-\u0BFF]/g) || []).length;
    console.log(`   ✅ Extracted ${tamilText.length.toLocaleString()} characters (${tamilCount} Tamil Unicode chars)`);

    const isUnicode = tamilCount > 100;

    if (isUnicode) {
      // Split into articles
      const articles = splitTamilArticles(tamilText);
      console.log(`   📑 Split into ${articles.length} articles`);

      if (articles.length >= 10) {
        console.log('   Uploading Tamil articles to Supabase...');
        let artLoaded = 0;
        let artErrors = 0;

        for (const article of articles) {
          const { error } = await supabase
            .from('legal_documents')
            .upsert({
              title:      `பிரிவு ${article.art_no} - ${article.name || 'இந்திய அரசியலமைப்பு'}`,
              full_title: `இந்திய அரசியலமைப்பு - பிரிவு ${article.art_no}`,
              category:   'Constitutional & Governance',
              content:    article.content,
              source:     'Constitution of India (Tamil PDF)',
              language:   'ta',
              file_name:  `constitution_tamil_article_${article.art_no}.txt`,
            }, { onConflict: 'file_name' });

          if (error) artErrors++;
          else artLoaded++;
        }

        // Save full Tamil text
        const { error: fullError } = await supabase
          .from('legal_documents')
          .upsert({
            title:      'இந்திய அரசியலமைப்பு (முழுமையான - தமிழ்)',
            full_title: 'இந்திய அரசியலமைப்பு - முழு உரை',
            category:   'Constitutional & Governance',
            content:    tamilText.substring(0, 100000),
            source:     'Constitution of India (Tamil PDF)',
            language:   'ta',
            file_name:  'constitution_tamil_full.txt',
          }, { onConflict: 'file_name' });

        if (!fullError) artLoaded++;

        console.log(`   ✅ Articles loaded: ${artLoaded}`);
        console.log(`   ❌ Errors: ${artErrors}`);
        totalLoaded += artLoaded;
        totalErrors += artErrors;
      } else {
        // Chunk fallback
        console.log(`   ⚠️  Saving as chunks (article split found only ${articles.length})`);
        const chunks = chunkText(tamilText);
        let chunkLoaded = 0;
        for (let i = 0; i < chunks.length; i++) {
          const { error } = await supabase
            .from('legal_documents')
            .upsert({
              title:      `இந்திய அரசியலமைப்பு (தமிழ்) - பகுதி ${i + 1}`,
              full_title: `Constitution of India Tamil - Part ${i + 1}`,
              category:   'Constitutional & Governance',
              content:    chunks[i],
              source:     'Constitution of India (Tamil PDF)',
              language:   'ta',
              file_name:  `constitution_tamil_chunk_${i + 1}.txt`,
            }, { onConflict: 'file_name' });
          if (!error) chunkLoaded++;
        }
        console.log(`   ✅ Saved ${chunkLoaded} chunks`);
        totalLoaded += chunkLoaded;
      }
    } else {
      // Legacy TSCII encoding — save as chunks with notice
      console.log('   ⚠️  Legacy TSCII encoding detected — saving with encoding notice');
      const chunks = chunkText(tamilText);
      let chunkLoaded = 0;
      for (let i = 0; i < chunks.length; i++) {
        const { error } = await supabase
          .from('legal_documents')
          .upsert({
            title:      `Constitution of India (Tamil - Legacy Encoding) - Part ${i + 1}`,
            full_title: `Constitution of India Tamil Part ${i + 1}`,
            category:   'Constitutional & Governance',
            content:    `[Legacy TSCII encoding - Unicode Tamil PDF needed for proper display]\n\n${chunks[i]}`,
            source:     'Constitution of India (Tamil PDF - TSCII)',
            language:   'ta',
            file_name:  `constitution_tamil_tscii_chunk_${i + 1}.txt`,
          }, { onConflict: 'file_name' });
        if (!error) chunkLoaded++;
      }
      console.log(`   ✅ Saved ${chunkLoaded} TSCII chunks`);
      totalLoaded += chunkLoaded;
    }
  }

  // ════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════');
  console.log('✨ Done!');
  console.log(`   ✅ Total records loaded : ${totalLoaded}`);
  console.log(`   ❌ Total errors         : ${totalErrors}`);
  console.log('═══════════════════════════════════════════════');
  console.log('\n📌 Constitution data is now searchable in Supabase legal_documents table');
  console.log('   The chatbot will use this data when answering constitution questions.');
}

loadConstitutionPdfs().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
