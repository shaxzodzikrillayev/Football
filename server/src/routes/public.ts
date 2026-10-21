import { Router } from 'express';
import type { Request, Response } from 'express';
import { buildSitePayload } from '../services/repository.js';

export const publicRouter = Router();

publicRouter.get('/site', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  res.json(buildSitePayload());
});

publicRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
