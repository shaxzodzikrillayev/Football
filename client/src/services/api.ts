export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  if (!entry) return null;
  return decodeURIComponent(entry.slice(prefix.length));
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const csrf = readCookie('titan_csrf');
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const hasBody = options.body !== undefined && method !== 'GET';

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Ошибка запроса (${response.status})`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

export const api = {
  get: <T,>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};

/** Загрузка файла через multipart/form-data (Content-Type задаёт браузер). */
export async function uploadFile<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const csrf = readCookie('titan_csrf');
  const headers: Record<string, string> = {};
  if (csrf) headers['X-CSRF-Token'] = csrf;

  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(0, 'Не удалось загрузить файл: нет связи с сервером.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Ошибка загрузки (${response.status})`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}
