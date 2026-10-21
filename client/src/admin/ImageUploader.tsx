import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';

interface ImageUploaderProps {
  /** Ключ медиа-файла (не URL). */
  value: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  label?: string;
  hint?: string;
  busy?: boolean;
  shape?: 'portrait' | 'square';
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUploader({
  value,
  onUpload,
  onDelete,
  label = 'Фотография',
  hint = 'JPG, PNG или WebP, до 6 МБ.',
  busy = false,
  shape = 'portrait',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const currentSrc = preview ?? (value ? `/api/media/${value}` : null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      window.alert('Допустимы только изображения JPG, PNG и WebP.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    void onUpload(file);
  };

  return (
    <div className="uploader">
      <div
        className="uploader__preview"
        style={
          shape === 'square'
            ? { width: 132, height: 132 }
            : undefined
        }
      >
        {currentSrc ? (
          <img src={currentSrc} alt="Предпросмотр" />
        ) : (
          <span>Нет фото</span>
        )}
      </div>

      <div className="uploader__controls">
        <div>
          <div className="field__label">{label}</div>
          <div className="field__hint">
            {fileName ? `Выбран файл: ${fileName}. ` : ''}
            {hint}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <div className="uploader__actions">
          <button
            type="button"
            className="btn btn--outline-gold btn--sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload size={14} /> {value || preview ? 'Заменить фото' : 'Загрузить фото'}
          </button>

          {value && (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                setPreview(null);
                setFileName(null);
                void onDelete();
              }}
              disabled={busy}
            >
              <Trash2 size={14} /> Удалить фото
            </button>
          )}
        </div>

        {!value && !preview && (
          <div className="field__hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImagePlus size={14} /> Пока пусто — можно загрузить фотографию
          </div>
        )}
      </div>
    </div>
  );
}
