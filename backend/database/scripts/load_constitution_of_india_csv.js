/**
 * Replace constitution tables with data from:
 *   database/data/Constitution Of India.csv
 *
 * Clears: constitution_articles, constitution_structured, constitution_parts
 * Then inserts articles from the CSV (single-column export with mixed quoting).
 *
 * Run from backend directory:
 *   node database/scripts/load_constitution_of_india_csv.js
 *   node database/scripts/load_constitution_of_india_csv.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`Loaded .env from: ${envPath}`);
    break;
  }
}

const CSV_PATH = path.join(__dirname, '../data/Constitution Of India.csv');
const DRY = process.argv.includes('--dry-run');

function normArtNo(s) {
  return String(s || '').trim().toUpperCase();
}

function extractArtFromLine(t0) {
  const t = String(t0 || '').replace(/^["'\s]+/, '').trim();
  const m = t.match(/^(\d+[A-Za-z]*)\.\s+/);
  if (!m) return null;

  let artNo = m[1];
  let consumed = m[0].length;
  const rest = t.slice(consumed);
  const cont = /^([A-Z])\s+/.exec(rest);
  if (cont && cont[1].length === 1) {
    const afterCh = rest.slice(cont[0].length);
    const firstWord = (afterCh.match(/^\S+/) || [''])[0];
    if (firstWord.length > 1) {
      artNo += cont[1];
      consumed += cont[0].length;
    }
  }

  return { artNo: normArtNo(artNo), matchLen: consumed };
}

function leadingArtNo(firstLine) {
  const meta = extractArtFromLine(firstLine);
  return meta ? meta.artNo : null;
}

function splitArticleBlocks(lines) {
  const blocks = [];
  let cur = [];

  const flush = () => {
    const joined = cur.join('\n').trim();
    if (joined) blocks.push(joined);
    cur = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    const t = line.trim();

    if (/^Articles$/i.test(t) && cur.length === 0) continue;

    if (/^"\d+[A-Za-z]*\.\s/.test(t)) {
      flush();
      cur = [line];
      continue;
    }

    const meta = extractArtFromLine(t);
    if (meta && /^(\d+[A-Za-z]*)\.\s+[A-Za-z]/.test(t)) {
      if (cur.length) {
        const curNo = leadingArtNo(cur[0]);
        if (curNo && meta.artNo === curNo) {
          cur.push(line);
          continue;
        }
      }
      flush();
      cur = [line];
      continue;
    }

    cur.push(line);
  }
  flush();
  return blocks;
}

function parseArticleBlock(block) {
  let t = block.replace(/^["'\s]+/, '').trim();
  t = t.replace(/["'\s]+$/, '').trim();

  const meta = extractArtFromLine(t);
  if (!meta) return null;

  const artNo = meta.artNo;
  const after = t.slice(meta.matchLen).trim();

  let name = after;
  const cut = name.search(/\.\s+/);
  if (cut > 8 && cut < 240) name = name.slice(0, cut);
  name = name.replace(/\s+/g, ' ').trim();
  if (!name) name = `Article ${artNo}`;
  if (name.length > 500) name = name.slice(0, 497) + '...';

  return {
    art_no: artNo,
    name,
    art_desc: t,
    article_id: `Article ${artNo} of Indian Constitution`,
    article_desc: t,
  };
}

function parseAllFromFile() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split(/\n/);
  const blocks = splitArticleBlocks(lines);
  const seen = new Map();

  for (const b of blocks) {
    const row = parseArticleBlock(b);
    if (!row) {
      console.warn('Skip block (unparseable):', b.slice(0, 90).replace(/\n/g, ' '));
      continue;
    }
    if (seen.has(row.art_no)) {
      console.warn('Duplicate art_no ' + row.art_no + ' - keeping longer text');
      const prev = seen.get(row.art_no);
      if ((row.art_desc || '').length > (prev.art_desc || '').length) seen.set(row.art_no, row);
    } else {
      seen.set(row.art_no, row);
    }
  }

  const parsed = [...seen.values()];
  parsed.sort((a, b) => {
    const an = parseInt(a.art_no, 10) || 0;
    const bn = parseInt(b.art_no, 10) || 0;
    if (an !== bn) return an - bn;
    return String(a.art_no).localeCompare(String(b.art_no), undefined, { numeric: true });
  });
  return parsed;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH);
    process.exit(1);
  }

  const parsed = parseAllFromFile();
  console.log(`Parsed ${parsed.length} unique articles from CSV`);

  if (DRY) {
    console.log('Dry run: no database changes.');
    const sample = ['1', '21', '51A', '243Z', '243ZA', '372', '372A', '393', '395'];
    for (const s of sample) {
      const hit = parsed.find((p) => p.art_no === s);
      console.log(`  ${s}:`, hit ? `${hit.name.slice(0, 60)}...` : '(missing)');
    }
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Deleting all rows in constitution_articles, constitution_structured, constitution_parts...');

  const delA = await supabase.from('constitution_articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delA.error) {
    console.error('constitution_articles delete:', delA.error.message);
    process.exit(1);
  }

  const delS = await supabase.from('constitution_structured').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delS.error) {
    console.error('constitution_structured delete:', delS.error.message);
    process.exit(1);
  }

  const delP = await supabase.from('constitution_parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delP.error) console.warn('constitution_parts delete:', delP.error.message);

  const batchSize = 80;
  let ok = 0;
  let err = 0;

  for (let i = 0; i < parsed.length; i += batchSize) {
    const slice = parsed.slice(i, i + batchSize);

    const structuredRows = slice.map((r) => ({
      art_no: r.art_no,
      name: r.name,
      art_desc: r.art_desc,
      status: null,
      sub_heading: null,
      part_no: null,
      part_name: null,
      clauses: null,
      explanations: null,
    }));

    const { error: e1 } = await supabase.from('constitution_structured').insert(structuredRows);
    if (e1) {
      console.error(`constitution_structured batch ${i}:`, e1.message);
      err += slice.length;
      continue;
    }

    const articleRows = slice.map((r) => ({
      article_id: r.article_id,
      article_desc: r.article_desc,
    }));

    const { error: e2 } = await supabase.from('constitution_articles').insert(articleRows);
    if (e2) {
      console.error(`constitution_articles batch ${i}:`, e2.message);
      err += slice.length;
      continue;
    }

    ok += slice.length;
    console.log(`  inserted ${ok}/${parsed.length}`);
  }

  console.log(`Done. Inserted ${ok} rows per table; batch errors: ${err}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
