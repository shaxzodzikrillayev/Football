import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ImageUploader from '../ImageUploader';
import { FORMATIONS } from '@shared/formations';
import type { FormationCode, SiteSettings } from '@shared/types';

const COLOR_FIELDS: { key: keyof SiteSettings; label: string }[] = [
  { key: 'primaryColor', label: 'Акцентный цвет (золото)' },
  { key: 'backgroundColor', label: 'Фон сайта' },
  { key: 'surfaceColor', label: 'Фон карточек' },
  { key: 'textColor', label: 'Цвет текста' },
  { key: 'mutedColor', label: 'Приглушённый текст' },
];

export default function SettingsSection() {
  const { notify } = useToast();
  const { reload } = useSite();

  const [form, setForm] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getSettings()
      .then((data) => {
        if (!cancelled) setForm(data);
      })
      .catch(() => notify('Не удалось загрузить настройки', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateSocial = (key: keyof SiteSettings['socials'], value: string) => {
    setForm((current) =>
      current ? { ...current, socials: { ...current.socials, [key]: value } } : current,
    );
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await adminApi.patchSettings(form);
      notify('Настройки сохранены');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить настройки', 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const settings = await adminApi.uploadLogo(file);
      setForm(settings);
      notify('Логотип загружен');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить логотип', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteLogo = async () => {
    try {
      const settings = await adminApi.deleteLogo();
      setForm(settings);
      notify('Логотип удалён', 'info');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить логотип', 'error');
    }
  };

  if (loading || !form) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем настройки…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Настройки сайта</h2>
            <p className="admin-panel__hint">
              Тексты, контакты и цвета применяются на публичном сайте сразу после сохранения.
            </p>
          </div>
        </div>

        <ImageUploader
          value={form.logo}
          onUpload={uploadLogo}
          onDelete={deleteLogo}
          busy={uploading}
          label="Логотип клуба"
          shape="square"
          hint="JPG, PNG или WebP, до 6 МБ. Если логотипа нет — используется нарисованный щит."
        />
      </div>

      <form onSubmit={save}>
        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Тексты и название</h3>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Название клуба</span>
              <input
                className="input"
                value={form.clubName}
                onChange={(event) => update('clubName', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Подзаголовок (латиница)</span>
              <input
                className="input"
                value={form.subtitle}
                onChange={(event) => update('subtitle', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Девиз</span>
              <input
                className="input"
                value={form.motto}
                onChange={(event) => update('motto', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Цитата на первом экране</span>
              <input
                className="input"
                value={form.heroQuote}
                onChange={(event) => update('heroQuote', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Текст в подвале</span>
              <input
                className="input"
                value={form.footerText}
                onChange={(event) => update('footerText', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Контакты</h3>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">E-mail</span>
              <input
                className="input"
                type="email"
                value={form.contactEmail}
                onChange={(event) => update('contactEmail', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Телефон</span>
              <input
                className="input"
                value={form.contactPhone}
                onChange={(event) => update('contactPhone', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Адрес</span>
              <input
                className="input"
                value={form.contactAddress}
                onChange={(event) => update('contactAddress', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Примечание</span>
              <textarea
                className="textarea"
                value={form.contactNote}
                onChange={(event) => update('contactNote', event.target.value)}
              />
            </label>
          </div>

          <div className="form-grid" style={{ marginTop: 18 }}>
            <label className="field">
              <span className="field__label">Instagram</span>
              <input
                className="input"
                value={form.socials.instagram}
                placeholder="https://instagram.com/..."
                onChange={(event) => updateSocial('instagram', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Telegram</span>
              <input
                className="input"
                value={form.socials.telegram}
                placeholder="https://t.me/..."
                onChange={(event) => updateSocial('telegram', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">YouTube</span>
              <input
                className="input"
                value={form.socials.youtube}
                placeholder="https://youtube.com/..."
                onChange={(event) => updateSocial('youtube', event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">VK</span>
              <input
                className="input"
                value={form.socials.vk}
                placeholder="https://vk.com/..."
                onChange={(event) => updateSocial('vk', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Цвета оформления</h3>
          </div>

          <div className="form-grid">
            {COLOR_FIELDS.map((field) => {
              const value = String(form[field.key] ?? '#000000');
              return (
                <label className="field" key={field.key}>
                  <span className="field__label">{field.label}</span>
                  <input
                    className="input input--color"
                    type="color"
                    value={value}
                    onChange={(event) =>
                      update(field.key, event.target.value as SiteSettings[typeof field.key])
                    }
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__head">
            <h3 className="admin-panel__title">Правила сайта</h3>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Схема по умолчанию</span>
              <select
                className="select"
                value={form.defaultFormation}
                onChange={(event) =>
                  update('defaultFormation', event.target.value as FormationCode)
                }
              >
                {FORMATIONS.map((formation) => (
                  <option key={formation.code} value={formation.code}>
                    {formation.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span className="field__label">Игровые номера</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.uniqueNumbers}
                  onChange={(event) => update('uniqueNumbers', event.target.checked)}
                />
                <span className="switch__track">
                  <span className="switch__thumb" />
                </span>
                <span className="field__hint">
                  {form.uniqueNumbers
                    ? 'Номера уникальны — повторный номер сохранить нельзя'
                    : 'Номера могут совпадать'}
                </span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn--gold btn--sm" disabled={busy || uploading}>
              <Save size={14} /> {busy ? 'Сохраняем…' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
