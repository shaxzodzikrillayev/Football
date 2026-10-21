import { config } from '../env.js';
import { db, nowIso } from '../db/index.js';
import { randomToken, safeEqual, signToken } from './password.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../../shared/constants.js';

export interface SessionRecord {
  id: number;
  tokenHash: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
}

interface SessionRow {
  id: number;
  token_hash: string;
  csrf_token: string;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

function rowToSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    csrfToken: row.csrf_token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    ip: row.ip,
    userAgent: row.user_agent,
  };
}

export function createSession(ip: string | null, userAgent: string | null): {
  token: string;
  csrfToken: string;
  expiresAt: Date;
} {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const tokenHash = signToken(token, config.sessionSecret);
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600 * 1000);

  db.prepare(
    `INSERT INTO sessions (token_hash, csrf_token, created_at, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(tokenHash, csrfToken, nowIso(), expiresAt.toISOString(), ip, userAgent);

  return { token, csrfToken, expiresAt };
}

export function findSession(token: string): SessionRecord | null {
  if (!token) return null;
  const tokenHash = signToken(token, config.sessionSecret);
  const row = db
    .prepare('SELECT * FROM sessions WHERE token_hash = ?')
    .get(tokenHash) as SessionRow | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
    return null;
  }
  return rowToSession(row);
}

export function destroySession(token: string): void {
  if (!token) return;
  const tokenHash = signToken(token, config.sessionSecret);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function destroyAllSessions(): void {
  db.prepare('DELETE FROM sessions').run();
}

export function purgeExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
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
