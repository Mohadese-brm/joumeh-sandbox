// Integration: S3MediaStore against a REAL local MinIO (no Docker). Skipped unless MEDIA_IT=1 and the MEDIA_* env vars point at it.
// Run: MEDIA_IT=1 MEDIA_DRIVER=s3 MEDIA_S3_ENDPOINT=http://127.0.0.1:9100 MEDIA_S3_BUCKET=… MEDIA_S3_ACCESS_KEY_ID=… MEDIA_S3_SECRET_ACCESS_KEY=… npx vitest run tests/media-minio.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { mediaFromEnv } from '../server/media';
import { createDb } from '../server/db';
import { createApp } from '../server/app';
import { DEMO_ADMINS, demoPassword, ADMIN_COOKIE } from '../server/admin';
import { sampleSeed } from './fixtures/sample-seed';

const on = process.env.MEDIA_IT === '1';
describe.skipIf(!on)('S3MediaStore ⇄ local MinIO', () => {
  it('creates the bucket, puts/gets/deletes an object, and the admin upload → /api/media round-trip works through S3', async () => {
    const { S3Client, CreateBucketCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const e = process.env;
    const raw = new S3Client({ endpoint: e.MEDIA_S3_ENDPOINT, region: e.MEDIA_S3_REGION ?? 'us-east-1', forcePathStyle: true,
      credentials: { accessKeyId: e.MEDIA_S3_ACCESS_KEY_ID!, secretAccessKey: e.MEDIA_S3_SECRET_ACCESS_KEY! } });
    await raw.send(new CreateBucketCommand({ Bucket: e.MEDIA_S3_BUCKET! })).catch(err => { if (!/BucketAlready/.test(err.name)) throw err; });
    const store = mediaFromEnv(); expect(store.driver).toBe('s3');
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2048, 7)]);
    await store.put('it/a.png', png, 'image/png');
    const head = await raw.send(new HeadObjectCommand({ Bucket: e.MEDIA_S3_BUCKET!, Key: (e.MEDIA_S3_PREFIX ?? '') + 'it/a.png' }));
    expect(head.ContentType).toBe('image/png'); expect(head.ContentLength).toBe(png.length);
    expect((await store.get('it/a.png'))!.data.equals(png)).toBe(true);
    await store.delete('it/a.png'); expect(await store.get('it/a.png')).toBeNull();

    const app = createApp(await createDb(sampleSeed), { adminDemo: true, media: store });
    const email = DEMO_ADMINS[0].email;
    const c = ([] as string[]).concat((await request(app).post('/api/admin/auth/login').send({ email, password: demoPassword(email) })).headers['set-cookie'] as unknown as string[]).find(x => x.startsWith(ADMIN_COOKIE))!.split(';')[0];
    const up = await request(app).post('/api/admin/products/2/images?alt=' + encodeURIComponent('تست MinIO')).set('Cookie', c).set('Content-Type', 'image/png').send(png);
    expect(up.status).toBe(201); const url = up.body.data.at(-1).url;
    const got = await request(app).get(url); expect(got.status).toBe(200); expect(Buffer.from(got.body).equals(png)).toBe(true);
  });
});
