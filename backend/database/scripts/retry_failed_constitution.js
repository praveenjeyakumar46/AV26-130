/**
 * Script to retry failed constitution article uploads
 * Handles: content too large, duplicate file_names, special characters
 * Run with: node database/scripts/retry_failed_constitution.js
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

const DATA_DIR  = path.join(__dirname, '../data');
const TAMIL_TXT = path.join(DATA_DIR, 'constitution_tamil_unicode.txt');
const ENGLISH_PDF = path.join(DATA_DIR, 'constitution_english.pdf');

// ── Sanitize ─────────────────────────────────────────────────────────────────
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

// ── Make file_name safe (no spaces, no special chars) ────────────────────────
function safeFileName(str) {
  return str
    .replace(/[\u0B80-\u0BFF]+/g, (match) => {
      // Convert Tamil chars to their char codes for safe filename
      return Array.from(match).map(c => c.charCodeAt(0).toString(16)).join('');
    })
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200); // Supabase has 500 char limit but keep it safe
}

// ── Truncate content to safe size (Supabase TEXT is fine but avoid huge payloads) ──
function truncateContent(content, maxChars = 50000) {
  if (content.length <= maxChars) return content;
  return content.substring(0, maxChars) + '\n\n[Content truncated — see original PDF for full text]';
}

// ── Extract English articles ──────────────────────────────────────────────────
async function extractEnglishArticles() {
  const buf = fs.readFileSync(ENGLISH_PDF);
  const result = await pdfParse(buf);
  const text = sanitizeText(result.text || '');
  const lines = text.split('\n');
  const articles = [];
  const ARTICLE_START = /^(\d+[A-Z]?)\.\s+(.+?)[—–-]/i;

  let currentNo = '', currentName = '', buf2 = [];
  const flush = () => {
    if (!currentNo || !buf2.length) return;
    const body = buf2.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (body.length >= 20) articles.push({ art_no: currentNo, name: currentName, content: body });
  };
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(ARTICLE_START);
    if (m) {
      flush(); buf2 = [trimmed]; currentNo = m[1].toUpperCase();
      const dashIdx = trimmed.search(/[—–-]/);
      currentName = dashIdx > 0 ? trimmed.slice(trimmed.indexOf('.') + 1, dashIdx).trim() : '';
    } else if (currentNo) { buf2.push(trimmed); }
  }
  flush();
  return articles;
}

// ── Extract Tamil articles ────────────────────────────────────────────────────
function extractTamilArticles() {
  const raw = fs.readFileSync(TAMIL_TXT, 'utf-8');
  const text = sanitizeText(raw);
  const lines = text.split('\n');
  const articles = [];
  const MARKER = /^(?:(?:சட்டப்பிரிவு|பிரிவு|கட்டுரை)\s+(\d+[a-zA-Z]?)\b|(\d+[A-Z]?)\.\s+(\S.*))(\s*.*)?$/i;

  let currentNo = '', currentName = '', buf = [];
  const flush = () => {
    if (!currentNo || !buf.length) return;
    const body = buf.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (body.length >= 10) articles.push({ art_no: currentNo, name: currentName, content: body });
  };
  for (const line of lines) {
    const m = line.match(MARKER);
    if (m) {
      flush(); buf = [line.trim()];
      currentNo   = m[1] ?? m[2] ?? '';
      currentName = (m[1] !== undefined ? (m[4] || '') : (m[3] || '')).trim().replace(/^[.\-—:\s]+/, '');
    } else if (currentNo) { buf.push(line.trim()); }
  }
  flush();
  return articles;
}

// ── Upload with full error detail + retry logic ───────────────────────────────
async function uploadArticle(supabase, record, attempt = 1) {
  // Truncate content if too large
  record.content = truncateContent(record.content);

  // Ensure file_name is safe
  record.file_name = safeFileName(record.file_name);

  const { error } = await supabase
    .from('legal_documents')
    .upsert(record, { onConflict: 'file_name' });

  if (error) {
    if (attempt === 1) {
      // Retry with further truncated content and simplified title
      record.content = truncateContent(record.content, 10000);
      record.title   = record.title.replace(/[^\x20-\x7E\u0B80-\u0BFF]/g, ' ').trim().substring(0, 200);
      return uploadArticle(supabase, record, 2);
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function retryFailed() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🔗 Connected to Supabase\n');

  // ── Step 1: Find all already-uploaded file_names ──────────────────────────
  console.log('🔍 Fetching already uploaded records from Supabase...');
  const { data: existing, error: fetchError } = await supabase
    .from('legal_documents')
    .select('file_name')
    .ilike('source', '%Constitution%');

  if (fetchError) {
    console.error('❌ Could not fetch existing records:', fetchError.message);
    process.exit(1);
  }

  const existingFileNames = new Set((existing || []).map(r => r.file_name));
  console.log(`   Found ${existingFileNames.size} already uploaded constitution records\n`);

  let retried = 0;
  let succeeded = 0;
  let failed = 0;
  const failedDetails = [];

  // ── Step 2: Retry missing English articles ────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('📘 Checking missing English articles...');
  console.log('═══════════════════════════════════════════════');

  const englishArticles = await extractEnglishArticles();
  const missingEnglish = englishArticles.filter(a => {
    const fn = safeFileName(`constitution_english_article_${a.art_no}.txt`);
    return !existingFileNames.has(fn);
  });

  console.log(`   Total articles: ${englishArticles.length}`);
  console.log(`   Already uploaded: ${englishArticles.length - missingEnglish.length}`);
  console.log(`   Missing / failed: ${missingEnglish.length}\n`);

  for (const article of missingEnglish) {
    const fileName = safeFileName(`constitution_english_article_${article.art_no}.txt`);
    process.stdout.write(`   📄 Article ${article.art_no} (EN) ... `);
    retried++;

    const result = await uploadArticle(supabase, {
      title:      `Article ${article.art_no} - ${article.name || 'Constitution of India'}`,
      full_title: `Constitution of India - Article ${article.art_no}`,
      category:   'Constitutional & Governance',
      content:    article.content,
      source:     'Constitution of India (English PDF)',
      language:   'en',
      file_name:  fileName,
    });

    if (result.success) {
      console.log('✅');
      succeeded++;
    } else {
      console.log(`❌ ${result.error}`);
      failed++;
      failedDetails.push({ art_no: article.art_no, lang: 'en', error: result.error });
    }
  }

  // ── Step 3: Retry missing Tamil articles ─────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('📗 Checking missing Tamil articles...');
  console.log('═══════════════════════════════════════════════');

  const tamilArticles = extractTamilArticles();
  const missingTamil = tamilArticles.filter(a => {
    const fn = safeFileName(`constitution_tamil_article_${a.art_no}.txt`);
    return !existingFileNames.has(fn);
  });

  console.log(`   Total articles: ${tamilArticles.length}`);
  console.log(`   Already uploaded: ${tamilArticles.length - missingTamil.length}`);
  console.log(`   Missing / failed: ${missingTamil.length}\n`);

  for (const article of missingTamil) {
    const fileName = safeFileName(`constitution_tamil_article_${article.art_no}.txt`);
    process.stdout.write(`   📄 Article ${article.art_no} (TA) ... `);
    retried++;

    const result = await uploadArticle(supabase, {
      title:      `பிரிவு ${article.art_no} - ${article.name || 'இந்திய அரசியலமைப்பு'}`,
      full_title: `இந்திய அரசியலமைப்பு - பிரிவு ${article.art_no}`,
      category:   'Constitutional & Governance',
      content:    article.content,
      source:     'Constitution of India (Tamil PDF)',
      language:   'ta',
      file_name:  fileName,
    });

    if (result.success) {
      console.log('✅');
      succeeded++;
    } else {
      console.log(`❌ ${result.error}`);
      failed++;
      failedDetails.push({ art_no: article.art_no, lang: 'ta', error: result.error });
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('✨ Retry Complete!');
  console.log(`   🔁 Retried   : ${retried}`);
  console.log(`   ✅ Succeeded : ${succeeded}`);
  console.log(`   ❌ Failed    : ${failed}`);
  console.log('═══════════════════════════════════════════════');

  if (failedDetails.length > 0) {
    console.log('\n⚠️  Still failing articles:');
    failedDetails.forEach(d => {
      console.log(`   [${d.lang.toUpperCase()}] Article ${d.art_no}: ${d.error}`);
    });
  } else if (retried === 0) {
    console.log('\n✅ All articles already uploaded — nothing to retry!');
  } else {
    console.log('\n✅ All missing articles successfully uploaded!');
  }
}

retryFailed().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
