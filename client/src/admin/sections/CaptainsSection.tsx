import { useEffect, useMemo, useState } from 'react';
import { Crown, Save, Shield, Shuffle, Trash2, UserPlus } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ImageUploader from '../ImageUploader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { POSITIONS } from '@shared/positions';
import type { Player, PlayerRole } from '@shared/types';

interface EditorProps {
  title: string;
  icon: React.ReactNode;
  player: Player | null;
  onSaved: () => Promise<void>;
}

function CaptainEditor({ title, icon, player, onSaved }: EditorProps) {
  const { notify } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [country, setCountry] = useState('');
  const [flag, setFlag] = useState('');
  const [position, setPosition] = useState('CM');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFirstName(player?.firstName ?? '');
    setLastName(player?.lastName ?? '');
    setNumber(player ? String(player.number) : '');
    setCountry(player?.countryName ?? '');
    setFlag(player?.flag ?? '');
    setPosition(player?.position ?? 'CM');
  }, [player]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!player) return;
    setBusy(true);
    try {
      await adminApi.updatePlayer(player.id, {
        firstName,
        lastName,
        number: Number.parseInt(number, 10) || 0,
        countryName: country,
        flag,
        position: position as Player['position'],
      });
      notify(`${title} обновлён`);
      await onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!player) return;
    setUploading(true);
    try {
      await adminApi.uploadPlayerPhoto(player.id, file);
      notify('Фотография загружена');
      await onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить фото', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async () => {
    if (!player) return;
    try {
      await adminApi.deletePlayerPhoto(player.id);
      notify('Фотография удалена', 'info');
      await onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить фото', 'error');
    }
  };

  if (!player) {
    return (
      <div className="admin-panel">
        <div className="admin-panel__head">
          <h3 className="admin-panel__title">
            {icon} {title}
          </h3>
        </div>
        <p className="field__hint">
          Роль пока не назначена. Выберите игрока в панели справа и нажмите «Назначить».
        </p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <h3 className="admin-panel__title">
          {icon} {title}
        </h3>
      </div>

      <ImageUploader
        value={player.photo}
        onUpload={uploadPhoto}
        onDelete={deletePhoto}
        busy={uploading}
        label={`Фотография — ${title.toLowerCase()}`}
      />

      <form onSubmit={save}>
        <div className="form-grid" style={{ marginTop: 20 }}>
          <label className="field">
            <span className="field__label">Имя</span>
            <input
              className="input"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Фамилия</span>
            <input
              className="input"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Игровой номер</span>
            <input
              className="input"
              type="number"
              min={0}
              max={99}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Позиция</span>
            <select
              className="select"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            >
              {POSITIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Страна</span>
            <input
              className="input"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Название страны"
            />
          </label>
          <label className="field">
            <span className="field__label">Флаг (эмодзи)</span>
            <input
              className="input"
              value={flag}
              onChange={(event) => setFlag(event.target.value)}
              placeholder="🇷🇺"
              maxLength={4}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--gold btn--sm" disabled={busy}>
            <Save size={14} /> {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CaptainsSection() {
  const { notify } = useToast();
  const { reload } = useSite();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const list = await adminApi.listPlayers();
    setPlayers(list);
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => notify('Не удалось загрузить список игроков', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captain = useMemo(() => players.find((p) => p.role === 'captain') ?? null, [players]);
  const vice = useMemo(() => players.find((p) => p.role === 'vice') ?? null, [players]);

  const assign = async (role: PlayerRole) => {
    const id = Number.parseInt(selectedId, 10);
    if (!id) {
      notify('Сначала выберите игрока', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi.updatePlayer(id, { role });
      notify(role === 'captain' ? 'Капитан назначен' : 'Вице-капитан назначен');
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось назначить', 'error');
    } finally {
      setBusy(false);
    }
  };

  const swap = async () => {
    if (!captain || !vice) {
      notify('Для обмена нужны оба назначенных капитана', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi.updatePlayer(captain.id, { role: 'vice' });
      await adminApi.updatePlayer(vice.id, { role: 'captain' });
      notify('Капитан и вице-капитан поменялись местами');
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось поменять местами', 'error');
    } finally {
      setBusy(false);
    }
  };

  const clearRole = async (player: Player) => {
    setBusy(true);
    try {
      await adminApi.updatePlayer(player.id, { role: 'player' });
      notify('Роль снята', 'info');
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось снять роль', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePlayer = async () => {
    if (!confirmRemove) return;
    setBusy(true);
    try {
      await adminApi.deletePlayer(confirmRemove.id);
      notify('Игрок удалён', 'info');
      setConfirmRemove(null);
      await load();
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addCaptain = async () => {
    setBusy(true);
    try {
      const used = new Set(players.map((p) => p.number));
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
      notify('Игрок добавлен — заполните данные и назначьте роль');
      await load();
      setSelectedId(String(created.id));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось добавить игрока', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем капитанов…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-grid admin-grid--2">
        <CaptainEditor
          title="Капитан"
          icon={<Crown size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />}
          player={captain}
          onSaved={async () => {
            await load();
            await reload();
          }}
        />
        <CaptainEditor
          title="Вице-капитан"
          icon={<Shield size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />}
          player={vice}
          onSaved={async () => {
            await load();
            await reload();
          }}
        />
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Назначение ролей</h2>
            <p className="admin-panel__hint">
              Выберите игрока и назначьте его капитаном или вице-капитаном. Роль всегда одна: при
              назначении нового капитана прежний автоматически теряет роль.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field__label">Игрок</span>
            <select
              className="select"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">— выберите игрока —</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  #{player.number} {player.firstName} {player.lastName}
                  {player.role === 'captain' ? ' (капитан)' : ''}
                  {player.role === 'vice' ? ' (вице-капитан)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--gold btn--sm" onClick={() => assign('captain')} disabled={busy}>
            <Crown size={14} /> Назначить капитаном
          </button>
          <button type="button" className="btn btn--outline-gold btn--sm" onClick={() => assign('vice')} disabled={busy}>
            <Shield size={14} /> Назначить вице-капитаном
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={swap} disabled={busy || !captain || !vice}>
            <Shuffle size={14} /> Поменять местами
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={addCaptain} disabled={busy}>
            <UserPlus size={14} /> Добавить игрока
          </button>
        </div>

        {(captain || vice) && (
          <div className="form-actions">
            {captain && (
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => clearRole(captain)}
                disabled={busy}
              >
                Снять роль с капитана
              </button>
            )}
            {vice && (
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => clearRole(vice)}
                disabled={busy}
              >
                Снять роль с вице-капитана
              </button>
            )}
          </div>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Капитаны — список</h2>
            <p className="admin-panel__hint">Здесь отображаются только игроки с капитанскими ролями.</p>
          </div>
        </div>

        {captain || vice ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Игрок</th>
                  <th>Роль</th>
                  <th>Номер</th>
                  <th>Страна</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[captain, vice].filter(Boolean).map((player) => (
                  <tr key={player!.id}>
                    <td>
                      {player!.firstName} {player!.lastName}
                    </td>
                    <td>{player!.role === 'captain' ? 'Капитан' : 'Вице-капитан'}</td>
                    <td>{player!.number}</td>
                    <td>
                      {player!.flag} {player!.countryName || '—'}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => setConfirmRemove(player!)}
                          aria-label="Удалить капитана"
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
        ) : (
          <p className="field__hint">Капитаны пока не назначены.</p>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title="Удалить капитана?"
        description="Игрок будет удалён из состава вместе с фотографией. Действие нельзя отменить."
        confirmLabel="Удалить"
        busy={busy}
        onConfirm={removePlayer}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
