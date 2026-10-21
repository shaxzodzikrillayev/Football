import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SitePayload } from '@shared/types';
import { api, ApiError } from './api';

interface SiteContextValue {
  data: SitePayload | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

function applyTheme(payload: SitePayload | null): void {
  if (!payload || typeof document === 'undefined') return;
  const { settings } = payload;
  const root = document.documentElement;
  root.style.setProperty('--color-gold', settings.primaryColor);
  root.style.setProperty('--color-bg', settings.backgroundColor);
  root.style.setProperty('--color-surface', settings.surfaceColor);
  root.style.setProperty('--color-text', settings.textColor);
  root.style.setProperty('--color-muted', settings.mutedColor);
  root.style.setProperty(
    '--color-gold-soft',
    `${settings.primaryColor}22`,
  );
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const payload = await api.get<SitePayload>('/api/site');
      setData(payload);
      applyTheme(payload);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Не удалось загрузить данные сайта';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<SiteContextValue>(
    () => ({ data, loading, error, reload: load }),
    [data, loading, error, load],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite должен вызываться внутри SiteProvider');
  }
  return context;
}
