import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import ClubLogo from '../components/ClubLogo';
import { api, ApiError } from '../services/api';

interface SessionResponse {
  authenticated: boolean;
  csrfToken?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<SessionResponse>('/api/auth/session')
      .then((session) => {
        if (!cancelled && session.authenticated) {
          navigate('/admin/dashboard', { replace: true });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post<{ ok: boolean }>('/api/auth/login', { password });
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Не удалось выполнить вход. Попробуйте ещё раз.';
      setError(message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth__card">
        <div className="auth__logo">
          <ClubLogo size={64} showText={false} />
        </div>

        <h1 className="auth__title">TITAN FC</h1>
        <p className="auth__subtitle">Панель администратора · защищённый вход</p>

        <form className="auth__form" onSubmit={submit}>
          {error && (
            <div className="auth__error" role="alert">
              <ShieldAlert size={16} style={{ flex: 'none', marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <label className="field">
            <span className="field__label">Пароль администратора</span>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Введите пароль"
                required
                autoFocus
                style={{ paddingRight: 46 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 0,
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  padding: 6,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn--gold" disabled={submitting || busy}>
            <LogIn size={16} />
            {submitting ? 'Проверяем…' : 'Войти'}
          </button>
        </form>

        <Link className="auth__back" to="/">
          <ArrowLeft size={14} /> Вернуться на сайт
        </Link>
      </div>
    </main>
  );
}
