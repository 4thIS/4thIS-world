import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API, ApiErrorSchema } from '@4this/shared';
import { cacheControlFor, isSpaRoute } from './static';
import { makeTestApp, type TestApp } from './testing';

describe('cacheControlFor', () => {
  it('해시 산출물은 1년, index.html은 no-cache, 나머지는 1시간', () => {
    expect(cacheControlFor('index.html')).toBe('no-cache');
    expect(cacheControlFor('assets/index-CtxTW07n.js')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('assets/kaykit/bench.gltf')).toBe('public, max-age=3600');
    expect(cacheControlFor('favicon.svg')).toBe('public, max-age=3600');
  });
});

describe('isSpaRoute', () => {
  it('/api·/socket.io·파일·GET 외는 제외', () => {
    expect(isSpaRoute('GET', '/')).toBe(true);
    expect(isSpaRoute('GET', '/admin?tab=1')).toBe(true);
    expect(isSpaRoute('HEAD', '/me/schedule')).toBe(true);
    expect(isSpaRoute('GET', '/api/nope')).toBe(false);
    expect(isSpaRoute('GET', '/api')).toBe(false);
    expect(isSpaRoute('GET', '/socket.io/x')).toBe(false);
    expect(isSpaRoute('GET', '/assets/missing.js')).toBe(false);
    expect(isSpaRoute('POST', '/admin')).toBe(false);
  });
});

describe('WEB_DIST 정적 서빙', () => {
  let dir: string;
  let t: TestApp;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'web-dist-'));
    mkdirSync(join(dir, 'assets', 'kaykit'), { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>4thIS-world</title>');
    writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
    writeFileSync(join(dir, 'assets', 'kaykit', 'bench.gltf'), '{}');
    t = await makeTestApp({ webDist: dir });
  });
  afterAll(async () => {
    await t.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('/는 index.html (no-cache)', async () => {
    const res = await t.app.inject('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('4thIS-world');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('화면 경로는 index.html로 돌려준다', async () => {
    const res = await t.app.inject('/admin');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('해시 산출물은 장기 캐시, 에셋 폴더는 짧은 캐시', async () => {
    const js = await t.app.inject('/assets/index-abc123.js');
    expect(js.statusCode).toBe(200);
    expect(js.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const model = await t.app.inject('/assets/kaykit/bench.gltf');
    expect(model.statusCode).toBe(200);
    expect(model.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('없는 파일과 /api는 JSON 404', async () => {
    for (const url of ['/assets/missing.js', '/api/nope']) {
      const res = await t.app.inject(url);
      expect(res.statusCode).toBe(404);
      expect(ApiErrorSchema.parse(res.json()).error).toBe('not_found');
    }
  });

  it('API는 그대로 동작한다', async () => {
    expect((await t.app.inject(API.health)).json()).toEqual({ ok: true });
  });
});
