import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORWARDED_REQUEST_HEADERS,
  forwardedRequestHeaders,
  proxyRequest,
  responseHeaders,
  upstreamUrl,
  type ProxyInput,
} from '../../src/lib/proxy';

const UPSTREAM = 'https://api.example.com';

/* -------------------------------------------------------------------------- */
/* upstreamUrl                                                                 */
/* -------------------------------------------------------------------------- */

test('maps a v1 path onto the upstream, keeping the query string', () => {
  assert.equal(
    upstreamUrl(UPSTREAM, ['v1', 'cases', 'abc'], '?limit=5&q=x'),
    'https://api.example.com/v1/cases/abc?limit=5&q=x',
  );
  assert.equal(upstreamUrl(UPSTREAM, ['v1', 'health'], ''), 'https://api.example.com/v1/health');
});

test('a trailing slash on the upstream does not double up', () => {
  assert.equal(
    upstreamUrl(`${UPSTREAM}/`, ['v1', 'health'], ''),
    'https://api.example.com/v1/health',
  );
});

test('only the /v1 API is proxied', () => {
  for (const path of [[], ['v2', 'cases'], ['admin'], ['internal', 'v1'], ['V1', 'cases']]) {
    assert.equal(upstreamUrl(UPSTREAM, path, ''), null, JSON.stringify(path));
  }
});

test('path traversal segments are refused', () => {
  for (const path of [
    ['v1', '..', 'admin'],
    ['v1', 'cases', '..', '..', 'secret'],
    ['v1', '.', 'cases'],
    ['v1', '..'],
  ]) {
    assert.equal(upstreamUrl(UPSTREAM, path, ''), null, JSON.stringify(path));
  }
});

test('empty segments are refused', () => {
  assert.equal(upstreamUrl(UPSTREAM, ['v1', '', 'cases'], ''), null);
});

test('each segment is percent-encoded so it cannot change the route', () => {
  assert.equal(
    upstreamUrl(UPSTREAM, ['v1', 'cases', 'a/b', 'c?d=1', 'e#f'], ''),
    'https://api.example.com/v1/cases/a%2Fb/c%3Fd%3D1/e%23f',
  );
  assert.equal(
    upstreamUrl(UPSTREAM, ['v1', '%2e%2e'], ''),
    'https://api.example.com/v1/%252e%252e',
    'an already-encoded dot segment must stay a literal name',
  );
});

/* -------------------------------------------------------------------------- */
/* Headers                                                                     */
/* -------------------------------------------------------------------------- */

test('only allow-listed request headers are forwarded', () => {
  const source = new Headers({
    'content-type': 'application/json',
    cookie: 'afterprint_session=abc',
    'x-afterprint-request': '1',
    'idempotency-key': 'k1',
    origin: 'https://app.example.com',
    authorization: 'Bearer should-not-pass',
    'x-forwarded-for': '1.2.3.4',
    host: 'app.example.com',
    'x-internal-admin': 'yes',
  });
  const forwarded = forwardedRequestHeaders(source);

  assert.deepEqual([...forwarded.keys()].sort(), [...FORWARDED_REQUEST_HEADERS].sort());
  assert.equal(forwarded.get('cookie'), 'afterprint_session=abc');
  assert.equal(forwarded.get('authorization'), null);
  assert.equal(forwarded.get('x-forwarded-for'), null);
  assert.equal(forwarded.get('host'), null);
});

test('missing request headers are simply left out', () => {
  assert.deepEqual([...forwardedRequestHeaders(new Headers({ cookie: 'a=b' })).keys()], ['cookie']);
});

test('response headers keep the content type, every cookie, and add no-store', () => {
  const upstream = new Response('{}', { headers: { 'content-type': 'application/json' } });
  upstream.headers.append(
    'set-cookie',
    'afterprint_session=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
  );
  upstream.headers.append('set-cookie', 'other=1; Path=/');
  upstream.headers.set('x-powered-by', 'internal');
  upstream.headers.set('server', 'nginx');

  const headers = responseHeaders(upstream);

  assert.equal(headers.get('content-type'), 'application/json');
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.deepEqual(headers.getSetCookie(), [
    'afterprint_session=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
    'other=1; Path=/',
  ]);
  assert.equal(headers.get('x-powered-by'), null);
  assert.equal(headers.get('server'), null);
});

/* -------------------------------------------------------------------------- */
/* proxyRequest                                                                */
/* -------------------------------------------------------------------------- */

function input(overrides: Partial<ProxyInput> = {}): ProxyInput {
  return {
    method: 'GET',
    headers: new Headers({ cookie: 'afterprint_session=abc', authorization: 'nope' }),
    search: '',
    readBody: async () => new TextEncoder().encode('{"a":1}').buffer as ArrayBuffer,
    ...overrides,
  };
}

function recorder(
  response: Response | (() => Response) = new Response('{"ok":true}', { status: 200 }),
) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return typeof response === 'function' ? response() : response;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

test('without an upstream configured the answer is 503 and nothing is called', async () => {
  const { calls, fetchImpl } = recorder();
  const previous = process.env.API_UPSTREAM_URL;
  delete process.env.API_UPSTREAM_URL;
  try {
    const response = await proxyRequest(input(), ['v1', 'health'], { fetchImpl });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { message: 'Live API upstream is not configured' });
    assert.equal(calls.length, 0);
  } finally {
    if (previous !== undefined) process.env.API_UPSTREAM_URL = previous;
  }
});

