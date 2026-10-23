import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Shuffle, Sparkles, UserPlus, X } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { FORMATIONS, getFormation } from '@shared/formations';
import { getPosition } from '@shared/positions';
import type { FormationCode, LineupEntry, Player } from '@shared/types';

type DragSource = { type: 'slot'; slot: string } | { type: 'bench' };
type DropTarget = { type: 'slot'; slot: string } | { type: 'bench' };

interface DragState {
  playerId: number;
  source: DragSource;
  x: number;
  y: number;
}

function resolveTarget(x: number, y: number): DropTarget | null {
  if (typeof document === 'undefined') return null;
  const element = document.elementFromPoint(x, y);
  if (!element) return null;

  const slotElement = element.closest('[data-drop-slot]');
  if (slotElement) {
    const slot = slotElement.getAttribute('data-drop-slot');
    if (slot) return { type: 'slot', slot };
  }

  if (element.closest('[data-drop-bench]')) {
    return { type: 'bench' };
  }

  return null;
}

function PlayerChip({
  player,
  onPointerDown,
  dragging,
  compact,
}: {
  player: Player;
  onPointerDown: (event: React.PointerEvent) => void;
  dragging: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`drag-chip ${dragging ? 'is-dragging' : ''} ${compact ? 'drag-chip--compact' : ''}`.trim()}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={-1}
      title={`${player.firstName} ${player.lastName}`.trim() || `Игрок № ${player.number}`}
    >
      <span className="drag-chip__photo">
        {player.photo ? (
          <img src={`/api/media/${player.photo}`} alt="" draggable={false} />
        ) : (
          player.number
        )}
      </span>
      {!compact && (
        <>
          <span className="drag-chip__name">
            {player.lastName || player.firstName || 'Игрок'}
          </span>
          <span className="drag-chip__meta">
            {getPosition(player.position).short} · {player.rating}
          </span>
        </>
      )}
    </div>
  );
}

