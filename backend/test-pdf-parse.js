/**
 * Quick test: verifies pdf-parse is installed and can read both constitution PDFs.
 * Run from the backend folder:
 *   node test-pdf-parse.js
 */

const fs       = require('fs');
const path     = require('path');
const pdfParse = require('pdf-parse');

const DATA_DIR = path.join(__dirname, 'database', 'data');
const EN_PDF   = path.join(DATA_DIR, 'constitution_english.pdf');
const TA_PDF   = path.join(DATA_DIR, 'constitution_tamil.pdf');

// ANSI colours
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
const ok   = (m) => console.log(`${G}  ✔  ${m}${X}`);
const fail = (m) => console.log(`${R}  ✘  ${m}${X}`);
const info = (m) => console.log(`${C}  ℹ  ${m}${X}`);
const warn = (m) => console.log(`${Y}  ⚠  ${m}${X}`);
const hr   = ()  => console.log('─'.repeat(60));

async function testPdf(label, pdfPath) {
  console.log(`\n${C}── ${label} ──${X}`);

  if (!fs.existsSync(pdfPath)) {
    fail(`File not found: ${pdfPath}`);
    return { pass: false };
  }
  ok(`File found  : ${path.basename(pdfPath)}`);

  const bytes = fs.statSync(pdfPath).size;
  info(`File size   : ${(bytes / 1024).toFixed(1)} KB`);

  let result;
  try {
    result = await pdfParse(fs.readFileSync(pdfPath));
    ok('pdf-parse   : no errors');
  } catch (e) {
    fail(`pdf-parse threw: ${e.message}`);
    return { pass: false };
  }

  const text  = result.text || '';
  const pages = result.numpages;
  const chars = text.length;
  info(`Pages       : ${pages}`);
  info(`Chars       : ${chars.toLocaleString()}`);

  if (chars < 500) {
    warn('Very little text — PDF may be scanned/image-based (needs OCR).');
    return { pass: false, tscii: false };
  }
  ok('Text extraction healthy');

  // Detect language / encoding
  const tamilUnicode = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const isTA         = pdfPath === TA_PDF;

  if (isTA) {
    info(`Tamil Unicode chars: ${tamilUnicode}`);
    if (tamilUnicode < 500) {
      warn('Tamil PDF uses LEGACY TSCII encoding (not Unicode).');
      warn('The backend will serve chunks but text will appear garbled in browser.');
      warn('FIX: Replace constitution_tamil.pdf with a Unicode Tamil PDF,');
      warn('     then call  POST /api/constitution/cache/invalidate');
      console.log(`\n  ${Y}Preview (200 chars):${X}`);
      console.log(`  "${text.replace(/\s+/g,' ').slice(0,200)}..."\n`);
      return { pass: true, tscii: true };
    } else {
      ok(`Unicode Tamil confirmed (${tamilUnicode} chars)`);
    }
  }

  // Count article markers
  let markerCount = 0;
  let markerLabel = '';
  if (!isTA) {
    // English: content articles have em-dash (—)
    const matches = text.match(/^\d+[A-Z]?\.\s+.+[—–]/gm) || [];
    markerCount = matches.length;
    markerLabel = '"<n>. Title—" (em-dash content articles)';
    if (markerCount >= 200) {
      ok(`${markerCount} article markers found  → splitting will work correctly`);
    } else {
      warn(`Only ${markerCount} article markers — check PDF format`);
    }
  } else {
    // Count common Tamil article/section markers (பிரிவு, சட்டப்பிரிவு, கட்டுரை + number)
    const m1 = (text.match(/பிரிவு\s+\d+/g)               || []).length;
    const m2 = (text.match(/சட்டப்பிரிவு\s+\d+/g)         || []).length;
    const m3 = (text.match(/கட்டுரை\s*\d+/g)              || []).length;
    markerCount = m1 + m2 + m3;
    markerLabel = 'Tamil article/section markers';
    info(`Tamil article markers: ${markerCount} (பிரிவு:${m1} சட்டப்பிரிவு:${m2} கட்டுரை:${m3})`);
    if (markerCount < 25) {
      warn('Fewer than 25 Tamil markers — chunk-split fallback will be used');
    } else {
      ok(`${markerCount} Tamil markers — article splitting OK`);
    }
  }

  // Preview
  console.log(`\n  ${Y}Preview (first 300 chars):${X}`);
  console.log(`  "${text.replace(/\s+/g,' ').slice(0,300)}..."\n`);

  return { pass: true, tscii: false };
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  pdf-parse installation & PDF readability test');
  console.log('  Run from:  D:\\VS code codes\\project\\backend\\');
  console.log('═'.repeat(60));

  // Module check
  console.log(`\n${C}── Module check ──${X}`);
  try {
    const pkg = require('./node_modules/pdf-parse/package.json');
    ok(`pdf-parse v${pkg.version} is installed`);
  } catch {
    fail('pdf-parse is NOT installed.  Run:  npm install');
    process.exit(1);
  }

  const en = await testPdf('English Constitution PDF', EN_PDF);
  const ta = await testPdf('Tamil Constitution PDF',   TA_PDF);

  console.log();
  hr();
  console.log('\n  Summary');
  hr();
  console.log(`  English PDF : ${en.pass ? G + 'PASS' : R + 'FAIL'}${X}  (article splitting: ${en.pass && !en.tscii ? G + 'READY' : Y + 'chunk-fallback'}${X})`);
  console.log(`  Tamil PDF   : ${ta.pass ? G + 'PASS' : R + 'FAIL'}${X}  (encoding: ${ta.tscii ? Y + 'LEGACY TSCII — upgrade PDF' : G + 'Unicode OK'}${X})`);
  console.log();

  if (ta.tscii) {
    console.log(`${Y}  Action needed for Tamil:${X}`);
    console.log(`  1. Get a Unicode-based Tamil constitution PDF (e.g. from eci.gov.in or tamilvu.org)`);
    console.log(`  2. Replace  database/data/constitution_tamil.pdf`);
    console.log(`  3. Restart the backend  OR  call:  POST /api/constitution/cache/invalidate`);
    console.log(`  Until then the Tamil section will show a warning banner in the frontend.\n`);
  }

  if (en.pass) {
    ok('English PDF is fully functional. Start the backend with:  npm run dev');
  }
  console.log();
}

main().catch((e) => {
  console.error(`${R}Unexpected error: ${e.message}${X}`);
  process.exit(1);
});
