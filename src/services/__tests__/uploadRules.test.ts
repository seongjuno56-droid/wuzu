/** @jest-environment node */
import { AwsClient } from 'aws4fetch';

import { presignPut } from '../../../supabase/functions/_shared/presign';
import { handleSignUpload, type SignUploadDeps } from '../../../supabase/functions/_shared/signUpload';
import { checkUpload, UPLOAD_RULES } from '../../../supabase/functions/_shared/uploadRules';
import { CANVAS_LIMITS } from '../../features/canvas/model';
import { LIMITS } from '../../features/invitation/model';

const MB = 1024 * 1024;
const ID = '11111111-2222-4333-8444-555555555555';

describe('uploadRules', () => {
  it('uploadRules: 허용 안 된 종류·GIF 5MB 초과·동영상 20MB 초과·사진 2MB 초과는 거부', () => {
    expect(checkUpload({ kind: 'exe', contentType: 'image/webp', bytes: 1 })).toEqual({ ok: false, reason: 'kind' });
    expect(checkUpload({ kind: 'constructor', contentType: 'image/webp', bytes: 1 })).toEqual({ ok: false, reason: 'kind' });
    expect(checkUpload({ kind: 'image', contentType: 'image/svg+xml', bytes: 1 })).toEqual({ ok: false, reason: 'type' });
    expect(checkUpload({ kind: 'image', contentType: 'constructor', bytes: 1 })).toEqual({ ok: false, reason: 'type' });
    expect(checkUpload({ kind: 'gif', contentType: 'image/gif', bytes: 5 * MB + 1 })).toEqual({ ok: false, reason: 'size' });
    expect(checkUpload({ kind: 'gif', contentType: 'image/gif', bytes: 5 * MB })).toEqual({ ok: true, ext: 'gif' });
    expect(checkUpload({ kind: 'video', contentType: 'video/mp4', bytes: 20 * MB + 1 })).toEqual({ ok: false, reason: 'size' });
    expect(checkUpload({ kind: 'video', contentType: 'video/quicktime', bytes: 20 * MB })).toEqual({ ok: true, ext: 'mov' });
    expect(checkUpload({ kind: 'image', contentType: 'image/webp', bytes: 2 * MB + 1 })).toEqual({ ok: false, reason: 'size' });
    expect(checkUpload({ kind: 'image', contentType: 'image/webp', bytes: 2 * MB })).toEqual({ ok: true, ext: 'webp' });
    expect(checkUpload({ kind: 'bgm', contentType: 'audio/mpeg', bytes: LIMITS.bgmBytes + 1 })).toEqual({ ok: false, reason: 'size' });
    expect(checkUpload({ kind: 'bgm', contentType: 'audio/mpeg', bytes: LIMITS.bgmBytes })).toEqual({ ok: true, ext: 'mp3' });
    expect(checkUpload({ kind: 'linkThumb', contentType: 'image/webp', bytes: 1 })).toEqual({ ok: false, reason: 'type' });
  });

  it.each([0, -1, 1.5, NaN, '1', null])('크기 %p 는 거부', (bytes) => {
    expect(checkUpload({ kind: 'image', contentType: 'image/webp', bytes })).toEqual({ ok: false, reason: 'size' });
  });

  it('서버 상한은 앱 상한과 같다', () => {
    expect(UPLOAD_RULES.gif.maxBytes).toBe(CANVAS_LIMITS.gifBytes);
    expect(UPLOAD_RULES.video.maxBytes).toBe(CANVAS_LIMITS.videoBytes);
    expect(UPLOAD_RULES.bgm.maxBytes).toBe(LIMITS.bgmBytes);
    expect(CANVAS_LIMITS.gifBytes).toBe(5 * MB);
    expect(CANVAS_LIMITS.videoBytes).toBe(20 * MB);
  });
});

