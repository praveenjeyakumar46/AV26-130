/**
 * Constitution Service
 * Handles constitution data queries from Supabase
 */

import { getSupabaseClient } from '../utils/supabase';
import logger from '../config/logger';
import { ConstitutionArticle, ConstitutionStructured } from '../models/Constitution';

export interface ConstitutionSearchResult {
  articles: ConstitutionArticle[];
  structured: ConstitutionStructured[];
  total: number;
}

/**
 * Extract article number from CSV article_id
 * Examples: "Article 1 of Indian Constitution" -> "1"
 *           "Article 2A of Indian Constitution" -> "2A"
 *           "Article 395 of Indian Constitution" -> "395"
 */
function extractArtNoFromArticleId(articleId: string): string {
  const match = articleId.match(/Article\s+(\d+[A-Z]?)/i);
  return match ? match[1] : '';
}

/**
 * Get all constitution articles with pagination
 * Merges data from both constitution_structured (COI.json) and constitution_articles (CSV)
 * Prioritizes structured data when duplicates exist
 */
export async function getAllConstitutionArticles(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{
  articles: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    const supabase = getSupabaseClient();
    const offset   = (page - 1) * limit;

    // ── Step 1: Try constitution_structured (COI.json) ──────────────────────
    let structuredQuery = supabase.from('constitution_structured').select('*');
    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      structuredQuery = structuredQuery.or(`art_no.ilike.${s},name.ilike.${s},art_desc.ilike.${s}`);
    }
    const { data: structuredData, error: structuredError } = await structuredQuery;
    if (structuredError) logger.warn('constitution_structured query failed:', structuredError.message);

    // ── Step 2: Try constitution_articles (CSV) ──────────────────────────────
    let csvQuery = supabase.from('constitution_articles').select('*');
    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      csvQuery = csvQuery.or(`article_id.ilike.${s},article_desc.ilike.${s}`);
    }
    const { data: csvData, error: csvError } = await csvQuery;
    if (csvError) logger.warn('constitution_articles query failed:', csvError.message);

    // ── Step 3: Build merged article map ──────────────────────────────────────
    const articleMap = new Map<string, any>();

    // Priority 1: structured JSON data
    (structuredData || []).forEach((item: any) => {
      if (item.art_no) articleMap.set(item.art_no, { source: 'structured', art_no: item.art_no, data: item });
    });

    // Priority 2: CSV data (only if not already from structured)
    (csvData || []).forEach((item: any) => {
      const artNo = extractArtNoFromArticleId(item.article_id);
      if (artNo && !articleMap.has(artNo)) {
        articleMap.set(artNo, { source: 'csv', art_no: artNo, data: item });
      }
    });

    // ── Step 4: Sort numerically ──────────────────────────────────────────────
    const merged = Array.from(articleMap.values()).sort((a, b) => {
      const an = parseInt(a.art_no) || 0;
      const bn = parseInt(b.art_no) || 0;
      if (an !== bn) return an - bn;
      return String(a.art_no).localeCompare(String(b.art_no), undefined, { numeric: true });
    });

    // ── Step 5: Filter omitted-with-no-content BEFORE formatting ───────────────
    // We check the RAW data here because formatStructuredArticle() always
    // prepends the article name, making article_desc look non-empty even
    // when there is genuinely no legal text.
    const filteredMerged = merged.filter((item: any) => {
      if (item.source === 'structured') {
        const d = item.data;
        if (d.status === 'Omitted') {
          const hasDesc     = typeof d.art_desc === 'string' && d.art_desc.trim().length > 10;
          const hasClauses  = Array.isArray(d.clauses) && d.clauses.length > 0;
          const hasExpls    = Array.isArray(d.explanations) && d.explanations.length > 0;
          return hasDesc || hasClauses || hasExpls;
        }
      }
      // CSV rows have no status field — keep them all
      return true;
    });

    // ── Step 6: Format for frontend ───────────────────────────────────────────
    const formattedArticles = filteredMerged.map((item: any) => {
      if (item.source === 'structured') {
        return {
          article_id:  `Article ${item.data.art_no}`,
          article_desc: formatStructuredArticle(item.data),
          art_no:      item.data.art_no,
          name:        item.data.name,
          art_desc:    item.data.art_desc,
          status:      item.data.status,
          sub_heading: item.data.sub_heading,
          part_no:     item.data.part_no,
          part_name:   item.data.part_name,
          clauses:     item.data.clauses,
          explanations: item.data.explanations,
          source:      'structured',
        };
      }

      if (item.source === 'csv') {
        const artNo = extractArtNoFromArticleId(item.data.article_id);
        return {
          article_id:  item.data.article_id,
          article_desc: item.data.article_desc,
          art_no:      artNo,
          name:        null,
          art_desc:    item.data.article_desc,
          status:      null,
          sub_heading: null,
          part_no:     null,
          part_name:   null,
          clauses:     null,
          explanations: null,
          source:      'csv',
        };
      }

      // fallback (should not normally reach here)
      return null;
    }).filter(Boolean);

    logger.info(
      `Constitution EN: ${structuredData?.length || 0} structured + ` +
      `${csvData?.length || 0} CSV → ${filteredMerged.length} after omitted filter → page ${page}`
    );

    const total      = formattedArticles.length;
    const totalPages = Math.ceil(total / limit);
    const paginated  = formattedArticles.slice(offset, offset + limit);

    return { articles: paginated, total, page, limit, totalPages };
  } catch (error) {
    logger.error('Error in getAllConstitutionArticles:', error);
    throw error;
  }
}

