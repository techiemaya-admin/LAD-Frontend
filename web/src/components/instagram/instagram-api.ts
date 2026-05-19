/**
 * Tiny same-origin fetcher for the Instagram dashboard.
 *
 * Why this file exists: lib/api's `apiGet`/`apiPost` prepend NEXT_PUBLIC_BACKEND_URL
 * (which points at LAD_backend on :3004). The Instagram dashboard talks to a
 * Next.js proxy route at /api/instagram-conversations/* on the same origin.
 * Using relative URLs guarantees we hit the proxy, not the backend.
 *
 * Lives in components/instagram/ rather than lib/ to dodge any webpack-cache
 * staleness on lib/api.ts.
 */

import { safeStorage } from '@lad/shared/storage';

function authHeader(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const token = safeStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function send<T>(method: string, path: string, body?: any): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(path, init);
  if (!res.ok) {
    let msg = `${method} ${path} ${res.status}`;
    try {
      const data = await res.json();
      msg = data.message || data.error || data.detail || msg;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const igGet    = <T>(path: string)              => send<T>('GET',    path);
export const igPost   = <T>(path: string, body: any)   => send<T>('POST',   path, body);
export const igPatch  = <T>(path: string, body: any)   => send<T>('PATCH',  path, body);
export const igDelete = <T>(path: string)              => send<T>('DELETE', path);
