import { config } from './env.js';
import { ensureBoot } from './boot.js';
import { createApp } from './app.js';

async function main(): Promise<void> {
  await ensureBoot();

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
}

main().catch((error: unknown) => {
  console.error('[server] не удалось запуститься:', error);
  process.exit(1);
});