/**
 * Format structured article data for display
 * Combines all parts: description, clauses, sub-clauses, and explanations
 */
function formatStructuredArticle(item: any): string {
  let formatted = '';

  // Add article name as title
  if (item.name) {
    formatted += `${item.name}\n\n`;
  }

  // Add sub-heading if available
  if (item.sub_heading) {
    formatted += `${item.sub_heading}\n\n`;
  }

  // Add article description if available (this is the main content)
  if (item.art_desc) {
    formatted += `${item.art_desc}\n\n`;
  }

  // Add clauses if available
  if (item.clauses && Array.isArray(item.clauses) && item.clauses.length > 0) {
    for (const clause of item.clauses) {
      if (clause.ClauseNo && clause.ClauseDesc) {
        formatted += `Clause ${clause.ClauseNo}: ${clause.ClauseDesc}`;
        
        // Add sub-clauses if available
        if (clause.SubClauses && Array.isArray(clause.SubClauses) && clause.SubClauses.length > 0) {
          formatted += '\n';
          for (const subClause of clause.SubClauses) {
            if (subClause.SubClauseNo && subClause.SubClauseDesc) {
              formatted += `  (${subClause.SubClauseNo}) ${subClause.SubClauseDesc}\n`;
            }
          }
        }
        formatted += '\n\n';
      }
    }
  }

  // Add explanations if available
  if (item.explanations && Array.isArray(item.explanations) && item.explanations.length > 0) {
    for (const explanation of item.explanations) {
      if (explanation.ExplanationNo && explanation.Explanation) {
        formatted += `Explanation ${explanation.ExplanationNo}: ${explanation.Explanation}\n\n`;
      }
    }
  }

  // Add part information if available
  if (item.part_name) {
    formatted += `[Part ${item.part_no}: ${item.part_name}]`;
  }

  // Add status if omitted
  if (item.status === 'Omitted') {
    formatted += `\n[Status: Omitted]`;
  }

  return formatted.trim();
}

/**
 * Search constitution articles by keyword
 */
