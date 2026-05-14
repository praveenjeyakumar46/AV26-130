/**
 * Judgement Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  searchJudgements,
  getJudgementById,
  getSimilarJudgements,
  getJudgementStats,
} from '../services/judgementService';
import logger from '../config/logger';

// GET /api/judgements?query=&court=&year=&act=&topic=&page=&limit=&sort=
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, court, year, act, topic, page, limit, sort } = req.query;
    const results = await searchJudgements({
      query:  query  as string,
      court:  court  as string,
      year:   year   as string,
      act:    act    as string,
      topic:  topic  as string,
      page:   Number(page)  || 1,
      limit:  Number(limit) || 10,
      sort:   (sort as any) || 'recent',
    });
    res.json({ success: true, data: results });
  } catch (err) {
    logger.error('judgement search error:', err);
    next(err);
  }
}

// GET /api/judgements/:id
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const judgement = await getJudgementById(id);
    if (!judgement) {
      return res.status(404).json({ success: false, message: 'Judgement not found' });
    }
    res.json({ success: true, data: judgement });
  } catch (err) {
    logger.error('getById error:', err);
    next(err);
  }
}

// GET /api/judgements/:id/similar
export async function getSimilar(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const similar = await getSimilarJudgements(id, 5);
    res.json({ success: true, data: similar });
  } catch (err) {
    logger.error('getSimilar error:', err);
    next(err);
  }
}

// GET /api/judgements/stats
export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getJudgementStats();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('stats error:', err);
    next(err);
  }
}