test('a path outside /v1 is a 404 and nothing is called', async () => {
  const { calls, fetchImpl } = recorder();
  for (const path of [['admin'], ['v1', '..', 'admin']]) {
    const response = await proxyRequest(input(), path, { upstream: UPSTREAM, fetchImpl });
    assert.equal(response.status, 404);
  }
  assert.equal(calls.length, 0);
});

test('a GET is forwarded without a body and with only the allow-listed headers', async () => {
  const { calls, fetchImpl } = recorder();
  const response = await proxyRequest(input({ search: '?x=1' }), ['v1', 'cases'], {
    upstream: UPSTREAM,
    fetchImpl,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.example.com/v1/cases?x=1');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(calls[0].init.cache, 'no-store');
  const sent = calls[0].init.headers as Headers;
  assert.equal(sent.get('cookie'), 'afterprint_session=abc');
  assert.equal(sent.get('authorization'), null);
});

test('a POST forwards its body', async () => {
  const { calls, fetchImpl } = recorder();
  await proxyRequest(input({ method: 'POST' }), ['v1', 'cases'], { upstream: UPSTREAM, fetchImpl });
  assert.equal(new TextDecoder().decode(calls[0].init.body as ArrayBuffer), '{"a":1}');
});

test('the body is not read for a GET or HEAD', async () => {
  const { fetchImpl } = recorder();
  let reads = 0;
  const readBody = async () => {
    reads += 1;
    return new ArrayBuffer(0);
  };
  await proxyRequest(input({ method: 'GET', readBody }), ['v1', 'a'], {
    upstream: UPSTREAM,
    fetchImpl,
  });
  await proxyRequest(input({ method: 'HEAD', readBody }), ['v1', 'a'], {
    upstream: UPSTREAM,
    fetchImpl,
  });
  assert.equal(reads, 0);
});

test("the API's status, cookies, and no-store header reach the browser", async () => {
  const upstream = new Response('{"message":"nope"}', {
    status: 403,
    headers: { 'content-type': 'application/json' },
  });
  upstream.headers.append('set-cookie', 'a=1; Path=/');
  upstream.headers.append('set-cookie', 'b=2; Path=/');
  const { fetchImpl } = recorder(upstream);

  const response = await proxyRequest(input({ method: 'POST' }), ['v1', 'cases'], {
    upstream: UPSTREAM,
    fetchImpl,
  });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(response.headers.getSetCookie(), ['a=1; Path=/', 'b=2; Path=/']);
});

test('a 204 passes through without a body', async () => {
  const { fetchImpl } = recorder(() => new Response(null, { status: 204 }));
  const response = await proxyRequest(input({ method: 'POST' }), ['v1', 'auth', 'logout'], {
    upstream: UPSTREAM,
    fetchImpl,
  });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
});

test('a redirect from the API is returned, not followed', async () => {
  const upstream = new Response(null, {
    status: 302,
    headers: { location: 'https://evil.example.com' },
  });
  const { calls, fetchImpl } = recorder(upstream);
  const response = await proxyRequest(input(), ['v1', 'cases'], { upstream: UPSTREAM, fetchImpl });
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    null,
    'the redirect target must not be leaked onward',
  );
});

test('a network failure is a 502 that does not expose the error', async () => {
  const fetchImpl = (async () => {
    throw new Error('connect ECONNREFUSED 10.0.0.5:4000');
  }) as unknown as typeof fetch;
  const response = await proxyRequest(input(), ['v1', 'cases'], { upstream: UPSTREAM, fetchImpl });
  assert.equal(response.status, 502);
  const text = JSON.stringify(await response.json());
  assert.ok(text.includes('The case API is unavailable'));
  assert.ok(!text.includes('10.0.0.5'));
});

test('a request that exceeds the timeout becomes a 502', async () => {
  const fetchImpl = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new Error('aborted')));
    })) as unknown as typeof fetch;
  const response = await proxyRequest(input(), ['v1', 'cases'], {
    upstream: UPSTREAM,
    fetchImpl,
    timeoutMs: 20,
  });
  assert.equal(response.status, 502);
});

test('an unproxyable path is a 404 even when no upstream is configured', async () => {
  const previous = process.env.API_UPSTREAM_URL;
  delete process.env.API_UPSTREAM_URL;
  try {
    for (const path of [['admin'], ['v1', '..', 'x'], []]) {
      const response = await proxyRequest(input(), path);
      assert.equal(response.status, 404, JSON.stringify(path));
    }
  } finally {
    if (previous !== undefined) process.env.API_UPSTREAM_URL = previous;
  }
});

test('every response the proxy generates itself is marked no-store', async () => {
  const previous = process.env.API_UPSTREAM_URL;
  delete process.env.API_UPSTREAM_URL;
  try {
    const notFound = await proxyRequest(input(), ['admin']);
    const unconfigured = await proxyRequest(input(), ['v1', 'health']);
    const failing = (async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    const unavailable = await proxyRequest(input(), ['v1', 'health'], {
      upstream: UPSTREAM,
      fetchImpl: failing,
    });
    for (const response of [notFound, unconfigured, unavailable]) {
      assert.equal(response.headers.get('cache-control'), 'no-store', String(response.status));
    }
  } finally {
    if (previous !== undefined) process.env.API_UPSTREAM_URL = previous;
  }
});
