import { loadingFetch } from "@/lib/loading-fetch";
import { safeStorage } from "@/utils/storage";
export type LoginPayload = { email: string; password: string };
export type User = { id: string | number; email: string; name?: string; [k: string]: unknown };
// Use proxy routes when NEXT_PUBLIC_USE_API_PROXY is enabled, otherwise use direct backend URL
const API_BASE = process.env.NEXT_PUBLIC_USE_API_PROXY === 'true'
  ? ''
  : (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app');
function getApiUrl(path: string) {
  // Ensure Next.js API routes (auth) hit the same-origin Next server (e.g., :3000)
  if (path.startsWith('/api/auth/')) {
    return path; // use relative URL to target Next app origin
  }
  // All other APIs go to backend base
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}
export async function login(payload: LoginPayload): Promise<void> {
  const res = await loadingFetch(getApiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || "Login failed");
  }
  // Expect token cookie (via httpOnly) or token in body
  try {
    const data = await res.json().catch(() => null);
    const token = data?.token as string | undefined;
    if (token) {
      safeStorage.setItem("auth_token", token);
      safeStorage.setItem("token", token);
    }
  } catch {
    // ignore
  }
}
export async function getCurrentUser(): Promise<User> {
  const token = typeof window !== "undefined"
    ? (safeStorage.getItem("auth_token") || safeStorage.getItem("token"))
    : null;
  const res = await loadingFetch(getApiUrl("/api/auth/me"), {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || "Failed to load current user");
  }
  return res.json();
}
async function safeError(res: Response): Promise<string | undefined> {
  try {
    const data = await res.json();
    return (data && (data.message || data.error)) as string | undefined;
  } catch {
    return res.statusText || undefined;
  }
}