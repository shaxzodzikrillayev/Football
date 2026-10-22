import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../env.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../../shared/constants.js';
import { verifyPassword } from '../services/password.js';
import {
  checkLoginGuard,
  createSession,
  destroySession,
  registerFailedLogin,
  resetLoginAttempts,
} from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../middleware/errors.js';

export const authRouter = Router();

const GENERIC_ERROR = 'Неверное имя пользователя или пароль';

function clientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

authRouter.post('/login', (req: Request, res: Response) => {
  const ip = clientIp(req);
  const guard = checkLoginGuard(ip);
  if (guard.blocked) {
    res.status(429).json({
      error: 'Слишком много попыток входа. Попробуйте позже.',
      retryAfter: guard.retryAfterSeconds,
    });
    return;
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    res.status(400).json({ error: 'Введите пароль' });
    return;
  }

  if (!verifyPassword(password, config.adminPasswordHash)) {
    registerFailedLogin(ip);
    res.status(401).json({ error: GENERIC_ERROR });
    return;
  }

  resetLoginAttempts(ip);
  const session = createSession(ip, req.get('user-agent') ?? null);
  const maxAge = config.sessionTtlHours * 3600 * 1000;

  res.cookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  res.cookie(CSRF_COOKIE, session.csrfToken, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  res.json({ ok: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt.toISOString() });
});

authRouter.post('/logout', requireAuth, (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  destroySession(token ?? '');
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/session', (req: Request, res: Response) => {
  if (!req.session) {
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    csrfToken: req.session.csrfToken,
    expiresAt: req.session.expiresAt,
  });
});

authRouter.post('/password-check', requireAuth, (req: Request, res: Response) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) throw badRequest('Введите пароль');
  if (!verifyPassword(password, config.adminPasswordHash)) {
    throw unauthorized(GENERIC_ERROR);
  }
  res.json({ ok: true });
});