export default function TacticsSection() {
  const { notify } = useToast();
  const { data, reload } = useSite();

  const [formation, setFormation] = useState<FormationCode>(
    data?.settings.defaultFormation ?? '4-3-3',
  );
  const pickedFormation = useRef(false);

  useEffect(() => {
    if (pickedFormation.current) return;
    const preferred = data?.settings.defaultFormation;
    if (preferred) setFormation(preferred);
  }, [data?.settings.defaultFormation]);

  const [lineups, setLineups] = useState<Record<string, LineupEntry[]>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<DropTarget | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const hoverRef = useRef<DropTarget | null>(null);

  const [swapFirst, setSwapFirst] = useState('');
  const [swapSecond, setSwapSecond] = useState('');
  const [assignSlot, setAssignSlot] = useState('');
  const [assignPlayer, setAssignPlayer] = useState('');

  const formationMeta = getFormation(formation);

  const load = useCallback(async () => {
    const [lineupsData, playersData] = await Promise.all([
      adminApi.getLineups(),
      adminApi.listPlayers(),
    ]);
    setLineups(lineupsData);
    setPlayers(playersData);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => notify('Не удалось загрузить состав', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineup = lineups[formation] ?? [];

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const slotOccupant = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of lineup) map.set(entry.slot, entry.playerId);
    return map;
  }, [lineup]);

  const bench = useMemo(() => {
    const used = new Set(lineup.map((entry) => entry.playerId));
    return players.filter((player) => !used.has(player.id));
  }, [players, lineup]);

  const applyLineups = async (next: Record<string, LineupEntry[]>) => {
    setLineups(next);
    await reload();
  };

  /* ----------------------------- Drag & drop ----------------------------- */

  const beginDrag = (event: React.PointerEvent, playerId: number, source: DragSource) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const next: DragState = { playerId, source, x: event.clientX, y: event.clientY };
    dragRef.current = next;
    setDrag(next);
  };

  const commitDrop = useCallback(
    async (state: DragState, target: DropTarget) => {
      if (target.type === 'bench') {
        if (state.source.type !== 'slot') return;
        setBusy(true);
        try {
          const next = await adminApi.setLineupSlot(formation, state.source.slot, null);
          notify('Игрок отправлен в запас', 'info');
          await applyLineups(next);
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Не удалось изменить состав', 'error');
        } finally {
          setBusy(false);
        }
        return;
      }

      if (state.source.type === 'slot') {
        if (state.source.slot === target.slot) return;
        const occupant = slotOccupant.get(target.slot);
        setBusy(true);
        try {
          const next = occupant
            ? await adminApi.swapLineupSlots(formation, state.source.slot, target.slot)
            : await adminApi.setLineupSlot(formation, target.slot, state.playerId);
          notify(occupant ? 'Игроки поменялись местами' : 'Игрок назначен на позицию');
          await applyLineups(next);
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Не удалось изменить состав', 'error');
        } finally {
          setBusy(false);
        }
        return;
      }

      // Из запаса на поле.
      setBusy(true);
      try {
        const next = await adminApi.setLineupSlot(formation, target.slot, state.playerId);
        notify('Игрок назначен на позицию');
        await applyLineups(next);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Не удалось изменить состав', 'error');
      } finally {
        setBusy(false);
      }
    },
    [formation, notify, slotOccupant, applyLineups],
  );

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      event.preventDefault();
      const next = { ...current, x: event.clientX, y: event.clientY };
      dragRef.current = next;
      setDrag(next);
      const target = resolveTarget(event.clientX, event.clientY);
      hoverRef.current = target;
      setHover(target);
    };

    const handleUp = () => {
      const current = dragRef.current;
      const target = hoverRef.current;
      dragRef.current = null;
      hoverRef.current = null;
      setDrag(null);
      setHover(null);
      if (current && target) {
        void commitDrop(current, target);
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [drag, commitDrop]);

  /* ------------------------------- Действия ------------------------------- */

  const removeFromSlot = async (slot: string) => {
    setBusy(true);
    try {
      const next = await adminApi.setLineupSlot(formation, slot, null);
      notify('Игрок отправлен в запас', 'info');
      await applyLineups(next);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить состав', 'error');
    } finally {
      setBusy(false);
    }
  };

  const swapSlots = async () => {
    if (!swapFirst || !swapSecond || swapFirst === swapSecond) {
      notify('Выберите две разные позиции', 'error');
      return;
    }
    setBusy(true);
    try {
      const next = await adminApi.swapLineupSlots(formation, swapFirst, swapSecond);
      notify('Игроки поменялись местами');
      await applyLineups(next);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось поменять местами', 'error');
    } finally {
      setBusy(false);
    }
  };

  const assignPlayerToSlot = async () => {
    const playerId = Number.parseInt(assignPlayer, 10);
    if (!assignSlot || !playerId) {
      notify('Выберите позицию и игрока', 'error');
      return;
    }
    setBusy(true);
    try {
      const next = await adminApi.setLineupSlot(formation, assignSlot, playerId);
      notify('Игрок назначен на позицию');
      setAssignPlayer('');
      await applyLineups(next);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось назначить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  const autoAssign = async () => {
    setBusy(true);
    try {
      const next = await adminApi.autoLineup(formation);
      notify('Схема расставлена автоматически');
      await applyLineups(next);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось расставить игроков', 'error');
    } finally {
      setBusy(false);
    }
  };

  const clearLineup = async () => {
    setBusy(true);
    try {
      const next = await adminApi.clearLineup(formation);
      notify('Схема очищена', 'info');
      setConfirmClear(false);
      await applyLineups(next);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось очистить схему', 'error');
    } finally {
      setBusy(false);
    }
  };

  const dragPlayer = drag ? playerById.get(drag.playerId) : null;

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем схему…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Тактика и расстановка</h2>
            <p className="admin-panel__hint">
              Перетаскивайте карточки игроков мышью или пальцем: из квадрата на поле в другой
              квадрат — обмен позициями, из поля в список «Запас» — отправка в запас, из запаса на
              поле — назначение. Пустые позиции можно заполнить выбором из списка.
            </p>
          </div>

          <div className="form-actions" style={{ margin: 0, padding: 0, border: 0 }}>
            <button type="button" className="btn btn--outline-gold btn--sm" onClick={autoAssign} disabled={busy}>
              <Sparkles size={14} /> Авто-расстановка
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmClear(true)}
              disabled={busy}
            >
              <Eraser size={14} /> Очистить схему
            </button>
          </div>
        </div>

        <div className="chip-row">
          {FORMATIONS.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`filter-chip ${formation === item.code ? 'is-active' : ''}`.trim()}
              onClick={() => {
                pickedFormation.current = true;
                setFormation(item.code);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="tactics-toolbar">
          <div className="tactics-toolbar__item">
            <span className="field__label">Поменять местами</span>
            <div className="tactics-toolbar__row">
              <select
                className="select"
                value={swapFirst}
                onChange={(event) => setSwapFirst(event.target.value)}
              >
                <option value="">позиция 1</option>
                {formationMeta.slots.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={swapSecond}
                onChange={(event) => setSwapSecond(event.target.value)}
              >
                <option value="">позиция 2</option>
                {formationMeta.slots.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--gold btn--sm" onClick={swapSlots} disabled={busy}>
                <Shuffle size={14} /> Обменять
              </button>
            </div>
          </div>

          <div className="tactics-toolbar__item">
            <span className="field__label">Назначить игрока</span>
            <div className="tactics-toolbar__row">
              <select
                className="select"
                value={assignSlot}
                onChange={(event) => setAssignSlot(event.target.value)}
              >
                <option value="">позиция</option>
                {formationMeta.slots.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={assignPlayer}
                onChange={(event) => setAssignPlayer(event.target.value)}
              >
                <option value="">игрок</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    № {player.number} · {player.lastName || player.firstName || 'Игрок'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--outline-gold btn--sm"
                onClick={assignPlayerToSlot}
                disabled={busy}
              >
                <UserPlus size={14} /> Назначить
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="tactics-board">
        <div className="admin-panel">
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Схема {formation}</h3>
            <span className="chip">
              В стартовом составе: {lineup.length} / {formationMeta.slots.length}
            </span>
          </div>

          <div className="tactics-pitch">
            <div className="tactics-pitch__half" />
            <div className="tactics-pitch__circle" />

            {formationMeta.slots.map((slot) => {
              const occupantId = slotOccupant.get(slot.key);
              const player = occupantId ? playerById.get(occupantId) : undefined;
              const isOver = hover?.type === 'slot' && hover.slot === slot.key;

              return (
                <div
                  key={slot.key}
                  className={`tactics-slot ${player ? 'is-filled' : ''} ${isOver ? 'is-over' : ''}`.trim()}
                  style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                  data-drop-slot={slot.key}
                >
                  <span className="tactics-slot__label">{slot.label}</span>

                  {player ? (
                    <>
                      <PlayerChip
                        player={player}
                        dragging={drag?.playerId === player.id}
                        onPointerDown={(event) =>
                          beginDrag(event, player.id, { type: 'slot', slot: slot.key })
                        }
                      />
                      <button
                        type="button"
                        className="tactics-slot__remove"
                        aria-label={`Убрать ${slot.label} в запас`}
                        onClick={() => void removeFromSlot(slot.key)}
                        disabled={busy}
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <span className="tactics-slot__empty">перетащите игрока</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Запас</h3>
            <span className="chip">{bench.length}</span>
          </div>

          <div
            className={`bench-list ${hover?.type === 'bench' ? 'is-over' : ''}`.trim()}
            data-drop-bench
          >
            {bench.length === 0 ? (
              <div className="bench-list__empty">
                Все игроки в стартовом составе. Перетащите карточку сюда, чтобы отправить игрока в
                запас.
              </div>
            ) : (
              bench.map((player) => (
                <div
                  key={player.id}
                  className={`bench-list__item ${drag?.playerId === player.id ? 'is-dragging' : ''}`.trim()}
                  onPointerDown={(event) => beginDrag(event, player.id, { type: 'bench' })}
                  role="button"
                  tabIndex={-1}
                >
                  <span className="bench-list__thumb">
                    {player.photo ? (
                      <img src={`/api/media/${player.photo}`} alt="" draggable={false} />
                    ) : (
                      player.number
                    )}
                  </span>
                  <span>
                    <strong>
                      {player.lastName || player.firstName || 'Игрок'}
                    </strong>
                    <small>
                      № {player.number} · {getPosition(player.position).short} · {player.rating}
                    </small>
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="field__hint" style={{ marginTop: 14 }}>
            Игрок, попавший в стартовый состав, автоматически убирается из запаса. Перетаскивание
            карточки с поля на занятую позицию меняет игроков местами, а из запаса на занятую позицию —
            новый игрок вытесняет прежнего (тот отправляется в запас).
          </p>
        </div>
      </div>

      {drag && dragPlayer && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          {dragPlayer.photo ? (
            <img src={`/api/media/${dragPlayer.photo}`} alt="" draggable={false} />
          ) : (
            <div className="drag-ghost__placeholder">{dragPlayer.number}</div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Очистить схему?"
        description="Все игроки будут отправлены в запас. Схему можно собрать заново вручную или автоматически."
        confirmLabel="Очистить"
        busy={busy}
        onConfirm={clearLineup}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
