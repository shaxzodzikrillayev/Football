import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { config } from '../env.js';

export interface ImageType {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

/**
 * Определяет реальный тип изображения по сигнатуре файла (magic bytes).
 * Расширение из имени файла не принимается во внимание.
 */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, index) => buffer[index] === byte)) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

export interface StoredFile {
  key: string;
  url: string;
}

export interface StorageDriver {
  readonly name: string;
  save(buffer: Buffer, ext: string, folder: string): Promise<StoredFile>;
  remove(key: string): Promise<void>;
  read(key: string): Promise<{ stream: Readable; contentType: string; size: number } | null>;
  publicUrl(key: string): string;
}

const KEY_PATTERN = /^[a-z0-9]+(?:[/-][a-z0-9]+)*\.[a-z0-9]+$/;

export function isSafeKey(key: string): boolean {
  if (!KEY_PATTERN.test(key)) return false;
  if (key.includes('..')) return false;
  return true;
}

class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';

  constructor(private readonly root: string) {}

  private resolve(key: string): string | null {
    if (!isSafeKey(key)) return null;
    const full = path.resolve(this.root, key);
    const rootResolved = path.resolve(this.root);
    if (!full.startsWith(rootResolved + path.sep) && full !== rootResolved) return null;
    return full;
  }

  async save(buffer: Buffer, ext: string, folder: string): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'misc';
    const fileName = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const key = `${safeFolder}/${fileName}`;
    const target = path.join(this.root, safeFolder, fileName);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, buffer);
    return { key, url: this.publicUrl(key) };
  }

  async remove(key: string): Promise<void> {
    const full = this.resolve(key);
    if (!full) return;
    try {
      await fsp.unlink(full);
    } catch {
      /* файл уже отсутствует — игнорируем */
    }
  }

  async read(key: string): Promise<{ stream: Readable; contentType: string; size: number } | null> {
    const full = this.resolve(key);
    if (!full) return null;
    if (!fs.existsSync(full)) return null;
    const stat = await fsp.stat(full);
    if (!stat.isFile()) return null;
    const ext = path.extname(full).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return {
      stream: fs.createReadStream(full) as unknown as Readable,
      contentType,
      size: stat.size,
    };
  }

  publicUrl(key: string): string {
    return `/api/media/${key}`;
  }
}

class S3StorageDriver implements StorageDriver {
  readonly name = 's3';
  private clientPromise: Promise<any> | null = null;

  constructor(
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
  ) {}

  private async client(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import('@aws-sdk/client-s3');
        return new S3Client({
          region: config.s3.region,
          endpoint: config.s3.endpoint || undefined,
          forcePathStyle: config.s3.forcePathStyle,
          credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
          },
        });
      })();
    }
    return this.clientPromise;
  }

  async save(buffer: Buffer, ext: string, folder: string): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'misc';
    const fileName = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const key = `${safeFolder}/${fileName}`;
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: this.publicUrl(key) };
  }

  async remove(key: string): Promise<void> {
    if (!isSafeKey(key)) return;
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async read(key: string): Promise<{ stream: Readable; contentType: string; size: number } | null> {
    if (!isSafeKey(key)) return null;
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!result.Body) return null;
      const contentType = result.ContentType ?? 'application/octet-stream';
      const size = result.ContentLength ?? 0;
      return {
        stream: result.Body as unknown as Readable,
        contentType,
        size,
      };
    } catch {
      return null;
    }
  }

  publicUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }
    return `/api/media/${key}`;
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;

  let created: StorageDriver;
  if (config.storageDriver === 's3') {
    if (!config.s3.bucket) {
      throw new Error('STORAGE_DRIVER=s3, но не задан S3_BUCKET в .env');
    }
    created = new S3StorageDriver(config.s3.bucket, config.s3.publicUrl);
  } else {
    created = new LocalStorageDriver(config.uploadDir);
  }

  driver = created;
  return created;
}

export function ensureUploadDirs(): void {
  if (config.storageDriver !== 'local') return;
  for (const folder of ['players', 'coach', 'matches', 'logos', 'misc']) {
    fs.mkdirSync(path.join(config.uploadDir, folder), { recursive: true });
  }
}
