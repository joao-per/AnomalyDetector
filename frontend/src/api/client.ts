// Tiny typed fetch wrapper around the Django BFF.
// With Entra SSO configured it sends `Authorization: Bearer <token>`; otherwise
// it falls back to the Phase-1 X-User-Email header (local dev).
import { entraEnabled, getAccessToken } from "@/auth/entra";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const USER_EMAIL = import.meta.env.VITE_USER_EMAIL ?? "";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(
    `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
    // base needed only when BASE_URL is relative; harmless otherwise
    window.location.origin,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Record<string, string | undefined>; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (entraEnabled) {
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["X-User-Email"] = USER_EMAIL;
  }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      credentials: "include", // Django session cookie
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, "Network error — is the backend running?", e);
  }

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (data && typeof data === "object") {
      // DRF errors carry "detail"; our Dataverse/flow/Graph errors carry "message".
      for (const key of ["detail", "message"] as const) {
        const value = (data as Record<string, unknown>)[key];
        if (typeof value === "string" && value) {
          message = value;
          break;
        }
      }
    }
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | undefined>) =>
    request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
};
