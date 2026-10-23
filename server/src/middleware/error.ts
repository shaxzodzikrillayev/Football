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

  // Ошибки body-parser (битый JSON, слишком большое тело) приходят с полем
  // status. Раньше они превращались в 500 «Внутренняя ошибка сервера».
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status: unknown }).status)
      : Number.NaN;

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    if (status === 413) {
      res.status(413).json({ error: 'Запрос слишком большой' });
      return;
    }
    if (status === 400) {
      res.status(400).json({ error: 'Некорректный запрос: проверьте формат данных' });
      return;
    }
    res.status(status).json({ error: 'Некорректный запрос' });
    return;
  }

  console.error('[api] необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
