export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = (message = 'Требуется авторизация') => new HttpError(401, message);
export const forbidden = (message = 'Доступ запрещён') => new HttpError(403, message);
export const notFound = (message = 'Не найдено') => new HttpError(404, message);
