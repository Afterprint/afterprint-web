/**
 * Same-origin proxy to the Afterprint API.
 *
 * The browser talks to `/backend/v1/...` on the web app's own origin, and this
 * module forwards the request to `API_UPSTREAM_URL`. That keeps the session
 * cookie first-party and means the API address is never exposed to the page.
 *
 * It is a security boundary, so it forwards only an allow-list of headers,
 * only the `/v1` API, and never a path that could climb out of it.
 */

/** Request headers passed to the API. Everything else is dropped. */
export const FORWARDED_REQUEST_HEADERS = [
  'content-type',
  'cookie',
  'x-afterprint-request',
  'idempotency-key',
  'origin',
] as const;

/** The API can take a while to process evidence, so this is generous. */
export const UPSTREAM_TIMEOUT_MS = 240_000;

/**
 * True only for paths under `/v1` with no empty, `.`, or `..` segment, which
 * could otherwise resolve to another upstream route.
 */
export function isProxyablePath(path: string[]): boolean {
  if (path[0] !== 'v1') return false;
  return !path.some(segment => segment === '' || segment === '.' || segment === '..');
}

/** Build the upstream URL for a request path, or `null` if it must not be proxied. */
export function upstreamUrl(upstream: string, path: string[], search: string): string | null {
  if (!isProxyablePath(path)) return null;
  return `${upstream.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}${search}`;
}

/** Copy only the allow-listed headers from the browser request. */
export function forwardedRequestHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/**
 * Headers returned to the browser: the content type, every cookie the API set,
 * and `no-store` so a case response is never cached.
 */
export function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  // get('set-cookie') would merge several cookies into one broken string.
  for (const cookie of upstream.headers.getSetCookie()) headers.append('set-cookie', cookie);
  headers.set('Cache-Control', 'no-store');
  return headers;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export interface ProxyInput {
  method: string;
  headers: Headers;
  /** The query string including the leading `?`, or an empty string. */
  search: string;
  readBody: () => Promise<ArrayBuffer>;
}

export interface ProxyOptions {
  upstream?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Forward one request to the API and return its response. */
export async function proxyRequest(
  input: ProxyInput,
  path: string[],
  options: ProxyOptions = {},
): Promise<Response> {
  // A path that is never proxied is a 404 whether or not an upstream is set.
  if (!isProxyablePath(path)) return new Response(null, { status: 404, headers: NO_STORE });

  const upstream = options.upstream ?? process.env.API_UPSTREAM_URL;
  if (!upstream) {
    return Response.json(
      { message: 'Live API upstream is not configured' },
      { status: 503, headers: NO_STORE },
    );
  }

  const url = upstreamUrl(upstream, path, input.search) as string;

  const hasBody = !['GET', 'HEAD'].includes(input.method);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: input.method,
      headers: forwardedRequestHeaders(input.headers),
      body: hasBody ? await input.readBody() : undefined,
      // A redirect from the API is returned as-is, never followed.
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? UPSTREAM_TIMEOUT_MS),
    });
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders(response),
    });
  } catch {
    return Response.json(
      { message: 'The case API is unavailable' },
      { status: 502, headers: NO_STORE },
    );
  }
}
