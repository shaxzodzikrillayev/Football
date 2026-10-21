import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './env.js';
import { attachSession, requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { mediaRouter } from './routes/media.js';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Сжатие ответов (gzip/br): заметно ускоряет загрузку JS/CSS и JSON.
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        const type = String(res.getHeader('Content-Type') ?? '');
        if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('X-DNS-Prefetch-Control', 'off');
    next();
  });

  if (config.corsOrigins.length) {
    app.use((req, res, next) => {
      const origin = req.get('origin');
      if (origin && config.corsOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      }
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
  }

  app.use(attachSession);

  app.use('/api/auth', authRouter);
  app.use('/api/admin', requireAuth, adminRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api', publicRouter);

  // Собранный клиент (production)
  if (fs.existsSync(config.clientDist)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (/\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg)$/i.test(filePath)) {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(config.clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
