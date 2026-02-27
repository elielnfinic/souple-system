/**
 * Typed API client for souple-api.
 * Handles auth token injection, response unwrapping, and error normalization.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
  organizationId?: number
}

// ─── Token Store ──────────────────────────────────────────────────────────────
// Simple in-memory token store. Replaced by AuthProvider in the app.

let _accessToken: string | null = null
let _organizationId: number | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function setOrganizationId(orgId: number | null) {
  _organizationId = orgId
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, organizationId, ...fetchOptions } = options

  // Build URL with query params
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value))
    })
  }

  // Build headers
  const headers = new Headers(fetchOptions.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  if (_accessToken) {
    headers.set('Authorization', `Bearer ${_accessToken}`)
  }

  const orgId = organizationId ?? _organizationId
  if (orgId) {
    headers.set('X-Organization-Id', String(orgId))
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = await response.json()

  if (!json.success) {
    throw new ApiError(
      json.error?.message ?? 'An unexpected error occurred',
      json.error?.code ?? 'E_UNKNOWN',
      response.status,
      json.error?.details
    )
  }

  return json as T
}

// ─── HTTP method helpers ──────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' })
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'POST', body })
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'PUT', body })
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'PATCH', body })
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' })
  },
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (data: { phone?: string; email?: string; purpose: string }) =>
    api.post('/auth/send-otp', data),

  verifyOtp: (data: { phone?: string; email?: string; code: string; purpose: string }) =>
    api.post('/auth/verify-otp', data),

  register: (data: unknown) => api.post('/auth/register', data),
  login: (data: unknown) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/me'),
  updateMe: (data: unknown) => api.put('/me', data),
}

// ─── Organizations API ────────────────────────────────────────────────────────

export const orgsApi = {
  list: (params?: RequestOptions['params']) => api.get('/organizations', { params }),
  get: (id: number) => api.get(`/organizations/${id}`),
  create: (data: unknown) => api.post('/organizations', data),
  update: (id: number, data: unknown) => api.put(`/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/organizations/${id}`),
  addMember: (orgId: number, data: unknown) => api.post(`/organizations/${orgId}/members`, data),
  removeMember: (orgId: number, userId: number) =>
    api.delete(`/organizations/${orgId}/members/${userId}`),
  updateMemberRole: (orgId: number, userId: number, data: unknown) =>
    api.put(`/organizations/${orgId}/members/${userId}`, data),
}

// ─── Cities API ───────────────────────────────────────────────────────────────

export const citiesApi = {
  list: (params?: RequestOptions['params']) => api.get('/cities', { params }),
  get: (id: number) => api.get(`/cities/${id}`),
  create: (data: unknown) => api.post('/cities', data),
  update: (id: number, data: unknown) => api.put(`/cities/${id}`, data),
  delete: (id: number) => api.delete(`/cities/${id}`),
}

// ─── Routes API ───────────────────────────────────────────────────────────────

export const routesApi = {
  list: (params?: RequestOptions['params']) => api.get('/routes', { params }),
  get: (id: number) => api.get(`/routes/${id}`),
  create: (data: unknown) => api.post('/routes', data),
  update: (id: number, data: unknown) => api.put(`/routes/${id}`, data),
  delete: (id: number) => api.delete(`/routes/${id}`),
  addStop: (routeId: number, data: unknown) => api.post(`/routes/${routeId}/stops`, data),
  updateStop: (routeId: number, stopId: number, data: unknown) =>
    api.put(`/routes/${routeId}/stops/${stopId}`, data),
  removeStop: (routeId: number, stopId: number) =>
    api.delete(`/routes/${routeId}/stops/${stopId}`),
}
