import { Router } from 'express';
import { search, getById, getSimilar, stats } from '../controllers/judgementController';

const router = Router();

// GET /api/judgements/stats  — must come before /:id
router.get('/stats', stats);

// GET /api/judgements?query=...
router.get('/', search);

// GET /api/judgements/:id
router.get('/:id', getById);

// GET /api/judgements/:id/similar
router.get('/:id/similar', getSimilar);

export default router;
