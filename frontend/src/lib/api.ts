import { supabase } from "@/lib/supabaseClient";

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? "http://localhost:5250" : "");

export const buildApiUrl = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path);

const authRoutesNoRedirect = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

/**
 * When the backend rejects the session (401), clear Supabase and send the user to login.
 * Skips redirect on auth-related routes to avoid loops while signing in.
 */
export async function redirectToLoginOnUnauthorizedResponse(response: Response): Promise<void> {
  if (response.status !== 401) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  const path = (window.location.pathname.replace(/\/$/, "") || "/").toLowerCase();
  if (authRoutesNoRedirect.has(path)) {
    return;
  }
  try {
    await supabase?.auth.signOut();
  } finally {
    window.location.assign("/login");
  }
}

type ProblemDetails = {
  title?: string;
  detail?: string;
  message?: string;
};

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    await redirectToLoginOnUnauthorizedResponse(response);
    throw new Error("Your session expired. Redirecting to sign in.");
  }
  if (!response.ok) {
    const body = await response.text();
    try {
      const problem = JSON.parse(body) as ProblemDetails;
      throw new Error(problem.detail || problem.message || problem.title || `Request failed: ${response.status}`);
    } catch {
      throw new Error(body || `Request failed: ${response.status}`);
    }
  }

  return response.json() as Promise<T>;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);
  return readJsonOrThrow<T>(response);
}

export async function fetchJsonWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null;
  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });
  return readJsonOrThrow<T>(response);
}

export async function buildAuthHeaders(initHeaders?: HeadersInit): Promise<Headers> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null;
  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const headers = new Headers(initHeaders);
  headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function fetchWithAuth(path: string, init?: RequestInit): Promise<Response> {
  const headers = await buildAuthHeaders(init?.headers);
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });
  await redirectToLoginOnUnauthorizedResponse(response);
  return response;
}
