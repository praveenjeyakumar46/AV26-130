/**
 * Constitution Controller
 * Handles constitution-related HTTP requests
 *
 * Routing logic:
 *   ?lang=en (default) → Supabase structured DB  (English)
 *   ?lang=ta           → PDF extraction service  (Tamil)
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getAllConstitutionArticles } from '../services/constitutionService';
import {
  getConstitutionPdfArticles,
  invalidatePdfCache,
} from '../services/constitutionPdfService';
import logger from '../config/logger';

// ── GET /api/constitution/articles ────────────────────────────────────────────
/**
 * Query params:
 *   page   – page number            (default 1)
 *   limit  – articles per page      (default 10)
 *   search – full-text search term  (optional)
 *   lang   – "en" | "ta"            (default "en")
 */
export const getArticles = asyncHandler(async (req: Request, res: Response) => {
  const page   = parseInt(req.query.page  as string) || 1;
  const limit  = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string | undefined;
  const lang   = (req.query.lang as string | undefined)?.toLowerCase();

  // ── Tamil: serve from PDF ─────────────────────────────────────────────────
  if (lang === 'ta') {
    try {
      const result = await getConstitutionPdfArticles('ta', page, limit, search);

      return res.json({
        success: true,
        data: result.articles,
        pagination: {
          page:        result.page,
          limit:       result.limit,
          total:       result.total,
          total_pages: result.totalPages,
        },
        meta: {
          language: 'ta',
          source:   'pdf',
        },
      });
    } catch (error) {
      logger.error('Error serving Tamil constitution PDF:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  // ── English (default): serve from Supabase ────────────────────────────────
  try {
    const result = await getAllConstitutionArticles(page, limit, search);

    return res.json({
      success: true,
      data: result.articles,
      pagination: {
        page:        result.page,
        limit:       result.limit,
        total:       result.total,
        total_pages: result.totalPages,
      },
      meta: {
        language: 'en',
        source:   'database',
      },
    });
  } catch (error) {
    logger.error('Error in getArticles (English):', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ── GET /api/constitution/acts ──────────────────────────────────────────────────
/**
 * Fetch Central Acts from legal_documents table
 * Query params:
 *   page     – page number           (default 1)
 *   limit    – acts per page         (default 20)
 *   search   – search in title/content
 *   category – filter by category
 */
export const getActs = asyncHandler(async (req: Request, res: Response) => {
  const page     = parseInt(req.query.page     as string) || 1;
  const limit    = parseInt(req.query.limit    as string) || 20;
  const search   = (req.query.search   as string || '').trim();
  const category = (req.query.category as string || '').trim();

  try {
    const { getSupabaseClient } = await import('../utils/supabase');
    const supabase = getSupabaseClient();
    const offset   = (page - 1) * limit;

    // Build count query
    let countQuery = supabase
      .from('legal_documents')
      .select('id', { count: 'exact', head: true })
      .neq('source', 'Constitution of India (English PDF)')
      .neq('source', 'Constitution of India (Tamil PDF)');

    if (search)   countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    if (category) countQuery = countQuery.eq('category', category);

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Build data query (no content in list — too heavy; fetch on detail)
    let dataQuery = supabase
      .from('legal_documents')
      .select('id, title, full_title, category, source, language, file_name, content')
      .neq('source', 'Constitution of India (English PDF)')
      .neq('source', 'Constitution of India (Tamil PDF)')
      .order('category', { ascending: true })
      .order('title',    { ascending: true })
      .range(offset, offset + limit - 1);

    if (search)   dataQuery = dataQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    if (category) dataQuery = dataQuery.eq('category', category);

    const { data, error: dataError } = await dataQuery;
    if (dataError) throw dataError;

    // Fetch distinct categories for filter dropdown
    const { data: catData } = await supabase
      .from('legal_documents')
      .select('category')
      .neq('source', 'Constitution of India (English PDF)')
      .neq('source', 'Constitution of India (Tamil PDF)');

    const categories = [...new Set((catData || []).map((r: any) => r.category).filter(Boolean))].sort();

    const total      = count || 0;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      success:    true,
      data:       data || [],
      pagination: { page, limit, total, total_pages: totalPages },
      categories,
    });
  } catch (error) {
    logger.error('Error in getActs:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      success: false,
      error:   error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ── POST /api/constitution/cache/invalidate ───────────────────────────────────
/**
 * Invalidate the in-memory PDF cache so updated PDFs are re-parsed.
 * Body (optional): { "lang": "en" | "ta" }
 */
export const invalidateCache = asyncHandler(
  async (req: Request, res: Response) => {
    const lang = req.body?.lang as 'en' | 'ta' | undefined;
    invalidatePdfCache(lang);
    return res.json({
      success: true,
      message: lang
        ? `PDF cache invalidated for language: ${lang}`
        : 'PDF cache invalidated for all languages',
    });
  }
);
