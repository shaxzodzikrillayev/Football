import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { HttpError } from './errors.js';
import { config } from '../env.js';

export function notFoundHandler(req: Request, res: Response): void {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Метод API не найден' });
    return;
  }
  res.status(404).json({ error: 'Страница не найдена' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const mb = Math.round(config.maxUploadBytes / (1024 * 1024));
      res.status(400).json({ error: `Файл слишком большой. Максимальный размер — ${mb} МБ` });
      return;
    }
    res.status(400).json({ error: 'Не удалось загрузить файл' });
    return;
  }

  console.error('[api] необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
