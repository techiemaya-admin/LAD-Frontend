/**
 * JSON fetch for our own `/api/*` routes, with the failure cases closed.
 *
 * WHY THIS EXISTS
 * ---------------
 * `fetch` does not throw on 4xx/5xx. It rejects only on a *network* failure.
 * So the natural-looking shape
 *
 *     const res  = await fetchWithTenant(url);
 *     const data = await res.json();
 *     if (data.success) setRows(data.data || []);
 *
 * treats a 500 as "no exception, therefore it worked": the error body is not an
 * array, every `|| []` / `?? 0` default fires, and the UI reports an empty or
 * zero result as fact. That single mistake produced a long run of user-visible
 * bugs — "0 sent emails" for a tenant mid-outage, "No re-engagement segments",
 * "Zoho CRM isn't connected", a first-run empty state shown to an established
 * account, and a note whose textarea was cleared after the save had failed.
 *
 * `fetchJson` makes the failure loud instead: any non-2xx, and any `success:
 * false` envelope, throws an {@link ApiError} carrying the HTTP status and the
 * backend's machine-readable `code`. The caller then has to decide what to
 * render — which is the whole point, because only the caller knows whether a
 * 404 means "nothing here" or "something broke".
 *
 * WHEN TO USE WHICH
 * -----------------
 *   - `fetchJson`             — our own same-origin `/api/*` routes. Adds the
 *                               tenant + auth headers via `fetchWithTenant`.
 *   - `apiGet`/`apiPost` etc. — the backend DIRECTLY (NEXT_PUBLIC_BACKEND_URL).
 *                               Already throws `ApiError`; unchanged by this.
 *   - bare `fetchWithTenant`  — only when you need the raw `Response` (streams,
 *                               blobs, or reading headers such as
 *                               `X-Total-Count`).
 *
 * HANDLING THE FAILURE
 * --------------------
 * Catch and branch on the status rather than on the message:
 *
 *     try {
 *       const rows = await fetchJson<Row[]>('/api/things');
 *       setRows(rows);
 *     } catch (e) {
 *       // 404 genuinely means "nothing here"; anything else is an outage.
 *       if (apiErrorStatus(e) === 404) setRows([]);
 *       else setLoadError(e instanceof Error ? e.message : 'Could not load');
 *     }
 *
 * The one rule this file cannot enforce: **do not swallow the throw into an
 * empty default.** `catch { setRows([]) }` reintroduces exactly the bug this
 * helper exists to prevent.
 */

import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { ApiError, apiErrorFromResponse } from '@lad/shared/apiError';

export { ApiError } from '@lad/shared/apiError';
export { isApiError, apiErrorCode, apiErrorStatus } from '@lad/shared/apiError';

/** Options for {@link fetchJson}. Everything `fetch` takes, plus our own. */
export interface FetchJsonOptions extends RequestInit {
  /**
   * Return the whole response body instead of unwrapping `{ success, data }`.
   *
   * Default (false) matches how nearly every LAD route replies and how call
   * sites already read them. Set true when you need sibling fields alongside
   * `data` — e.g. `automation_enabled`, `total`, or a `degraded` flag.
   */
  raw?: boolean;
}

/**
 * GET/POST/… one of our `/api/*` routes and return its parsed JSON.
 *
 * @throws {ApiError} on any non-2xx response, on a `{ success: false }` body,
 *         and on a body that is not valid JSON. `status` is the HTTP status
 *         (0 if the request never completed); `code` is the backend's
 *         discriminator when it sent one.
 *
 * @returns by default the `data` field of a `{ success, data }` envelope, or
 *          the whole body when there is no such envelope. With `raw: true`,
 *          always the whole body.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { raw = false, ...init } = options;

  const res = await fetchWithTenant(url, init);

  // The case this whole module exists for. `apiErrorFromResponse` reads the
  // body to recover the backend's message/code, so it must only run here — it
  // consumes the stream.
  if (!res.ok) {
    throw await apiErrorFromResponse(res, `${init.method || 'GET'} ${url} ${res.status}`);
  }

  // 204/205, or an empty 200: valid, and there is nothing to parse.
  if (res.status === 204 || res.status === 205) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    // A 2xx that is not JSON is still a broken response — usually an HTML
    // error or login page served by something in front of the route. Failing
    // loudly beats handing the caller a string it will treat as an object.
    throw new ApiError(
      `${init.method || 'GET'} ${url} returned ${res.status} with a non-JSON body`,
      res.status,
      undefined,
      text.slice(0, 200),
    );
  }

  // Several LAD routes report failure as 200 + `{ success: false, error }`.
  // Left unchecked that reads as success, which is the same bug one layer up.
  if (body && typeof body === 'object' && 'success' in body) {
    const env = body as { success?: boolean; error?: string; code?: string; data?: unknown };
    if (env.success === false) {
      throw new ApiError(
        env.error || `${init.method || 'GET'} ${url} reported failure`,
        res.status,
        env.code,
        body,
      );
    }
    if (!raw && 'data' in env) return env.data as T;
  }

  return body as T;
}
