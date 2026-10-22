import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../env.js';
import { cloudDb } from '../db/cloudSync.js';
import { buildSitePayload } from '../services/repository.js';

export const publicRouter = Router();

publicRouter.get('/site', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  res.json(buildSitePayload());
});

publicRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node: process.version,
    // Диагностика для админа: true — хеш пароля из переменных окружения на месте,
    // false — переменная ADMIN_PASSWORD_HASH не задана или не применилась (нужен редеплой).
    adminHashConfigured: Boolean(config.adminPasswordHash),
    cloudDb: cloudDb.enabled,
  });
});
