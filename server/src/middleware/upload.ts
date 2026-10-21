import multer from 'multer';
import { config } from '../env.js';
import { detectImageType } from '../services/storage.js';
import { badRequest } from './errors.js';

/** Файлы принимаются в память и проверяются по сигнатуре до сохранения на диск. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1,
  },
});

export interface ValidatedUpload {
  buffer: Buffer;
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

/**
 * Проверяет загруженный файл: тип изображения по magic bytes и размер.
 * Исполняемые файлы и подменённые расширения отклоняются.
 */
export function validateImage(file: Express.Multer.File | undefined): ValidatedUpload {
  if (!file) {
    throw badRequest('Файл не получен');
  }
  if (file.size > config.maxUploadBytes) {
    const mb = Math.round(config.maxUploadBytes / (1024 * 1024));
    throw badRequest(`Файл слишком большой. Максимальный размер — ${mb} МБ`);
  }
  if (!file.buffer || file.buffer.length === 0) {
    throw badRequest('Пустой файл');
  }
  const type = detectImageType(file.buffer);
  if (!type) {
    throw badRequest(
      'Поддерживаются только изображения JPG, PNG и WebP. Файл отклонён сервером.',
    );
  }
  return { buffer: file.buffer, mime: type.mime, ext: type.ext };
}
