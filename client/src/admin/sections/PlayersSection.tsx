import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Search,
  Shield,
  Star,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { adminApi, type PlayerPayload } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ImageUploader from '../ImageUploader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { POSITIONS } from '@shared/positions';
import { getPosition } from '@shared/positions';
import type { LineupEntry, Player, PlayerRole, PositionCode } from '@shared/types';

type FilterValue = 'all' | PositionCode | 'captain';

interface FormState {
  firstName: string;
  lastName: string;
  number: string;
  position: PositionCode;
  rating: string;
  countryCode: string;
  countryName: string;
  flag: string;
  role: PlayerRole;
  appearances: string;
  goals: string;
  assists: string;
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  number: '',
  position: 'CM',
  rating: '75',
  countryCode: '',
  countryName: '',
  flag: '',
  role: 'player',
  appearances: '0',
  goals: '0',
  assists: '0',
};

function toForm(player: Player): FormState {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    number: String(player.number),
    position: player.position,
    rating: String(player.rating),
    countryCode: player.countryCode,
    countryName: player.countryName,
    flag: player.flag,
    role: player.role,
    appearances: String(player.appearances),
    goals: String(player.goals),
    assists: String(player.assists),
  };
}

function toPayload(form: FormState): PlayerPayload {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    number: Number.parseInt(form.number, 10) || 0,
    position: form.position,
    rating: Number.parseInt(form.rating, 10) || 75,
    countryCode: form.countryCode,
    countryName: form.countryName,
    flag: form.flag,
    role: form.role,
    appearances: Number.parseInt(form.appearances, 10) || 0,
    goals: Number.parseInt(form.goals, 10) || 0,
    assists: Number.parseInt(form.assists, 10) || 0,
  };
}

