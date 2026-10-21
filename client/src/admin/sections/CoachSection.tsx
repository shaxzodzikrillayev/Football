import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/Toast';
import { useSite } from '../../services/SiteContext';
import ImageUploader from '../ImageUploader';
import type { Coach } from '@shared/types';

export default function CoachSection() {
  const { notify } = useToast();
  const { reload } = useSite();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [caption, setCaption] = useState('Наш наставник');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getCoach()
      .then((data) => {
        if (cancelled) return;
        setCoach(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setCaption(data.caption);
      })
      .catch(() => notify('Не удалось загрузить данные наставника', 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await adminApi.patchCoach({ firstName, lastName, caption });
      setCoach(updated);
      notify('Данные наставника сохранены');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const updated = await adminApi.uploadCoachPhoto(file);
      setCoach(updated);
      notify('Фотография наставника загружена');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить фото', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async () => {
    try {
      const updated = await adminApi.deleteCoachPhoto();
      setCoach(updated);
      notify('Фотография удалена', 'info');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить фото', 'error');
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем данные…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <div>
          <h2 className="admin-panel__title">Наставник команды</h2>
          <p className="admin-panel__hint">
            Эта карточка размещена на первом экране сайта. Имя, фамилию, подпись и фотографию можно
            изменить здесь — изменения сразу появятся на сайте.
          </p>
        </div>
      </div>

      <ImageUploader
        value={coach?.photo ?? null}
        onUpload={uploadPhoto}
        onDelete={deletePhoto}
        busy={uploading}
        label="Фотография наставника"
        hint="Лучше вертикальный снимок (3:4). JPG, PNG или WebP, до 6 МБ."
      />

      <form onSubmit={save}>
        <div className="form-grid" style={{ marginTop: 22 }}>
          <label className="field">
            <span className="field__label">Имя</span>
            <input
              className="input"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Например, Анна"
            />
          </label>

          <label className="field">
            <span className="field__label">Фамилия</span>
            <input
              className="input"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Например, Петрова"
            />
          </label>

          <label className="field">
            <span className="field__label">Подпись</span>
            <input
              className="input"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Наш наставник"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--gold" disabled={saving}>
            <Save size={15} /> {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
