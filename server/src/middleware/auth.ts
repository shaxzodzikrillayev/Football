import type { NextFunction, Request, Response } from 'express';
import {
  findSession,
  isValidCsrf,
  type SessionRecord,
} from '../services/authService.js';
import { SESSION_COOKIE } from '../../../shared/constants.js';
import { forbidden, unauthorized } from './errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionRecord;
    }
  }
}

/** Кладёт валидную сессию в req.session, если cookie корректна. */
export function attachSession(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  if (token) {
    const session = findSession(token);
    if (session) req.session = session;
  }
  next();
}

/** Закрывает административные разделы для неавторизованных пользователей. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session) {
    next(unauthorized('Сессия не найдена или истекла'));
    return;
  }
  next();
}

/**
 * CSRF-защита изменяющих запросов: double-submit + сверка с токеном сессии.
 * Дополнительно проверяется Origin, если браузер его прислал.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  const session = req.session;
  if (!session) {
    next(unauthorized());
    return;
  }

  const header = req.get('x-csrf-token') ?? undefined;
  if (!isValidCsrf(session, header)) {
    next(forbidden('Недействительный CSRF-токен. Обновите страницу и войдите заново.'));
    return;
  }

  const origin = req.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const requestHost = req.get('host');
      if (originHost && requestHost && originHost !== requestHost) {
        next(forbidden('Запрос отклонён: несовпадение источника'));
        return;
      }
    } catch {
      next(forbidden('Запрос отклонён: некорректный источник'));
      return;
    }
  }

  next();
}