describe('서명 처리', () => {
  const body = { invitationId: ID, kind: 'image', contentType: 'image/webp', bytes: 1000 };
  const deps = (patch: Partial<SignUploadDeps> = {}) => {
    const d = {
      getUserId: jest.fn(async () => 'u1' as string | null),
      record: jest.fn(async () => {}),
      sign: jest.fn(async (key: string) => ({ url: `https://signed/${key}`, headers: { 'content-type': 'image/webp' } })),
      randomId: () => 'a'.repeat(32),
      ...patch,
    };
    return d as typeof d & SignUploadDeps;
  };

  it('로그인 토큰이 없거나 틀리면 401 이고 서명하지 않는다', async () => {
    const d = deps({ getUserId: jest.fn(async () => null) });
    expect((await handleSignUpload(null, body, d)).status).toBe(401);
    expect((await handleSignUpload('bad', body, d)).status).toBe(401);
    expect(d.sign).not.toHaveBeenCalled();
  });

  it('잘못된 요청은 400 이고 기록도 서명도 하지 않는다', async () => {
    const d = deps();
    for (const bad of [null, 'x', {}, { ...body, invitationId: 'inv-1' }, { ...body, kind: 'exe' }, { ...body, bytes: 3 * MB }]) {
      expect((await handleSignUpload('t', bad, d)).status).toBe(400);
    }
    expect(d.record).not.toHaveBeenCalled();
    expect(d.sign).not.toHaveBeenCalled();
  });

  it('남의 초대장이면 403 이고 서명하지 않는다', async () => {
    const d = deps({ record: jest.fn(async () => Promise.reject(new Error('NOT_FOUND'))) });
    expect((await handleSignUpload('t', body, d)).status).toBe(403);
    expect(d.sign).not.toHaveBeenCalled();
  });

  it('키는 invitations/<id>/<난수>.<확장자> 이고 요청한 값으로 기록한다', async () => {
    const d = deps();
    const r = await handleSignUpload('t', body, d);
    const key = `invitations/${ID}/${'a'.repeat(32)}.webp`;
    expect(r).toEqual({ status: 200, body: { key, url: `https://signed/${key}`, headers: { 'content-type': 'image/webp' } } });
    expect(d.record).toHaveBeenCalledWith('t', { invitationId: ID, key, kind: 'image', bytes: 1000 });
    expect(d.sign).toHaveBeenCalledWith(key, 'image/webp', 1000);
  });

  it('작은 사진은 본 이미지 키에서 이름을 만들고, 다른 초대장 키나 다른 확장자는 거부한다', async () => {
    const d = deps();
    const main = `invitations/${ID}/${'b'.repeat(32)}.webp`;
    const thumb = { ...body, kind: 'thumb', mainKey: main };
    const r = await handleSignUpload('t', thumb, d);
    expect((r.body as { key: string }).key).toBe(`invitations/${ID}/${'b'.repeat(32)}_thumb.webp`);
    for (const mainKey of [
      undefined,
      `invitations/other/${'b'.repeat(32)}.webp`,
      `invitations/${ID}/../x.webp`,
      `invitations/${ID}/${'b'.repeat(32)}.jpg`,
    ]) {
      expect((await handleSignUpload('t', { ...thumb, mainKey }, d)).status).toBe(400);
    }
  });

  it('내부 오류 내용은 응답에 나가지 않는다', async () => {
    const d = deps({ sign: jest.fn(async () => Promise.reject(new Error('SECRET_VALUE'))) });
    const r = await handleSignUpload('t', body, d);
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('SECRET_VALUE');
  });
});

describe('presignPut', () => {
  const r2 = { accountId: 'acc123', bucket: 'wuzu-media' };
  const client = new AwsClient({ accessKeyId: 'AKIDTEST', secretAccessKey: 'SECRETTEST', service: 's3', region: 'auto' });

  it('R2 주소에 서명하고 종류와 크기를 서명에 묶어 다른 크기를 올리지 못하게 한다. 비밀 키는 주소에 없다', async () => {
    const r = await presignPut(client, r2, 'invitations/a/b.webp', 'image/webp', 1234);
    const url = new URL(r.url);
    expect(url.origin).toBe('https://acc123.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/wuzu-media/invitations/a/b.webp');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual(
      expect.arrayContaining(['content-length', 'content-type', 'host']),
    );
    expect(r.url).not.toContain('SECRETTEST');
    expect(r.headers).toEqual({ 'content-type': 'image/webp', 'content-length': '1234' });
  });

  it('크기가 서명에 들어가지 않으면 주소를 내주지 않는다', async () => {
    const signer = { sign: jest.fn(async () => ({ url: 'https://x/y?X-Amz-SignedHeaders=host&X-Amz-Signature=a' })) };
    await expect(presignPut(signer, r2, 'k', 'image/webp', 1)).rejects.toThrow();
  });
});
