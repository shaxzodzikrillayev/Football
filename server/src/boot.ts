import { assertServerConfig } from './env.js';
import { db, runMigrations } from './db/index.js';
import { cloudDb, installCloudSync } from './db/cloudSync.js';
import { ensureUploadDirs } from './services/storage.js';
import { seedDemoData } from './db/seed.js';
import { seedClubValues } from './services/repository.js';

let booted = false;

/**
 * Единая подготовка сервера: конфиг → миграции → (облачная синхронизация) →
 * демо-данные. Идемпотентна, вызывается и локальным запуском, и Vercel-функцией.
 */
export async function ensureBoot(): Promise<void> {
  if (booted) return;
  booted = true;

  try {
    assertServerConfig();
  } catch (error) {
    // Не роняем сервер: сайт сможет открываться, а вход в админку заработает,
    // как только ADMIN_PASSWORD_HASH появится в переменных окружения.
    // (verifyPassword на пустом хеше всегда возвращает false — вход закрыт.)
    console.error('[boot]', error instanceof Error ? error.message : error);
  }

  runMigrations();

  if (cloudDb.enabled) {
    await installCloudSync(db);
  }

  try {
    ensureUploadDirs();
  } catch (error) {
    // На серверless-хостингах корень файловой системы только для чтения —
    // это нормально: загрузка фото там просто будет недоступна.
    console.warn(
      '[boot] каталог загрузок создать не удалось:',
      error instanceof Error ? error.message : error,
    );
  }

  seedDemoData();
  seedClubValues();
}
