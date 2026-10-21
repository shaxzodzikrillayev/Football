import crypto from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

/** Создаёт scrypt-хеш пароля в формате scrypt$N$r$p$salt$hash. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

/** Проверяет пароль против хеша. Возвращает false при любой ошибке формата. */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.trim().split('$');
    if (parts.length !== 6) return false;
    const [scheme, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
    if (scheme !== 'scrypt') return false;

    const N = Number.parseInt(nRaw, 10);
    const r = Number.parseInt(rRaw, 10);
    const p = Number.parseInt(pRaw, 10);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

    const salt = Buffer.from(saltRaw, 'base64');
    const expected = Buffer.from(hashRaw, 'base64');
    const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p });

    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** HMAC-подпись токена сессии — в базу попадает только подпись. */
export function signToken(token: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
