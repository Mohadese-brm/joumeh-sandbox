// Product-image storage (admin-v1). One small adapter interface, three implementations:
//   • MemoryMediaStore — default; tests and the in-memory Vercel preview (uploads vanish on restart / are per serverless instance)
//   • DiskMediaStore   — MEDIA_DRIVER=disk, files under MEDIA_DIR (local dev)
//   • S3MediaStore     — MEDIA_DRIVER=s3, any S3-compatible bucket (MinIO, Gerdoo object storage, AWS), configured ONLY via MEDIA_* env vars.
// Which bucket/CDN production uses is a placeholder (ADMIN-PH-MEDIA). Validation (type by magic bytes, size) is here so every driver gets it.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type MediaObject = { data: Buffer; mime: string };
export interface MediaStore {
  readonly driver: 'memory' | 'disk' | 's3';
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<MediaObject | null>;
  delete(key: string): Promise<void>;
  /** URL the shop/admin uses for the image: /api/media/<key> (served by this app) or MEDIA_PUBLIC_BASE_URL/<key>. */
  url(key: string): string;
}

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024; // 5 MB (CEO brief)
export const MEDIA_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export type MediaMime = keyof typeof MEDIA_TYPES;
/** The real type from the first bytes (never trust the browser's Content-Type or the file name). */
export function sniffImage(b: Buffer): MediaMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
/** Persian error message, or null when the file is acceptable. */
export function checkImage(b: Buffer | undefined): { error: string; message: string } | { mime: MediaMime } {
  if (!b || !b.length) return { error: 'file_required', message: 'فایل تصویر انتخاب نشده است' };
  if (b.length > MEDIA_MAX_BYTES) return { error: 'file_too_large', message: 'حجم تصویر باید حداکثر ۵ مگابایت باشد' };
  const mime = sniffImage(b);
  return mime ? { mime } : { error: 'file_type', message: 'فقط تصویر JPG، PNG یا WebP مجاز است' };
}
const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;
const safeKey = (k: string) => { if (!KEY_RE.test(k) || k.includes('..')) throw new Error('bad_media_key'); return k; };

export class MemoryMediaStore implements MediaStore {
  readonly driver = 'memory' as const;
  private m = new Map<string, MediaObject>();
  async put(key: string, data: Buffer, mime: string) { this.m.set(safeKey(key), { data: Buffer.from(data), mime }); }
  async get(key: string) { return this.m.get(key) ?? null; }
  async delete(key: string) { this.m.delete(key); }
  url(key: string) { return `/api/media/${key}`; }
}

export class DiskMediaStore implements MediaStore {
  readonly driver = 'disk' as const;
  private root: string;
  constructor(dir: string) { this.root = resolve(dir); }
  private path(key: string) { const p = resolve(join(this.root, safeKey(key))); if (!p.startsWith(this.root + '/')) throw new Error('bad_media_key'); return p; }
  async put(key: string, data: Buffer, mime: string) {
    const p = this.path(key); await mkdir(resolve(p, '..'), { recursive: true });
    await writeFile(p, data); await writeFile(p + '.mime', mime);
  }
  async get(key: string) {
    try { const p = this.path(key); return { data: await readFile(p), mime: (await readFile(p + '.mime', 'utf8')).trim() }; } catch { return null; }
  }
  async delete(key: string) { const p = this.path(key); await rm(p, { force: true }); await rm(p + '.mime', { force: true }); }
  url(key: string) { return `/api/media/${key}`; }
}

/** The subset of @aws-sdk/client-s3 this store needs (lets tests pass a mock client). */
export type S3Like = { send(cmd: unknown): Promise<unknown> };
export type S3Config = { endpoint?: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; forcePathStyle: boolean; publicBaseUrl?: string; prefix: string };
export class S3MediaStore implements MediaStore {
  readonly driver = 's3' as const;
  private client: Promise<{ c: S3Like; mod: typeof import('@aws-sdk/client-s3') }>;
  constructor(readonly cfg: S3Config, client?: S3Like) {
    this.client = import('@aws-sdk/client-s3').then(mod => ({ mod, c: client ?? new mod.S3Client({
      region: cfg.region, endpoint: cfg.endpoint, forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } }) }));
  }
  private k(key: string) { return this.cfg.prefix + safeKey(key); }
  async put(key: string, data: Buffer, mime: string) {
    const { c, mod } = await this.client;
    await c.send(new mod.PutObjectCommand({ Bucket: this.cfg.bucket, Key: this.k(key), Body: data, ContentType: mime, CacheControl: 'public, max-age=31536000, immutable' }));
  }
  async get(key: string) {
    const { c, mod } = await this.client;
    try {
      const r = await c.send(new mod.GetObjectCommand({ Bucket: this.cfg.bucket, Key: this.k(key) })) as { Body?: { transformToByteArray(): Promise<Uint8Array> }; ContentType?: string };
      if (!r.Body) return null;
      return { data: Buffer.from(await r.Body.transformToByteArray()), mime: r.ContentType ?? 'application/octet-stream' };
    } catch (e) { const n = (e as { name?: string; $metadata?: { httpStatusCode?: number } }); if (n.name === 'NoSuchKey' || n.$metadata?.httpStatusCode === 404) return null; throw e; }
  }
  async delete(key: string) { const { c, mod } = await this.client; await c.send(new mod.DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: this.k(key) })); }
  /** With MEDIA_PUBLIC_BASE_URL (bucket/CDN is public) images load straight from it; otherwise this app proxies /api/media/<key>. */
  url(key: string) { return this.cfg.publicBaseUrl ? `${this.cfg.publicBaseUrl.replace(/\/$/, '')}/${this.k(key)}` : `/api/media/${key}`; }
}

/** MEDIA_DRIVER = memory (default) | disk | s3. Missing S3 settings fail loudly at start-up (names only, never values). */
export function mediaFromEnv(env: Record<string, string | undefined> = process.env): MediaStore {
  const d = (env.MEDIA_DRIVER ?? 'memory').toLowerCase();
  if (d === 'memory') return new MemoryMediaStore();
  if (d === 'disk') return new DiskMediaStore(env.MEDIA_DIR || '.media');
  if (d === 's3') {
    const need = ['MEDIA_S3_BUCKET', 'MEDIA_S3_ACCESS_KEY_ID', 'MEDIA_S3_SECRET_ACCESS_KEY'].filter(k => !env[k]);
    if (need.length) throw new Error(`MEDIA_DRIVER=s3 needs ${need.join(', ')}`);
    return new S3MediaStore({ endpoint: env.MEDIA_S3_ENDPOINT || undefined, region: env.MEDIA_S3_REGION || 'us-east-1', bucket: env.MEDIA_S3_BUCKET!,
      accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID!, secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY!,
      forcePathStyle: env.MEDIA_S3_FORCE_PATH_STYLE !== '0', publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL || undefined, prefix: env.MEDIA_S3_PREFIX ?? '' });
  }
  throw new Error(`unknown MEDIA_DRIVER "${d}" (memory | disk | s3)`);
}
