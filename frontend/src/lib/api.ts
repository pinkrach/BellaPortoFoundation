import { supabase } from "@/lib/supabaseClient";

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? "http://localhost:5250" : "");

export const buildApiUrl = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path);

type ProblemDetails = {
  title?: string;
  detail?: string;
  message?: string;
};

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);
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

export async function fetchJsonWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null;
  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetchJson<T>(path, {
    ...init,
    headers,
  });
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
  return fetch(buildApiUrl(path), {
    ...init,
    headers,
  });
}