export default function PlayersSection() {
  const { notify } = useToast();
  const { data, reload } = useSite();

  const [players, setPlayers] = useState<Player[]>([]);
  const [lineups, setLineups] = useState<Record<string, LineupEntry[]>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Player | null>(null);

  const formation = data?.settings.defaultFormation ?? '4-3-3';

  const load = async (keepSelection = true) => {
    const [list, lineupsData] = await Promise.all([
      adminApi.listPlayers(),
      adminApi.getLineups(),
    ]);
    setPlayers(list);
    setLineups(lineupsData);
    if (!keepSelection) setSelectedId(null);
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    load(false)
      .catch(() => notify('Не удалось загрузить список игроков', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => players.find((player) => player.id === selectedId) ?? null,
    [players, selectedId],
  );

  useEffect(() => {
    if (selected) setForm(toForm(selected));
    else setForm(EMPTY_FORM);
  }, [selected]);

  const startersInFormation = useMemo(() => {
    const set = new Set<number>();
    for (const entry of lineups[formation] ?? []) set.add(entry.playerId);
    return set;
  }, [lineups, formation]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return players.filter((player) => {
      if (filter === 'captain' && player.role !== 'captain' && player.role !== 'vice') {
        return false;
      }
      if (filter !== 'all' && filter !== 'captain' && player.position !== filter) {
        return false;
      }
      if (!needle) return true;
      return [
        player.firstName,
        player.lastName,
        String(player.number),
        player.countryName,
        getPosition(player.position).label,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [players, query, filter]);

  const refresh = async () => {
    await load();
    await reload();
  };

  const createPlayer = async () => {
    setBusy(true);
    try {
      const used = new Set(players.map((player) => player.number));
      let number = 1;
      while (used.has(number)) number += 1;
      const created = await adminApi.createPlayer({
        firstName: '',
        lastName: '',
        number,
        position: 'CM',
        rating: 75,
        countryCode: '',
        countryName: '',
        flag: '',
        role: 'player',
        appearances: 0,
        goals: 0,
        assists: 0,
      });
      notify('Игрок добавлен — заполните карточку');
      await load();
      await reload();
      setSelectedId(created.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось добавить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  const savePlayer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await adminApi.updatePlayer(selected.id, toPayload(form));
      notify('Карточка игрока сохранена');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      await adminApi.uploadPlayerPhoto(selected.id, file);
      notify('Фотография загружена');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить фото', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async () => {
    if (!selected) return;
    try {
      await adminApi.deletePlayerPhoto(selected.id);
      notify('Фотография удалена', 'info');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить фото', 'error');
    }
  };

  const removePlayer = async () => {
    if (!confirmRemove) return;
    setBusy(true);
    try {
      await adminApi.deletePlayer(confirmRemove.id);
      notify('Игрок удалён', 'info');
      setConfirmRemove(null);
      if (selectedId === confirmRemove.id) setSelectedId(null);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (player: Player, role: PlayerRole) => {
    setBusy(true);
    try {
      await adminApi.updatePlayer(player.id, { role });
      notify(
        role === 'captain'
          ? 'Капитан назначен'
          : role === 'vice'
            ? 'Вице-капитан назначен'
            : 'Роль снята',
      );
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить роль', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleStarter = async (player: Player) => {
    setBusy(true);
    try {
      if (startersInFormation.has(player.id)) {
        await adminApi.moveToBench(player.id);
        notify(`${player.lastName || 'Игрок'} отправлен в запас`, 'info');
      } else {
        await adminApi.assignToStarter(player.id);
        notify(`${player.lastName || 'Игрок'} добавлен в стартовый состав`);
      }
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить состав', 'error');
    } finally {
      setBusy(false);
    }
  };

  const move = async (playerId: number, direction: -1 | 1) => {
    const ids = players.map((player) => player.id);
    const index = ids.indexOf(playerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await adminApi.reorderPlayers(next);
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить порядок', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleDemo = async (player: Player) => {
    setBusy(true);
    try {
      await adminApi.updatePlayer(player.id, { isDemo: !player.isDemo });
      notify(player.isDemo ? 'Метка «пример» снята' : 'Отмечен как пример');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось обновить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем состав…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Состав команды</h2>
            <p className="admin-panel__hint">
              Поиск, фильтр по позиции, карточки игроков, фотографии и роли. Изменения сразу
              попадают на публичный сайт.
            </p>
          </div>
          <button type="button" className="btn btn--gold btn--sm" onClick={createPlayer} disabled={busy}>
            <UserPlus size={14} /> Добавить игрока
          </button>
        </div>

        <div className="players-toolbar">
          <div className="search-bar">
            <Search size={16} />
            <input
              className="input"
              type="search"
              placeholder="Поиск по имени, номеру, стране…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="chip-row">
            <button
              type="button"
              className={`filter-chip ${filter === 'all' ? 'is-active' : ''}`.trim()}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === 'captain' ? 'is-active' : ''}`.trim()}
              onClick={() => setFilter('captain')}
            >
              <Crown size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Капитаны
            </button>
            {POSITIONS.map((position) => (
              <button
                key={position.code}
                type="button"
                className={`filter-chip ${filter === position.code ? 'is-active' : ''}`.trim()}
                onClick={() => setFilter(position.code)}
              >
                {position.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field__hint" style={{ marginTop: 12 }}>
          Показано {filtered.length} из {players.length}. Схема по умолчанию: {formation}.
        </div>
      </div>

      <div className="players-layout">
        <div className="admin-panel">
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">
              <Users size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Список игроков
            </h3>
          </div>

          {filtered.length === 0 ? (
            <p className="field__hint">
              Ничего не найдено. Измените поисковый запрос или фильтр, либо добавьте нового игрока.
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Игрок</th>
                    <th>Позиция</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Порядок</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((player) => {
                    const isStarter = startersInFormation.has(player.id);
                    return (
                      <tr
                        key={player.id}
                        className={player.id === selectedId ? 'is-selected' : undefined}
                        onClick={() => setSelectedId(player.id)}
                      >
                        <td>
                          <div className="player-cell">
                            <span className="admin-table__thumb">
                              {player.photo ? (
                                <img src={`/api/media/${player.photo}`} alt="" loading="lazy" />
                              ) : (
                                player.number
                              )}
                            </span>
                            <span>
                              <strong>
                                {player.lastName || player.firstName || 'Игрок'}{' '}
                                {player.firstName && player.lastName ? ` ${player.firstName}` : ''}
                              </strong>
                              <small>
                                № {player.number} · {player.flag} {player.countryName || '—'}
                                {player.isDemo ? ' · пример' : ''}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>{getPosition(player.position).short}</td>
                        <td>
                          {player.role === 'captain' ? (
                            <span className="chip chip--gold">
                              <Crown size={12} /> Капитан
                            </span>
                          ) : player.role === 'vice' ? (
                            <span className="chip">
                              <Shield size={12} /> Вице
                            </span>
                          ) : (
                            <span className="field__hint">Игрок</span>
                          )}
                        </td>
                        <td>
                          {isStarter ? (
                            <span className="chip chip--gold">
                              <Star size={12} /> Стартер
                            </span>
                          ) : (
                            <span className="chip">Запас</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions" style={{ justifyContent: 'flex-start' }}>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label="Поднять игрока выше"
                              onClick={(event) => {
                                event.stopPropagation();
                                void move(player.id, -1);
                              }}
                              disabled={busy}
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label="Опустить игрока ниже"
                              onClick={(event) => {
                                event.stopPropagation();
                                void move(player.id, 1);
                              }}
                              disabled={busy}
                            >
                              <ArrowDown size={15} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              title="В стартовый состав / в запас"
                              onClick={(event) => {
                                event.stopPropagation();
                                void toggleStarter(player);
                              }}
                              disabled={busy}
                            >
                              <Star size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Назначить капитаном"
                              onClick={(event) => {
                                event.stopPropagation();
                                void setRole(player, player.role === 'captain' ? 'player' : 'captain');
                              }}
                              disabled={busy}
                            >
                              <Crown size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              title="Удалить игрока"
                              onClick={(event) => {
                                event.stopPropagation();
                                setConfirmRemove(player);
                              }}
                              disabled={busy}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Карточка игрока</h3>
            {selected && (
              <span className="chip">
                ID {selected.id} · {selected.isDemo ? 'пример' : 'реальный'}
              </span>
            )}
          </div>

          {!selected ? (
            <p className="field__hint">
              Выберите игрока в списке слева, чтобы отредактировать карточку, загрузить фотографию
              или изменить роль.
            </p>
          ) : (
            <>
              <ImageUploader
                value={selected.photo}
                onUpload={uploadPhoto}
                onDelete={deletePhoto}
                busy={uploading}
                label="Фотография игрока"
                shape="square"
                hint="JPG, PNG или WebP, до 6 МБ. Файл хранится на сервере, а не в базе."
              />

              <form onSubmit={savePlayer}>
                <div className="form-grid" style={{ marginTop: 20 }}>
                  <label className="field">
                    <span className="field__label">Имя</span>
                    <input
                      className="input"
                      value={form.firstName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, firstName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Фамилия</span>
                    <input
                      className="input"
                      value={form.lastName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, lastName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Игровой номер</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={99}
                      value={form.number}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, number: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Позиция</span>
                    <select
                      className="select"
                      value={form.position}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          position: event.target.value as PositionCode,
                        }))
                      }
                    >
                      {POSITIONS.map((position) => (
                        <option key={position.code} value={position.code}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Рейтинг</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={99}
                      value={form.rating}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, rating: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Роль в клубе</span>
                    <select
                      className="select"
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          role: event.target.value as PlayerRole,
                        }))
                      }
                    >
                      <option value="player">Игрок</option>
                      <option value="captain">Капитан</option>
                      <option value="vice">Вице-капитан</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Страна (название)</span>
                    <input
                      className="input"
                      value={form.countryName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, countryName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Код страны</span>
                    <input
                      className="input"
                      value={form.countryCode}
                      maxLength={8}
                      placeholder="RU"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, countryCode: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Флаг (эмодзи)</span>
                    <input
                      className="input"
                      value={form.flag}
                      maxLength={4}
                      placeholder="🇷🇺"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, flag: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Матчи</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={form.appearances}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, appearances: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Голы</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={form.goals}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, goals: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Голевые передачи</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={form.assists}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, assists: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn--gold btn--sm" disabled={busy || uploading}>
                    Сохранить карточку
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline-gold btn--sm"
                    onClick={() => void toggleStarter(selected)}
                    disabled={busy}
                  >
                    <Star size={14} />
                    {startersInFormation.has(selected.id) ? 'Отправить в запас' : 'В стартовый состав'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void toggleDemo(selected)}
                    disabled={busy}
                  >
                    {selected.isDemo ? 'Убрать метку «пример»' : 'Отметить как пример'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => setConfirmRemove(selected)}
                    disabled={busy}
                  >
                    <Trash2 size={14} /> Удалить
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title="Удалить игрока?"
        description={
          confirmRemove
            ? `${confirmRemove.lastName || confirmRemove.firstName || 'Игрок'} № ${
                confirmRemove.number
              } будет удалён из состава вместе с фотографией. Действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        busy={busy}
        onConfirm={removePlayer}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
