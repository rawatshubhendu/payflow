import type { ApiResponse } from '@payflow/types';

// When unset in production, requests go to the same origin and are proxied to
// the API by Next rewrites so the session cookie stays on the web hostname.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN || '').replace(/\/+$/, '');

export class ApiError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, code = 'API_ERROR', fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures HTTP-only session cookies are sent and received
  });

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('Unexpected server response format', 'INVALID_RESPONSE');
  }

  if (json.error || !response.ok) {
    const errorBody = json.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'An unexpected error occurred.',
    };
    throw new ApiError(errorBody.message, errorBody.code, errorBody.fieldErrors);
  }

  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export async function downloadBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const url = `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: new Headers(options.headers || {}),
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Download failed.';
    try {
      const errorBody = (await response.json()) as ApiResponse<unknown>;
      if (errorBody.error) message = errorBody.error.message;
    } catch {
      // keep default message
    }
    throw new ApiError(message, `HTTP_${response.status}`);
  }

  return response.blob();
}
