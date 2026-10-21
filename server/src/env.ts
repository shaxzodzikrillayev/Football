import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { projectRoot } from './paths.js';

const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(projectRoot, process.env.UPLOAD_DIR)
  : path.join(projectRoot, 'server', 'uploads');

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(projectRoot, process.env.DATABASE_PATH)
  : path.join(projectRoot, 'data', 'titan.sqlite');

function resolveSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (isProduction) {
    throw new Error(
      'SESSION_SECRET обязателен в production. Сгенерируйте случайную строку: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  console.warn(
    '[env] SESSION_SECRET не задан — используется временный секрет. Сессии сбросятся при перезапуске сервера (это нормально для разработки).',
  );
  return crypto.randomBytes(48).toString('hex');
}

export const config = {
  isProduction,
  port: int(process.env.PORT, 3001),
  projectRoot,
  uploadDir,
  databasePath,
  clientDist: path.join(projectRoot, 'dist', 'client'),
  storageDriver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
  maxUploadBytes: int(process.env.MAX_UPLOAD_MB, 6) * 1024 * 1024,
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH?.trim() ?? '',
  sessionSecret: resolveSessionSecret(),
  sessionTtlHours: int(process.env.SESSION_TTL_HOURS, 72),
  loginMaxAttempts: int(process.env.LOGIN_MAX_ATTEMPTS, 6),
  loginWindowMinutes: int(process.env.LOGIN_WINDOW_MINUTES, 15),
  loginLockMinutes: int(process.env.LOGIN_LOCK_MINUTES, 15),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    region: process.env.S3_REGION ?? 'auto',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    publicUrl: process.env.S3_PUBLIC_URL ?? '',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
  },
};

export function assertServerConfig(): void {
  if (!config.adminPasswordHash) {
    throw new Error(
      [
        'ADMIN_PASSWORD_HASH не задан.',
        'Создайте файл .env (скопируйте .env.example) и сгенерируйте хеш пароля:',
        '  npm run hash-password -- "ваш_пароль"',
        'Затем впишите полученную строку в .env в переменную ADMIN_PASSWORD_HASH.',
      ].join('\n'),
    );
  }
}
