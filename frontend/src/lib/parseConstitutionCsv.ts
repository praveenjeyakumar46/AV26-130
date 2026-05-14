/**
 * Parses `Constitution Of India.csv` (same layout as backend/database/scripts/load_constitution_of_india_csv.js).
 */

export interface ParsedConstitutionArticle {
  art_no: string;
  name: string;
  art_desc: string;
  article_id: string;
  article_desc: string;
}

function normArtNo(s: string): string {
  return String(s || '').trim().toUpperCase();
}

function extractArtFromLine(t0: string): { artNo: string; matchLen: number } | null {
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

function leadingArtNo(firstLine: string): string | null {
  const meta = extractArtFromLine(firstLine);
  return meta ? meta.artNo : null;
}

function splitArticleBlocks(lines: string[]): string[] {
  const blocks: string[] = [];
  let cur: string[] = [];

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

function parseArticleBlock(block: string): ParsedConstitutionArticle | null {
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

export function parseConstitutionCsv(raw: string): ParsedConstitutionArticle[] {
  const lines = raw.split(/\n/);
  const blocks = splitArticleBlocks(lines);
  const seen = new Map<string, ParsedConstitutionArticle>();

  for (const b of blocks) {
    const row = parseArticleBlock(b);
    if (!row) continue;
    if (seen.has(row.art_no)) {
      const prev = seen.get(row.art_no)!;
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
