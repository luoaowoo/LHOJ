export const PRIMARY_BASE = '';
export const FALLBACK_BASE = 'http://64.90.0.223:801';
export const PUBLIC_HYDRO_BASE = 'https://oj.luoaowoo.cn';
export const REQUEST_TIMEOUT_MS = 30_000;
export type EndpointMode = 'auto' | 'primary' | 'fallback';
export type ResolvedEndpoint = 'primary' | 'fallback';

const storageKey = 'luoa-oj.endpoint';
let resolvedEndpoint: ResolvedEndpoint | null = null;
let pendingProbe: Promise<ResolvedEndpoint> | null = null;
let avatarRevision = '';
let serverClockOffset = 0;

function recordServerTime(response: Response): void {
  const value = response.headers.get('date');
  if (!value) return;
  const serverTime = Date.parse(value);
  if (Number.isFinite(serverTime)) serverClockOffset = serverTime - Date.now();
}

export function serverNow(): number {
  return Date.now() + serverClockOffset;
}

export function requestSignal(timeout = REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeout);
}

export async function fetchRead(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const signal = requestSignal();
  let response: Response | undefined;
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      response = await fetch(input, { ...init, signal });
      recordServerTime(response);
      if (response.status < 500 || attempt === 2) return response;
      await response.body?.cancel();
    } catch (cause) {
      if (attempt === 2 || signal.aborted) throw cause;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return response as Response;
}

export function readStoredMode(): EndpointMode {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'primary' || stored === 'fallback' || stored === 'auto') return stored;
  } catch {
    // localStorage can be unavailable in some embedded browsers.
  }
  return 'auto';
}

export function setStoredMode(mode: EndpointMode): void {
  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore storage failures; the chosen endpoint still works for this session.
  }
}

async function probePrimary(): Promise<ResolvedEndpoint> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`${PRIMARY_BASE}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: '{ user { _id } }' }),
      credentials: 'include',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`primary probe ${response.status}`);
    const payload = await response.json() as { data?: unknown; errors?: unknown };
    // A null user is a valid response while logged out. The probe only needs
    // to establish that the GraphQL endpoint itself is reachable.
    if (!payload || (payload.data === undefined && payload.errors === undefined)) {
      throw new Error('primary probe invalid');
    }
    return 'primary';
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureEndpoint(): Promise<ResolvedEndpoint> {
  if (resolvedEndpoint) return resolvedEndpoint;
  if (!pendingProbe) {
    pendingProbe = (async () => {
      const mode = readStoredMode();
      if (mode === 'primary') return resolvedEndpoint = 'primary';
      if (mode === 'fallback') return resolvedEndpoint = 'fallback';
      try {
        return resolvedEndpoint = await probePrimary();
      } catch {
        return resolvedEndpoint = 'fallback';
      }
    })();
  }
  return pendingProbe;
}

export function forceEndpoint(mode: EndpointMode): void {
  setStoredMode(mode);
  resolvedEndpoint = mode === 'auto' ? null : mode;
  pendingProbe = null;
}

export function getResolvedEndpoint(): ResolvedEndpoint {
  return resolvedEndpoint ?? 'primary';
}

export function hydroLoginUrl(): string {
  return hydroNativeUrl('/login');
}

export function hydroLogoutUrl(): string {
  return hydroNativeUrl('/logout');
}

export function hydroUrl(path: string): string {
  return resolvedEndpoint === 'fallback' ? fallbackUrl(path) : path;
}

export function hydroNativeUrl(path: string): string {
  let value = path;
  try {
    const url = new URL(path);
    if (url.hostname === new URL(PUBLIC_HYDRO_BASE).hostname || url.host === new URL(FALLBACK_BASE).host) {
      value = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Relative paths are handled below.
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  const nativePath = normalized.startsWith('/hydro-native/')
    ? normalized.slice('/hydro-native'.length)
    : normalized;
  return `/hydro-native${nativePath}`;
}

export function hydroWebSocketUrl(path: string): string {
  const url = new URL(hydroNativeUrl(path), window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function hydroPublicUrl(path: string): string {
  // Hydro HTML pages must stay same-origin so the session cookie and the
  // server-side proxy are preserved. Going through the CDN hostname causes
  // several native Hydro routes (notably /p/:pid/edit) to return 404.
  const url = new URL(path, `${PUBLIC_HYDRO_BASE}/`);
  return hydroNativeUrl(`${url.pathname}${url.search}${url.hash}`);
}

export function hydroContentUrl(value?: string): string | undefined {
  if (!value || value.startsWith('#') || /^(?:data|mailto|tel):/i.test(value)) return value;
  if (value.startsWith('/')) return hydroPublicUrl(value);
  try {
    const url = new URL(value);
    if (url.hostname === new URL(PUBLIC_HYDRO_BASE).hostname || url.host === new URL(FALLBACK_BASE).host) {
      return hydroPublicUrl(value);
    }
  } catch {
    return hydroPublicUrl(value);
  }
  return value;
}

export function hydroAssetUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/')) return hydroNativeUrl(value);
  try {
    const url = new URL(value);
    if (url.hostname === new URL(PUBLIC_HYDRO_BASE).hostname || url.host === new URL(FALLBACK_BASE).host) {
      return hydroNativeUrl(`${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    return hydroNativeUrl(value);
  }
  return value;
}

export function hydroAvatarUrl(value: string | undefined, userId: number): string {
  // Hydro avatars are served directly by the upstream instance. The public
  // domain proxy can return stale signed URLs or gateway errors for storage.
  const uploaded = `${FALLBACK_BASE}/file/${encodeURIComponent(String(userId))}/.avatar.jpg`;
  if (value) {
    try {
      const normalized = value.startsWith('url:') ? value.slice(4) : value;
      const url = new URL(normalized, PUBLIC_HYDRO_BASE);
      if (url.hostname === new URL(PUBLIC_HYDRO_BASE).hostname || url.host === new URL(FALLBACK_BASE).host) {
        const direct = `${FALLBACK_BASE}${url.pathname}${url.search}${url.hash}`;
        return avatarRevision ? `${direct}${direct.includes('?') ? '&' : '?'}v=${avatarRevision}` : direct;
      }
      if (url.hostname === 'cn.gravatar.com') url.hostname = 'www.gravatar.com';
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    } catch {
      // Fall through to the canonical Hydro avatar URL.
    }
  }
  return avatarRevision ? `${uploaded}?v=${avatarRevision}` : uploaded;
}

export function invalidateAvatarCache(): void {
  avatarRevision = String(Date.now());
}

function fallbackUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/hydro-native${normalized}`;
}
