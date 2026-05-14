/**
 * Constitution Routes
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getArticles, getActs, invalidateCache } from '../controllers/constitutionController';

const router = Router();

// Fetch articles
router.get('/articles', getArticles);

// Fetch Central Acts
router.get('/acts', getActs);

// ── Serve Act/Article PDF file ────────────────────────────────────────────────
// GET /api/constitution/acts/pdf?file=<file_name>&download=1
router.get('/acts/pdf', (req: Request, res: Response) => {
  const fileName = req.query.file as string;
  if (!fileName) {
    return res.status(400).json({ success: false, error: 'file query param required' });
  }

  // Security: strip any directory traversal attempts
  const safeFileName = path.basename(fileName);

  // Root folder for Central Acts PDFs
  const actsRoot = path.resolve(__dirname, '../../database/data/Central Acts');

  // Walk subdirectories to find the file
  function findFile(dir: string): string | null {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findFile(fullPath);
          if (found) return found;
        } else if (entry.name === safeFileName) {
          return fullPath;
        }
      }
    } catch (_) {}
    return null;
  }

  const filePath = findFile(actsRoot);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: `PDF not found: ${safeFileName}` });
  }

  const stat = fs.statSync(filePath);
  const download = req.query.download === '1';

  // CORS & embedding headers — allow the frontend dev server to embed this PDF
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', stat.size);
  res.setHeader(
    'Content-Disposition',
    download
      ? `attachment; filename="${safeFileName}"`
      : `inline; filename="${safeFileName}"`
  );

  fs.createReadStream(filePath).pipe(res);
});

// ── Serve Constitution PDF (English or Tamil) ─────────────────────────────────
// GET /api/constitution/pdf?lang=en|ta&download=1
//
// IMPORTANT: browsers strip URL fragments (#page=N) before sending the HTTP
// request, so we cannot rely on them for page navigation. Instead the frontend
// embeds the PDF inside an <iframe> pointing to the PDF.js viewer bundled with
// the browser at  pdfjs-dist/web/viewer.html, OR we accept a ?page= query param
// and set the Content-Disposition so that the browser viewer opens at that page.
// The most reliable cross-browser approach is to expose a /pdf/viewer route that
// redirects to chrome-extension or uses PDF.js. Since that requires shipping
// PDF.js, here we expose the raw PDF with support for the ?page query param in
// the response header (X-Pdf-Page) so our custom iframe wrapper can use it.
router.get('/pdf', (req: Request, res: Response) => {
  const lang     = (req.query.lang as string || 'en').toLowerCase();
  const download = req.query.download === '1';
  const page     = parseInt(req.query.page as string) || 0;

  // Possible PDF locations for constitution (compiled `dist/routes`, `src/routes`, or cwd `backend/`)
  const constitutionRootFromHere = path.resolve(__dirname, '../../database/data');
  const constitutionRootFromCwd  = path.resolve(process.cwd(), 'database/data');
  const constitutionRootBackend  = path.resolve(process.cwd(), 'backend/database/data');

  const names =
    lang === 'ta'
      ? ['constitution_tamil.pdf', 'Constitution Tamil.pdf', 'constitution-tamil.pdf']
      : [
          'constitution_english.pdf',
          'Constitution English.pdf',
          'constitution-english.pdf',
          'constitution.pdf',
        ];

  const roots = [constitutionRootFromHere, constitutionRootFromCwd, constitutionRootBackend];
  const candidates = roots.flatMap((root) => names.map((n) => path.join(root, n)));

  const filePath = candidates.find((p) => fs.existsSync(p));

  if (!filePath) {
    return res.status(404).json({
      success: false,
      error: `Constitution PDF not found for language: ${lang}`,
    });
  }

  const stat         = fs.statSync(filePath);
  const safeFileName = path.basename(filePath);
  const origin       = req.headers.origin || 'http://localhost:5173';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Allow the browser to cache the PDF (it's a static file)
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', stat.size);
  // Pass page number back so the frontend JS can use it after the blob loads
  if (page > 0) res.setHeader('X-Pdf-Page', String(page));
  res.setHeader(
    'Content-Disposition',
    download
      ? `attachment; filename="${safeFileName}"`
      : `inline; filename="${safeFileName}"`
  );

  fs.createReadStream(filePath).pipe(res);
});

// Admin: bust PDF cache
router.post('/cache/invalidate', invalidateCache);

export default router;
