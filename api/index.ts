/**
 * Vercel Serverless Function.
 *
 * Весь API и страницы админки отдаёт Express-приложение из собранного
 * dist/server (команда `npm run build` выполняется на Vercel до деплоя).
 * Статика клиента раздаётся самим Vercel из dist/client (см. vercel.json),
 * а сюда попадают только /api/* и маршруты SPA.
 *
 * Если запуск по какой-то причине не удался (нет переменных окружения,
 * не тот Node и т.п.) — функция не падает молча в 500, а отвечает
 * с понятным текстом ошибки прямо в ответе.
 */

type ResponseLike = {
  status: (code: number) => { json: (body: unknown) => void };
};

let app: unknown = null;
let bootMessage = '';

try {
  const { ensureBoot } = await import('../dist/server/src/boot.js');
  const { createApp } = await import('../dist/server/src/app.js');
  await ensureBoot();
  app = createApp();
} catch (error) {
  bootMessage = error instanceof Error ? error.message : String(error);
  console.error('[api] сервер не смог запуститься:', error);
}

export default app
  ? (app as (req: unknown, res: unknown) => void)
  : (_req: unknown, res: ResponseLike) => {
      res.status(500).json({
        error: `Сервер не запустился: ${bootMessage}`,
        hint: 'Проверьте на Vercel: Settings → Environment Variables (ADMIN_PASSWORD_HASH, SESSION_SECRET, NODE_VERSION=24) и подключён ли Storage → Redis. После правки переменных нужен редеплой (Deployments → ⋯ → Redeploy).',
      });
    };
