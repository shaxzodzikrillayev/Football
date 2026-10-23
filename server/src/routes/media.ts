import { Router } from 'express';
import type { Request, Response } from 'express';
import { getStorage, isSafeKey } from '../services/storage.js';
import { asyncHandler } from '../middleware/async.js';
import { notFound } from '../middleware/errors.js';

export const mediaRouter = Router();

mediaRouter.get(/^\/(.+)$/, asyncHandler(async (req: Request, res: Response) => {
  let key: string;
  try {
    key = decodeURIComponent(req.params[0] ?? '');
  } catch {
    throw notFound('Файл не найден');
  }
  if (!key || !isSafeKey(key)) {
    throw notFound('Файл не найден');
  }

  const storage = getStorage();
  const file = await storage.read(key);
  if (!file) {
    throw notFound('Файл не найден');
  }

  res.set('Content-Type', file.contentType);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  file.stream.on('error', () => {
    if (!res.headersSent) res.status(404).end();
    else res.end();
  });
  file.stream.pipe(res);
}));
