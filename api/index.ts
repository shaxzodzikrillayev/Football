/**
 * Vercel Serverless Function.
 *
 * Весь API и страницы админки отдаёт Express-приложение из собранного
 * dist/server (команда `npm run build` выполняется на Vercel до деплоя).
 * Статика клиента раздаётся самим Vercel из dist/client (см. vercel.json),
 * а сюда попадают только /api/* и маршруты SPA.
 */
import { ensureBoot } from '../dist/server/src/boot.js';
import { createApp } from '../dist/server/src/app.js';

await ensureBoot();

export default createApp();
