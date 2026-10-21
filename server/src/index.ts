import { assertServerConfig, config } from './env.js';
import { runMigrations } from './db/index.js';
import { ensureUploadDirs } from './services/storage.js';
import { purgeExpiredSessions } from './services/authService.js';
import { seedDemoData } from './db/seed.js';
import { seedClubValues } from './services/repository.js';
import { createApp } from './app.js';

async function main(): Promise<void> {
  assertServerConfig();
  runMigrations();
  ensureUploadDirs();
  purgeExpiredSessions();
  seedDemoData();
  seedClubValues();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] TITAN FC API запущен: http://localhost:${config.port}`);
    console.log(`[server] режим: ${config.isProduction ? 'production' : 'development'}`);
    console.log(`[server] хранилище файлов: ${config.storageDriver}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] получен ${signal}, останавливаюсь...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Сервер не должен падать из-за одного необработанного отклонения.
  process.on('unhandledRejection', (reason) => {
    console.error('[server] необработанное отклонение промиса:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('[server] неперехваченное исключение:', error);
  });
}

main().catch((error) => {
  console.error('[server] не удалось запустить сервер:\n', error instanceof Error ? error.message : error);
  process.exit(1);
});
