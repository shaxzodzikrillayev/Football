import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Dumbbell,
  Eye,
  EyeOff,
  Flag,
  Flame,
  Heart,
  Medal,
  Pencil,
  Plus,
  Save,
  Star,
  Target,
  Trash2,
  Trophy,
  Users,
  Zap,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { VALUE_ICONS, MAX_CLUB_VALUES } from '@shared/values';
import type { ClubValue, ValueIcon } from '@shared/types';

const ICONS: Record<ValueIcon, LucideIcon> = {
  star: Star,
  trophy: Trophy,
  flag: Flag,
  users: Users,
  dumbbell: Dumbbell,
  heart: Heart,
  target: Target,
  shield: Shield,
  flame: Flame,
  medal: Medal,
  zap: Zap,
  crown: Crown,
};

function ValueEditor({
  value,
  onSaved,
}: {
  value: ClubValue | null;
  onSaved: () => Promise<void>;
}) {
  const { notify } = useToast();
  const [icon, setIcon] = useState<ValueIcon>('star');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setIsNew(!value);
    setIcon(value?.icon ?? 'star');
    setTitle(value?.title ?? '');
    setText(value?.text ?? '');
  }, [value]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      notify('Укажите заголовок карточки', 'error');
      return;
    }
    setBusy(true);
    try {
      if (isNew) {
        await adminApi.createValue({ icon, title, text, isVisible: true });
        notify('Ценность добавлена');
      } else {
        await adminApi.updateValue(value!.id, { icon, title, text });
        notify('Ценность обновлена');
      }
      await onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <h3 className="admin-panel__title">
          <Pencil size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {isNew ? 'Новая ценность' : 'Редактирование'}
        </h3>
      </div>

      <form onSubmit={save}>
        <div className="form-grid">
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field__label">Иконка</span>
            <div className="value-icons">
              {VALUE_ICONS.map((item) => {
                const Icon = ICONS[item.key];
                const active = icon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`value-icons__item ${active ? 'is-active' : ''}`.trim()}
                    onClick={() => setIcon(item.key)}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          </label>

          <label className="field">
            <span className="field__label">Заголовок</span>
            <input
              className="input"
              value={title}
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Сила в единству"
            />
          </label>

          <label className="field">
            <span className="field__label">Описание</span>
            <input
              className="input"
              value={text}
              maxLength={220}
              onChange={(event) => setText(event.target.value)}
              placeholder="Короткое описание ценности клуба"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--gold btn--sm" disabled={busy}>
            <Save size={14} /> {busy ? 'Сохраняем…' : isNew ? 'Добавить' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ValuesSection() {
  const { notify } = useToast();
  const { reload } = useSite();
  const [values, setValues] = useState<ClubValue[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClubValue | null>(null);

  const load = async () => {
    const list = await adminApi.listValues();
    setValues(list);
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => notify('Не удалось загрузить ценности', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = values.find((value) => value.id === selectedId) ?? null;

  const refresh = async () => {
    await load();
    await reload();
  };

  const toggleVisible = async (value: ClubValue) => {
    setBusy(true);
    try {
      await adminApi.updateValue(value.id, { isVisible: !value.isVisible });
      notify(value.isVisible ? 'Карточка скрыта на сайте' : 'Карточка показана на сайте');
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить видимость', 'error');
    } finally {
      setBusy(false);
    }
  };

  const move = async (value: ClubValue, direction: -1 | 1) => {
    const index = values.findIndex((item) => item.id === value.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= values.length) return;
    const ordered = [...values];
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    setBusy(true);
    try {
      await adminApi.reorderValues(ordered.map((item) => item.id));
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось изменить порядок', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await adminApi.deleteValue(confirmDelete.id);
      notify('Ценность удалена', 'info');
      setConfirmDelete(null);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем ценности…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-grid admin-grid--2">
        <ValueEditor
          value={selected}
          onSaved={async () => {
            setSelectedId(null);
            await refresh();
          }}
        />

        <div className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Карточки ценностей</h2>
              <p className="admin-panel__hint">
                Эти карточки показываются на главной странице под 3D-полем. Максимум{' '}
                {MAX_CLUB_VALUES} штук, скрытые не выводятся на сайт.
              </p>
            </div>
          </div>

          <div className="value-list">
            {values.map((value, index) => {
              const Icon = ICONS[value.icon] ?? Star;
              return (
                <div
                  key={value.id}
                  className={`value-list__item ${value.id === selectedId ? 'is-selected' : ''} ${
                    value.isVisible ? '' : 'is-hidden'
                  }`.trim()}
                >
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => move(value, -1)}
                    disabled={busy || index === 0}
                    aria-label="Выше"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => move(value, 1)}
                    disabled={busy || index === values.length - 1}
                    aria-label="Ниже"
                  >
                    <ChevronDown size={15} />
                  </button>

                  <span className="value-list__icon">
                    <Icon size={17} />
                  </span>

                  <button
                    type="button"
                    className="value-list__body"
                    onClick={() => setSelectedId(value.id)}
                  >
                    <strong>{value.title}</strong>
                    <small>{value.text || 'Без описания'}</small>
                  </button>

                  <div className="table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => toggleVisible(value)}
                      disabled={busy}
                      aria-label={value.isVisible ? 'Скрыть' : 'Показать'}
                      title={value.isVisible ? 'Скрыть с сайта' : 'Показать на сайте'}
                    >
                      {value.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => setConfirmDelete(value)}
                      disabled={busy}
                      aria-label="Удалить"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {values.length < MAX_CLUB_VALUES && (
              <button
                type="button"
                className="value-list__add"
                onClick={() => setSelectedId(null)}
              >
                <Plus size={15} /> Добавить карточку
              </button>
            )}

            {values.length === 0 && (
              <p className="field__hint">
                Карточек пока нет — добавьте первую, чтобы блок «Ценности клуба» появился на сайте.
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Удалить карточку?"
        description="Ценность исчезнет с сайта навсегда. Действие нельзя отменить."
        confirmLabel="Удалить"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
