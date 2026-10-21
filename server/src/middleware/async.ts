import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Оборачивает асинхронный обработчик Express 4, чтобы отклонённый промис
 * попадал в errorHandler, а не ронял процесс.
 */
export function asyncHandler(fn: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
