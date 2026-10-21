import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { adminApi, type MatchPayload } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ImageUploader from '../ImageUploader';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { MatchItem, MatchStatus } from '@shared/types';

const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Запланирован',
  live: 'Идёт',
  finished: 'Сыгран',
};

const EMPTY_FORM: MatchPayload = {
  opponent: '',
  opponentLogo: null,
  homeScore: null,
  awayScore: null,
  date: new Date().toISOString().slice(0, 10),
  status: 'scheduled',
  competition: '',
};

function toForm(match: MatchItem): MatchPayload {
  return {
    opponent: match.opponent,
    opponentLogo: match.opponentLogo,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    date: match.date ? match.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: match.status,
    competition: match.competition,
  };
}

export default function MatchesSection() {
  const { notify } = useToast();
  const { reload } = useSite();

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MatchPayload>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<MatchItem | null>(null);

  const load = async () => {
    const list = await adminApi.listMatches();
    setMatches(list);
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => notify('Не удалось загрузить матчи', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editing = useMemo(
    () => matches.find((match) => match.id === editingId) ?? null,
    [matches, editingId],
  );

  const startEdit = (match: MatchItem) => {
    setEditingId(match.id);
    setForm(toForm(match));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.opponent.trim()) {
      notify('Укажите название соперника', 'error');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await adminApi.updateMatch(editingId, form);
        notify('Матч обновлён');
      } else {
        await adminApi.createMatch(form);
        notify('Матч добавлен');
      }
      await load();
      await reload();
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить матч', 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!editingId) {
      notify('Сначала сохраните матч, затем добавьте логотип', 'error');
      return;
    }
    setUploading(true);
    try {
      await adminApi.uploadMatchLogo(editingId, file);
      notify('Логотип загружен');
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить логотип', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteLogo = async () => {
    if (!editingId) return;
    try {
      await adminApi.deleteMatchLogo(editingId);
      notify('Логотип удалён', 'info');
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить логотип', 'error');
    }
  };

  const removeMatch = async () => {
    if (!confirmRemove) return;
    setBusy(true);
    try {
      await adminApi.deleteMatch(confirmRemove.id);
      notify('Матч удалён', 'info');
      if (editingId === confirmRemove.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setConfirmRemove(null);
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить матч', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем матчи…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Матчи</h2>
            <p className="admin-panel__hint">
              На сайте отображаются только те матчи, которые вы добавили здесь. Счёт указывается
              после завершения игры.
            </p>
          </div>
          <button type="button" className="btn btn--gold btn--sm" onClick={startCreate}>
            <Plus size={14} /> Новый матч
          </button>
        </div>

        <form onSubmit={save}>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Соперник</span>
              <input
                className="input"
                value={form.opponent}
                placeholder="Название команды"
                onChange={(event) => setForm((current) => ({ ...current, opponent: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Турнир</span>
              <input
                className="input"
                value={form.competition}
                placeholder="Чемпионат города"
                onChange={(event) =>
                  setForm((current) => ({ ...current, competition: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Дата</span>
              <input
                className="input"
                type="date"
                value={(form.date ?? '').slice(0, 10)}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Статус</span>
              <select
                className="select"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as MatchStatus }))
                }
              >
                <option value="scheduled">Запланирован</option>
                <option value="live">Идёт</option>
                <option value="finished">Сыгран</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Голы TITAN</span>
              <input
                className="input"
                type="number"
                min={0}
                max={99}
                value={form.homeScore ?? ''}
                placeholder="—"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    homeScore:
                      event.target.value === '' ? null : Number.parseInt(event.target.value, 10),
                  }))
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Голы соперника</span>
              <input
                className="input"
                type="number"
                min={0}
                max={99}
                value={form.awayScore ?? ''}
                placeholder="—"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    awayScore:
                      event.target.value === '' ? null : Number.parseInt(event.target.value, 10),
                  }))
                }
              />
            </label>
          </div>

          {editingId && (
            <div style={{ marginTop: 18 }}>
              <ImageUploader
                value={editing?.opponentLogo ?? null}
                onUpload={uploadLogo}
                onDelete={deleteLogo}
                busy={uploading}
                label="Логотип соперника"
                shape="square"
                hint="JPG, PNG или WebP, до 6 МБ. Если логотипа нет — используется заглушка."
              />
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn--gold btn--sm" disabled={busy || uploading}>
              <Save size={14} /> {editingId ? 'Сохранить матч' : 'Добавить матч'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={startCreate}
                disabled={busy}
              >
                Создать новый
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <h3 className="admin-panel__title">
            <CalendarDays size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Список матчей
          </h3>
          <span className="chip">Всего: {matches.length}</span>
        </div>

        {matches.length === 0 ? (
          <p className="field__hint">
            Матчей пока нет. Добавьте первый матч через форму выше — он появится в разделе
            «Статистика» на сайте.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Соперник</th>
                  <th>Турнир</th>
                  <th>Дата</th>
                  <th>Счёт</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id} className={match.id === editingId ? 'is-selected' : undefined}>
                    <td>
                      <div className="player-cell">
                        <span className="admin-table__thumb">
                          {match.opponentLogo ? (
                            <img src={`/api/media/${match.opponentLogo}`} alt="" loading="lazy" />
                          ) : (
                            '—'
                          )}
                        </span>
                        <span>
                          <strong>{match.opponent}</strong>
                        </span>
                      </div>
                    </td>
                    <td>{match.competition || '—'}</td>
                    <td>{(match.date ?? '').slice(0, 10) || '—'}</td>
                    <td>
                      {match.homeScore === null && match.awayScore === null
                        ? '—'
                        : `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`}
                    </td>
                    <td>
                      <span
                        className={`chip ${match.status === 'finished' ? 'chip--gold' : ''}`.trim()}
                      >
                        {STATUS_LABELS[match.status]}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Редактировать матч"
                          onClick={() => startEdit(match)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          aria-label="Удалить матч"
                          onClick={() => setConfirmRemove(match)}
                          disabled={busy}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title="Удалить матч?"
        description={
          confirmRemove
            ? `Матч против «${confirmRemove.opponent}» будет удалён вместе с логотипом соперника.`
            : ''
        }
        confirmLabel="Удалить"
        busy={busy}
        onConfirm={removeMatch}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