export async function searchConstitutionArticles(
  query: string,
  limit: number = 10
): Promise<ConstitutionSearchResult> {
  try {
    const supabase = getSupabaseClient();
    const searchTerm = `%${query}%`;

    // Search in constitution_articles table
    const { data: articles, error: articlesError } = await supabase
      .from('constitution_articles')
      .select('*')
      .or(`article_id.ilike.${searchTerm},article_desc.ilike.${searchTerm}`)
      .limit(limit);

    if (articlesError) {
      logger.error('Error searching constitution articles:', articlesError);
    }

    // Search in constitution_structured table
    const { data: structured, error: structuredError } = await supabase
      .from('constitution_structured')
      .select('*')
      .or(`art_no.ilike.${searchTerm},name.ilike.${searchTerm},art_desc.ilike.${searchTerm}`)
      .limit(limit);

    if (structuredError) {
      logger.error('Error searching constitution structured:', structuredError);
    }

    // Search in legal_documents table (Central Acts PDFs)
    const { data: legalDocs, error: legalDocsError } = await supabase
      .from('legal_documents')
      .select('*')
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},category.ilike.${searchTerm}`)
      .limit(limit);

    if (legalDocsError) {
      // Table may not exist yet — warn but don't throw
      logger.warn('Error searching legal_documents (run migration 007 if table missing):', legalDocsError.message);
    }

    // Map legal_documents rows into ConstitutionArticle shape for context building
    const legalDocArticles: ConstitutionArticle[] = (legalDocs || []).map((doc: any) => ({
      id: doc.id,
      article_id: doc.title,
      article_desc: doc.content.substring(0, 500) + (doc.content.length > 500 ? '...' : ''),
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));

    const allArticles = [...(articles || []), ...legalDocArticles] as ConstitutionArticle[];

    return {
      articles: allArticles,
      structured: (structured || []) as ConstitutionStructured[],
      total: allArticles.length + (structured?.length || 0),
    };
  } catch (error) {
    logger.error('Error in searchConstitutionArticles:', error);
    throw error;
  }
}

/**
 * Get constitution article by ID
 */
export async function getConstitutionArticleById(
  articleId: string
): Promise<ConstitutionArticle | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('constitution_articles')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (error) {
      logger.error('Error fetching constitution article:', error);
      return null;
    }

    return data as ConstitutionArticle;
  } catch (error) {
    logger.error('Error in getConstitutionArticleById:', error);
    return null;
  }
}

/**
 * Get constitution structured data by article number
 */
export async function getConstitutionStructuredByArtNo(
  artNo: string
): Promise<ConstitutionStructured | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('constitution_structured')
      .select('*')
      .eq('art_no', artNo)
      .single();

    if (error) {
      logger.error('Error fetching constitution structured:', error);
      return null;
    }

    return data as ConstitutionStructured;
  } catch (error) {
    logger.error('Error in getConstitutionStructuredByArtNo:', error);
    return null;
  }
}

/**
 * Build context from constitution search results for LLM
 * Only includes article references, not full content
 */
export function buildConstitutionContext(
  results: ConstitutionSearchResult
): string {
  let context = 'Relevant Constitution Articles (for reference only - do not quote full content):\n\n';

  // Add articles - only article IDs and brief descriptions
  for (const article of results.articles.slice(0, 5)) {
    // Extract just the article number and a brief summary
    const articleNo = article.article_id.replace('Article ', '').replace(' of Indian Constitution', '');
    const briefDesc = article.article_desc.substring(0, 150) + (article.article_desc.length > 150 ? '...' : '');
    context += `Article ${articleNo}: ${briefDesc}\n\n`;
  }

  // Add structured data - only article numbers and names
  for (const structured of results.structured.slice(0, 5)) {
    context += `Article ${structured.art_no} - ${structured.name}`;
    if (structured.art_desc) {
      // Only include first 150 chars of description
      const briefDesc = structured.art_desc.substring(0, 150) + (structured.art_desc.length > 150 ? '...' : '');
      context += `: ${briefDesc}`;
    }
    context += '\n\n';
  }

  context += 'Note: Reference these articles when relevant, but do NOT quote their full content in your response.';

  return context;
}
