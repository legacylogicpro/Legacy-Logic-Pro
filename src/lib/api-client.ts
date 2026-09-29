/**
 * Legacy Logic Pro — Unified API Client
 * Section 3.1: The frontend must have exactly ONE place where the backend base URL is defined.
 * Every API function matches FastAPI Pydantic models FIELD FOR FIELD.
 */

// Single exported constant reading env var with sensible localhost fallback
export const API_BASE_URL: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  '';

export interface RequestOptions extends RequestInit {
  token?: string;
  workspaceId?: string;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, workspaceId, headers: customHeaders, ...rest } = options;

  const resolvedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    resolvedHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (workspaceId) {
    resolvedHeaders['X-Workspace-Id'] = workspaceId;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    headers: resolvedHeaders,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMessage = errorBody;
    try {
      const json = JSON.parse(errorBody);
      parsedMessage = json.detail || json.message || errorBody;
    } catch {
      // Keep raw
    }
    throw new Error(parsedMessage || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // AI Query
  queryAI: (payload: { query: string; sessionData: any; enableAI: boolean; workspaceId: string }) =>
    apiRequest<{ answer: string; thinkingSummary?: string; advisory: string }>('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Health
  checkHealth: () => apiRequest<{ status: string; service: string }>('/api/health'),
};
