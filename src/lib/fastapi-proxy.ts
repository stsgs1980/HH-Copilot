// Proxy utility: Next.js API routes → FastAPI backend (localhost:8000)
// This replaces the old SQLite-based db-query.ts with HTTP calls to Python FastAPI

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://localhost:8000";

export async function proxyToFastAPI(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${FASTAPI_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res;
}

export async function proxyGet<T>(path: string): Promise<T> {
  const res = await proxyToFastAPI(path);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `FastAPI error: ${res.status}`);
  }
  return res.json();
}

export async function proxyPost<T>(path: string, body?: Record<string, any>): Promise<T> {
  const res = await proxyToFastAPI(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `FastAPI error: ${res.status}`);
  }
  return res.json();
}

export async function proxyPut<T>(path: string, body: Record<string, any>): Promise<T> {
  const res = await proxyToFastAPI(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `FastAPI error: ${res.status}`);
  }
  return res.json();
}
