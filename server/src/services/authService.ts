import crypto from 'node:crypto';
import { config } from '../env.js';
import { db } from '../db/index.js';
import { randomToken, safeEqual } from './password.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../../shared/constants.js';

/**
 * Бессерверные (stateless) сессии: вся информация лежит в самой куке
 * «payload.signature», подписанной HMAC секретом сервера.
 *
 * Зачем: на Vercel сайт обслуживают несколько независимых копий сервера без
 * общего диска. Сессии в базе одной копии невидимы другой → 401 и выкидывание
 * из админки. Подписанную куку проверяет ЛЮБАЯ копия мгновенно: нужен только
 * секрет, а он одинаков у всех (из SESSION_SECRET или выводится из
 * ADMIN_PASSWORD_HASH — см. env.ts).
 *
 * CSRF: кука `titan_csrf` открыта для JS (double-submit), но сверяется с
 * csrf-токеном ВНУТРИ подписанной куки — подделать без секрета невозможно.
 */
export interface SessionRecord {
  csrfToken: string;
  expiresAt: string;
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', config.sessionSecret)
    .update(`titan-session:${payload}`)
    .digest('base64url');
}

export function createSession(): { token: string; csrfToken: string; expiresAt: Date } {
  const csrfToken = randomToken(24);
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600 * 1000);
  const payload = Buffer.from(
    JSON.stringify({ csrf: csrfToken, exp: expiresAt.getTime() }),
    'utf8',
  ).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, csrfToken, expiresAt };
}

export function findSession(token: string): SessionRecord | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      csrf?: unknown;
      exp?: unknown;
    };
    if (typeof data.csrf !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp <= Date.now()) return null;
    return { csrfToken: data.csrf, expiresAt: new Date(data.exp).toISOString() };
  } catch {
    return null;
  }
}

/** Куку очищает клиент; отозвать подпись на сервере не нужно — она истекает сама. */
export function destroySession(_token: string): void {
  /* no-op для stateless-сессий */
}

/** Сверяет CSRF-токен из заголовка с токеном сессии. */
export function isValidCsrf(session: SessionRecord, headerToken: string | undefined): boolean {
  if (!headerToken) return false;
  return safeEqual(session.csrfToken, headerToken);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const CSRF_COOKIE_NAME = CSRF_COOKIE;

/* ----------------------------- Ограничение попыток входа ----------------------------- */

interface AttemptRow {
  ip: string;
  attempts: number;
  window_started_at: string;
  locked_until: string | null;
}

export interface LoginGuard {
  blocked: boolean;
  retryAfterSeconds: number;
}

export function checkLoginGuard(ip: string): LoginGuard {
  const row = db.prepare('SELECT * FROM login_attempts WHERE ip = ?').get(ip) as
    | AttemptRow
    | undefined;
  if (!row) return { blocked: false, retryAfterSeconds: 0 };

  if (row.locked_until) {
    const until = new Date(row.locked_until).getTime();
    if (until > Date.now()) {
      return { blocked: true, retryAfterSeconds: Math.ceil((until - Date.now()) / 1000) };
    }
    db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const windowStart = new Date(row.window_started_at).getTime();
  const windowMs = config.loginWindowMinutes * 60 * 1000;
  if (Date.now() - windowStart > windowMs) {
    db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (row.attempts >= config.loginMaxAttempts) {
    const lockedUntil = new Date(Date.now() + config.loginLockMinutes * 60 * 1000).toISOString();
    db.prepare('UPDATE login_attempts SET locked_until = ? WHERE ip = ?').run(lockedUntil, ip);
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(config.loginLockMinutes * 60),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export function registerFailedLogin(ip: string): void {
  const row = db.prepare('SELECT * FROM login_attempts WHERE ip = ?').get(ip) as
    | AttemptRow
    | undefined;
  const now = Date.now();
  const windowMs = config.loginWindowMinutes * 60 * 1000;

  if (!row) {
    db.prepare(
      'INSERT INTO login_attempts (ip, attempts, window_started_at, locked_until) VALUES (?, ?, ?, NULL)',
    ).run(ip, 1, new Date(now).toISOString());
    return;
  }

  const windowStart = new Date(row.window_started_at).getTime();
  if (now - windowStart > windowMs) {
    db.prepare(
      'UPDATE login_attempts SET attempts = ?, window_started_at = ?, locked_until = NULL WHERE ip = ?',
    ).run(1, new Date(now).toISOString(), ip);
    return;
  }

  db.prepare('UPDATE login_attempts SET attempts = attempts + 1 WHERE ip = ?').run(ip);
}

export function resetLoginAttempts(ip: string): void {
  db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
}
