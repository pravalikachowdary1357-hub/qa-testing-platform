const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

// Lets AuthContext react to a session that's expired or been revoked
// server-side (any 401 from any endpoint), without every API module having
// to know about auth.
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      onUnauthorized?.();
    }
    throw new ApiError(await extractErrorMessage(response, path), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Multipart uploads: unlike apiFetch, the Content-Type must be left unset so
// the browser can add its own multipart boundary -- forcing
// 'application/json' (or any fixed value) here would break the upload.
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  init?: { method?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init?.method ?? 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    throw new ApiError(await extractErrorMessage(response, path), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Fetches binary content (a document's file bytes) as a Blob for
// viewing/downloading in the browser, reusing the same auth/error handling
// as apiFetch rather than a plain unauthenticated <a href>.
export async function apiDownload(path: string): Promise<Blob> {
  const headers: Record<string, string> = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    throw new ApiError(await extractErrorMessage(response, path), response.status);
  }

  return response.blob();
}

// NestJS error responses carry a human-readable `message` (string or
// string[] from class-validator); prefer it over a generic fallback so
// the UI can show the backend's actual explanation (e.g. a 409 conflict).
async function extractErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'message' in body) {
      const { message } = body as { message: unknown };
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
        return message.join(' ');
      }
    }
  } catch {
    // Response body wasn't JSON; fall through to the generic message.
  }
  return `Request to ${path} failed with status ${response.status}`;
}
