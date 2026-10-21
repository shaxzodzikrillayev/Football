import { useEffect, useState } from 'react';
import { Goal, Handshake, Save, Trophy, XCircle } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import type { ClubStats } from '@shared/types';

interface FormState {
  wins: string;
  draws: string;
  losses: string;
  goalsFor: string;
  goalsAgainst: string;
}

const EMPTY: FormState = {
  wins: '0',
  draws: '0',
  losses: '0',
  goalsFor: '0',
  goalsAgainst: '0',
};

export default function StatsSection() {
  const { notify } = useToast();
  const { reload } = useSite();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setForm({
          wins: String(data.wins),
          draws: String(data.draws),
          losses: String(data.losses),
          goalsFor: String(data.goalsFor),
          goalsAgainst: String(data.goalsAgainst),
        });
      })
      .catch(() => notify('Не удалось загрузить статистику', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await adminApi.patchStats({
        wins: Number.parseInt(form.wins, 10) || 0,
        draws: Number.parseInt(form.draws, 10) || 0,
        losses: Number.parseInt(form.losses, 10) || 0,
        goalsFor: Number.parseInt(form.goalsFor, 10) || 0,
        goalsAgainst: Number.parseInt(form.goalsAgainst, 10) || 0,
      });
      setStats(updated);
      notify('Статистика сохранена');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить статистику', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем статистику…</span>
        </div>
      </div>
    );
  }

  const total = (stats?.wins ?? 0) + (stats?.draws ?? 0) + (stats?.losses ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Статистика клуба</h2>
            <p className="admin-panel__hint">
              Значения отображаются в карточках на публичном сайте. Количество игроков считается
              автоматически по базе состава.
            </p>
          </div>
        </div>

        <div className="admin-grid admin-grid--stats">
          <div className="kpi">
            <span className="kpi__value">
              <Trophy size={18} style={{ verticalAlign: 2 }} /> {stats?.wins ?? 0}
            </span>
            <span className="kpi__label">Победы</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <Handshake size={18} style={{ verticalAlign: 2 }} /> {stats?.draws ?? 0}
            </span>
            <span className="kpi__label">Ничьи</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <XCircle size={18} style={{ verticalAlign: 2 }} /> {stats?.losses ?? 0}
            </span>
            <span className="kpi__label">Поражения</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <Goal size={18} style={{ verticalAlign: 2 }} /> {stats?.goalsFor ?? 0}
            </span>
            <span className="kpi__label">Забито</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <Goal size={18} style={{ verticalAlign: 2 }} /> {stats?.goalsAgainst ?? 0}
            </span>
            <span className="kpi__label">Пропущено</span>
          </div>
        </div>

        <div className="field__hint" style={{ marginTop: 14 }}>
          Всего матчей учтено: {total}. Количество игроков в клубе: {stats?.playersTotal ?? 0}.
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <h3 className="admin-panel__title">Редактирование</h3>
        </div>

        <form onSubmit={save}>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Победы</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.wins}
                onChange={(event) => setForm((current) => ({ ...current, wins: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Ничьи</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.draws}
                onChange={(event) => setForm((current) => ({ ...current, draws: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Поражения</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.losses}
                onChange={(event) => setForm((current) => ({ ...current, losses: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Забито голов</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.goalsFor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, goalsFor: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Пропущено голов</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.goalsAgainst}
                onChange={(event) =>
                  setForm((current) => ({ ...current, goalsAgainst: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn--gold btn--sm" disabled={busy}>
              <Save size={14} /> {busy ? 'Сохраняем…' : 'Сохранить статистику'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
