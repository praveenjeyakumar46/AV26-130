/**
 * Judgement Service
 * Handles all judgement CRUD and search operations via Supabase.
 */

import { getSupabaseClient } from '../utils/supabase';
import logger from '../config/logger';

export interface Judgement {
  id: string;
  case_title: string;
  citation: string | null;
  court: string;
  judges: string[] | null;
  date: string | null;
  year: number | null;
  full_text: string | null;
  summary: string | null;
  pdf_url: string | null;
  source: string;
  source_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: JudgementMeta;
}

export interface JudgementMeta {
  id: string;
  judgement_id: string;
  legal_topics: string[] | null;
  statutes: string[] | null;
  keywords: string[] | null;
  acts: string[] | null;
  outcome: string | null;
}

export interface JudgementSearchParams {
  query?: string;
  court?: string;
  year?: number | string;
  act?: string;
  topic?: string;
  page?: number;
  limit?: number;
  sort?: 'recent' | 'oldest' | 'relevant';
}

export interface JudgementSearchResult {
  judgements: Judgement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Full-text + filter search over judgements.
 */
export async function searchJudgements(
  params: JudgementSearchParams
): Promise<JudgementSearchResult> {
  const supabase = getSupabaseClient();
  const page  = Math.max(1, Number(params.page)  || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
  const offset = (page - 1) * limit;

  try {
    // ── Build base query ────────────────────────────────────────────────────
    let q = supabase
      .from('legal_documents')
      .select('*, metadata:judgement_metadata(*)', { count: 'exact' })
      .eq('status', 'active');

    // Full-text search using PostgreSQL tsvector
    if (params.query?.trim()) {
      q = q.textSearch(
        'fts',
        params.query.trim().split(/\s+/).join(' & '),
        { config: 'english', type: 'websearch' }
      );
    }

    // Filters
    if (params.court) {
      q = q.ilike('court', `%${params.court}%`);
    }
    if (params.year) {
      q = q.eq('year', Number(params.year));
    }

    // Sort
    if (params.sort === 'oldest') {
      q = q.order('date', { ascending: true, nullsFirst: false });
    } else {
      q = q.order('date', { ascending: false, nullsFirst: false });
    }

    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;
    if (error) throw error;

    // Post-filter by act/topic (metadata filter - simpler than joining)
    let filtered = (data || []) as Judgement[];
    if (params.act) {
      const actLower = params.act.toLowerCase();
      filtered = filtered.filter(j =>
        j.metadata?.acts?.some(a => a.toLowerCase().includes(actLower)) ||
        j.metadata?.statutes?.some(s => s.toLowerCase().includes(actLower))
      );
    }
    if (params.topic) {
      const topicLower = params.topic.toLowerCase();
      filtered = filtered.filter(j =>
        j.metadata?.legal_topics?.some(t => t.toLowerCase().includes(topicLower))
      );
    }

    const total = count ?? filtered.length;
    return {
      judgements: filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    logger.error('searchJudgements error:', err);
    throw err;
  }
}

/**
 * Get single judgement by ID (with metadata).
 */
export async function getJudgementById(id: string): Promise<Judgement | null> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*, metadata:judgement_metadata(*)')
      .eq('id', id)
      .single();
    if (error) {
      logger.warn(`getJudgementById(${id}) not found:`, error.message);
      return null;
    }
    return data as Judgement;
  } catch (err) {
    logger.error('getJudgementById error:', err);
    return null;
  }
}

/**
 * Get similar judgements based on shared legal topics & court.
 */
export async function getSimilarJudgements(
  judgementId: string,
  limit = 5
): Promise<Judgement[]> {
  const supabase = getSupabaseClient();
  try {
    // Get source judgement metadata
    const source = await getJudgementById(judgementId);
    if (!source) return [];

    const topics = source.metadata?.legal_topics || [];
    const court  = source.court;

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*, metadata:judgement_metadata(*)')
      .eq('status', 'active')
      .neq('id', judgementId)
      .eq('court', court)
      .limit(limit * 3); // fetch extra then filter

    if (error) throw error;

    // Sort by shared topics count
    const ranked = ((data || []) as Judgement[])
      .map(j => ({
        j,
        score: (j.metadata?.legal_topics || [])
          .filter(t => topics.includes(t)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.j);

    return ranked;
  } catch (err) {
    logger.error('getSimilarJudgements error:', err);
    return [];
  }
}

/**
 * Get judgement stats for analytics.
 */
export async function getJudgementStats(): Promise<{
  total: number;
  byCourt: { court: string; count: number }[];
  byYear: { year: number; count: number }[];
  recentCount: number;
}> {
  const supabase = getSupabaseClient();
  try {
    const { count: total } = await supabase
      .from('legal_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // By court
    const { data: courtData } = await supabase
      .from('legal_documents')
      .select('court')
      .eq('status', 'active');

    const courtMap: Record<string, number> = {};
    (courtData || []).forEach((r: any) => {
      courtMap[r.court] = (courtMap[r.court] || 0) + 1;
    });
    const byCourt = Object.entries(courtMap)
      .map(([court, count]) => ({ court, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By year
    const { data: yearData } = await supabase
      .from('legal_documents')
      .select('year')
      .eq('status', 'active')
      .not('year', 'is', null);

    const yearMap: Record<number, number> = {};
    (yearData || []).forEach((r: any) => {
      if (r.year) yearMap[r.year] = (yearMap[r.year] || 0) + 1;
    });
    const byYear = Object.entries(yearMap)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => b.year - a.year)
      .slice(0, 10);

    // Recent (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentCount } = await supabase
      .from('legal_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      total: total || 0,
      byCourt,
      byYear,
      recentCount: recentCount || 0,
    };
  } catch (err) {
    logger.error('getJudgementStats error:', err);
    return { total: 0, byCourt: [], byYear: [], recentCount: 0 };
  }
}

/**
 * Search judgements for RAG context (used by chat service).
 */
export async function searchJudgementsForRAG(
  query: string,
  limit = 3
): Promise<string> {
  try {
    const results = await searchJudgements({ query, limit, sort: 'relevant' });
    if (results.total === 0) return '';

    let context = 'Relevant Court Judgements:\n\n';
    for (const j of results.judgements) {
      context += `Case: ${j.case_title}\n`;
      if (j.citation) context += `Citation: ${j.citation}\n`;
      context += `Court: ${j.court}`;
      if (j.date) context += ` | Date: ${j.date}`;
      context += '\n';
      if (j.summary) context += `Summary: ${j.summary.substring(0, 300)}...\n`;
      context += '\n';
    }
    return context;
  } catch (err) {
    logger.error('searchJudgementsForRAG error:', err);
    return '';
  }
}
