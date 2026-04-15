import { API_URL } from './constants'

async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API error ${res.status}`)
  }

  return res.json()
}

export interface Flag {
  id: string
  key: string
  name: string
  description: string | null
  type: string
  created_at: string
  environments?: Record<string, EnvConfig>
}

export interface EnvConfig {
  enabled: boolean
  rollout_pct: number
  rules: Rule[]
}

export interface Rule {
  attribute: string
  operator: string
  value: string | string[]
}

export interface ApiKey {
  id: string
  environment: string
  key_prefix: string
  name: string
  last_used_at: string | null
  created_at: string
  raw_key?: string
}

export interface Org {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

export const api = {
  flags: {
    list: (token: string, env: string) =>
      apiFetch<{ flags: Flag[]; total: number }>(
        `/api/v1/manage/flags?env=${env}`,
        token,
      ),
    get: (token: string, key: string) =>
      apiFetch<Flag>(`/api/v1/manage/flags/${key}`, token),
    create: (token: string, body: Record<string, unknown>) =>
      apiFetch<Flag>('/api/v1/manage/flags', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateEnv: (
      token: string,
      key: string,
      env: string,
      body: Record<string, unknown>,
    ) =>
      apiFetch(`/api/v1/manage/flags/${key}/environments/${env}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (token: string, key: string) =>
      apiFetch(`/api/v1/manage/flags/${key}`, token, { method: 'DELETE' }),
  },
  keys: {
    list: (token: string) =>
      apiFetch<ApiKey[]>('/api/v1/manage/keys', token),
    create: (token: string, body: { name: string; environment: string }) =>
      apiFetch<ApiKey>('/api/v1/manage/keys', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revoke: (token: string, keyId: string) =>
      apiFetch(`/api/v1/manage/keys/${keyId}`, token, { method: 'DELETE' }),
  },
  orgs: {
    me: (token: string) => apiFetch<Org>('/api/v1/manage/orgs/me', token),
    /** Returns null when the user has no org (HTTP 404). */
    meOptional: async (token: string): Promise<Org | null> => {
      const res = await fetch(`${API_URL}/api/v1/manage/orgs/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) return null
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `API error ${res.status}`)
      }
      return res.json()
    },
    create: (token: string, body: { name: string; slug: string }) =>
      apiFetch<Org>('/api/v1/manage/orgs', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
}
