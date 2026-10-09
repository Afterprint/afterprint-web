import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

type ApiModule = typeof import('../../src/lib/api');

const realFetch = globalThis.fetch;

/** Load a fresh copy so the module re-reads NEXT_PUBLIC_API_BASE_URL. */
let counter = 0;
async function load(base: string | undefined): Promise<ApiModule> {
  if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  counter += 1;
  return import(`../../src/lib/api?v=${counter}`);
}

function stubFetch(response: Response | (() => Response)) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return typeof response === 'function' ? response() : response;
  }) as unknown as typeof fetch;
  return calls;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('is not configured without NEXT_PUBLIC_API_BASE_URL', async () => {
  const { api, configured } = await load(undefined);
  assert.equal(configured, false);
  await assert.rejects(api('/cases'), /API not configured/);
});

test('is configured when the base URL is set', async () => {
  assert.equal((await load('http://localhost:4000')).configured, true);
});

test('calls /v1 under the base URL and includes credentials', async () => {
  const { api } = await load('http://localhost:4000');
  const calls = stubFetch(json([{ id: 'c1' }]));

  assert.deepEqual(await api('/cases'), [{ id: 'c1' }]);
  assert.equal(calls[0].url, 'http://localhost:4000/v1/cases');
  assert.equal(calls[0].init.credentials, 'include');
});

test('a trailing slash on the base URL does not double up', async () => {
  const { api } = await load('http://localhost:4000/');
  const calls = stubFetch(json({}));
  await api('/health');
  assert.equal(calls[0].url, 'http://localhost:4000/v1/health');
});

test('the request-origin header is sent on writes only', async () => {
  const { api } = await load('http://localhost:4000');
  const calls = stubFetch(() => json({}));

  await api('/cases');
  await api('/cases', { method: 'GET' });
  for (const method of ['POST', 'PATCH', 'DELETE']) await api('/cases', { method });

  const header = (i: number) =>
    (calls[i].init.headers as Record<string, string>)['X-Afterprint-Request'];
  assert.equal(header(0), undefined);
  assert.equal(header(1), undefined);
  assert.deepEqual([header(2), header(3), header(4)], ['1', '1', '1']);
});

test('JSON is the default content type but a caller header can override it', async () => {
  const { api } = await load('http://localhost:4000');
  const calls = stubFetch(() => json({}));
  await api('/a');
  await api('/b', { headers: { 'Content-Type': 'text/plain' } });
  assert.equal(
    (calls[0].init.headers as Record<string, string>)['Content-Type'],
    'application/json',
  );
  assert.equal((calls[1].init.headers as Record<string, string>)['Content-Type'], 'text/plain');
});

test('a 204 resolves to undefined', async () => {
  const { api } = await load('http://localhost:4000');
  stubFetch(new Response(null, { status: 204 }));
  assert.equal(await api('/auth/logout', { method: 'POST' }), undefined);
});

test('an error uses the message from the API body', async () => {
  const { api } = await load('http://localhost:4000');
  stubFetch(json({ message: 'Case permission denied' }, 403));
  await assert.rejects(api('/cases/x'), /Case permission denied/);
});

test('an error without a message falls back to the status', async () => {
  const { api } = await load('http://localhost:4000');
  stubFetch(json({}, 500));
  await assert.rejects(api('/cases'), /Request failed \(500\)/);
});

test('a non-JSON error body still gives a useful message', async () => {
  const { api } = await load('http://localhost:4000');
  stubFetch(new Response('<html>Bad gateway</html>', { status: 502 }));
  await assert.rejects(api('/cases'), /Request failed \(502\)/);
});
