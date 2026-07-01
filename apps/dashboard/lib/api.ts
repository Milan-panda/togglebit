import { API_URL } from './constants'

async function apiFetch<T>(
  path: string,
  token: string,
  orgId?: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(orgId ? { 'X-Org-Id': orgId } : {}),
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

export interface FlagEvent {
  id: string
  environment: string
  user_id: string
  user_name: string | null
  user_email: string | null
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface FlagEvalLog {
  id: string
  environment: string
  user_id: string
  context: Record<string, unknown>
  enabled: boolean
  reason: string
  source: string
  created_at: string
}

export interface UsageMonthlyPoint {
  month: string
  eval_count: number
}

export interface UsageMonthlyResponse {
  current: UsageMonthlyPoint
  series: UsageMonthlyPoint[]
}

export interface FlagUsageSeriesResponse {
  days: string[]
  by_flag_id: Record<string, number[]>
}

export interface FlagTestResponse {
  flag: string
  environment: string
  enabled: boolean
  reason: string
  latency_ms: number
  details?: {
    summary?: string
    bucket?: number
    rollout_pct?: number
    rules?: Array<{
      attribute: string
      operator: string
      expected: unknown
      actual: unknown
      matched: boolean
      label: string
    }>
  }
}

export interface Org {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
  role: OrgRole
}

export type OrgRole = 'owner' | 'admin' | 'developer' | 'member'

export interface OrgMembership {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
  role: OrgRole
}

export interface OrgMember {
  user_id: string
  email: string | null
  name: string | null
  role: OrgRole
  created_at: string
}

export interface OrgInvitation {
  id: string
  email: string
  role: OrgRole
  token: string
  invited_by: string
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export interface PendingOrgInvitation {
  id: string
  org_id: string
  org_name: string
  org_slug: string
  email: string
  role: OrgRole
  token: string
  invited_by: string
  created_at: string
  expires_at: string
}

export const api = {
  flags: {
    list: (
      token: string,
      env: string,
      orgId?: string,
      params?: { q?: string; type?: string; enabled?: boolean },
    ) => {
      const sp = new URLSearchParams({ env })
      if (params?.q) sp.set('q', params.q)
      if (params?.type) sp.set('type', params.type)
      if (params?.enabled !== undefined) sp.set('enabled', String(params.enabled))
      return apiFetch<{ flags: Flag[]; total: number }>(
        `/api/v1/manage/flags?${sp.toString()}`,
        token,
        orgId,
      )
    },
    get: (token: string, key: string, orgId?: string) =>
      apiFetch<Flag>(`/api/v1/manage/flags/${key}`, token, orgId),
    create: (token: string, body: Record<string, unknown>, orgId?: string) =>
      apiFetch<Flag>('/api/v1/manage/flags', token, orgId, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateEnv: (
      token: string,
      key: string,
      env: string,
      body: Record<string, unknown>,
      orgId?: string,
    ) =>
      apiFetch(`/api/v1/manage/flags/${key}/environments/${env}`, token, orgId, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (token: string, key: string, orgId?: string) =>
      apiFetch(`/api/v1/manage/flags/${key}`, token, orgId, { method: 'DELETE' }),
    events: {
      list: (
        token: string,
        key: string,
        params: {
          env?: string
          from?: string
          to?: string
          before?: string
          limit?: number
        },
        orgId?: string,
      ) => {
        const sp = new URLSearchParams()
        if (params.env) sp.set('env', params.env)
        if (params.from) sp.set('from', params.from)
        if (params.to) sp.set('to', params.to)
        if (params.before) sp.set('before', params.before)
        if (params.limit) sp.set('limit', String(params.limit))
        const qs = sp.toString()
        return apiFetch<{ events: FlagEvent[]; next_before: string | null }>(
          `/api/v1/manage/flags/${encodeURIComponent(key)}/events${qs ? `?${qs}` : ''}`,
          token,
          orgId,
        )
      },
    },
    evalLogs: {
      list: (
        token: string,
        key: string,
        params: {
          env?: string
          from?: string
          to?: string
          before?: string
          limit?: number
        },
        orgId?: string,
      ) => {
        const sp = new URLSearchParams()
        if (params.env) sp.set('env', params.env)
        if (params.from) sp.set('from', params.from)
        if (params.to) sp.set('to', params.to)
        if (params.before) sp.set('before', params.before)
        if (params.limit) sp.set('limit', String(params.limit))
        const qs = sp.toString()
        return apiFetch<{ logs: FlagEvalLog[]; next_before: string | null }>(
          `/api/v1/manage/flags/${encodeURIComponent(key)}/eval-logs${qs ? `?${qs}` : ''}`,
          token,
          orgId,
        )
      },
    },
    usage: {
      list: (token: string, env: string, days: number, orgId?: string) =>
        apiFetch<FlagUsageSeriesResponse>(
          `/api/v1/manage/flags/usage?env=${encodeURIComponent(env)}&days=${encodeURIComponent(String(days))}`,
          token,
          orgId,
        ),
    },
    test: (
      token: string,
      key: string,
      body: { env: string; userId?: string; context: Record<string, unknown> },
      orgId?: string,
    ) =>
      apiFetch<FlagTestResponse>(
        `/api/v1/manage/flags/${encodeURIComponent(key)}/test`,
        token,
        orgId,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      ),
  },
  keys: {
    list: (token: string, orgId?: string) =>
      apiFetch<ApiKey[]>('/api/v1/manage/keys', token, orgId),
    create: (token: string, body: { name: string; environment: string }, orgId?: string) =>
      apiFetch<ApiKey>('/api/v1/manage/keys', token, orgId, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revoke: (token: string, keyId: string, orgId?: string) =>
      apiFetch(`/api/v1/manage/keys/${keyId}`, token, orgId, { method: 'DELETE' }),
  },
  orgs: {
    list: (token: string) => apiFetch<OrgMembership[]>('/api/v1/manage/orgs', token),
    me: (token: string, orgId?: string) => apiFetch<Org>('/api/v1/manage/orgs/me', token, orgId),
    /** Returns null when the user has no org (HTTP 404). */
    meOptional: async (token: string, orgId?: string): Promise<Org | null> => {
      const res = await fetch(`${API_URL}/api/v1/manage/orgs/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(orgId ? { 'X-Org-Id': orgId } : {}),
        },
      })
      if (res.status === 404 || res.status === 403) return null
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `API error ${res.status}`)
      }
      return res.json()
    },
    create: (token: string, body: { name: string; slug: string; email?: string }) =>
      apiFetch<Org>('/api/v1/manage/orgs', token, undefined, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    members: (token: string, orgId?: string) =>
      apiFetch<OrgMember[]>('/api/v1/manage/orgs/me/members', token, orgId),
    updateMemberRole: (
      token: string,
      userId: string,
      role: OrgRole,
      orgId?: string,
    ) =>
      apiFetch(`/api/v1/manage/orgs/me/members/${encodeURIComponent(userId)}/role`, token, orgId, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    removeMember: (token: string, userId: string, orgId?: string) =>
      apiFetch(`/api/v1/manage/orgs/me/members/${encodeURIComponent(userId)}`, token, orgId, {
        method: 'DELETE',
      }),
    invitations: (token: string, orgId?: string) =>
      apiFetch<OrgInvitation[]>('/api/v1/manage/orgs/me/invitations', token, orgId),
    pendingInvitations: (token: string, email?: string) =>
      apiFetch<PendingOrgInvitation[]>(
        `/api/v1/manage/orgs/invitations/pending${email ? `?email=${encodeURIComponent(email)}` : ''}`,
        token,
        undefined,
      ),
    invite: (token: string, body: { email: string; role: OrgRole }, orgId?: string) =>
      apiFetch<OrgInvitation>('/api/v1/manage/orgs/me/invitations', token, orgId, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revokeInvitation: (token: string, invitationId: string, orgId?: string) =>
      apiFetch(`/api/v1/manage/orgs/me/invitations/${invitationId}`, token, orgId, {
        method: 'DELETE',
      }),
    acceptInvitation: (token: string, body: { token: string }) =>
      apiFetch('/api/v1/manage/orgs/me/invitations/accept', token, undefined, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    delete: (token: string, orgId?: string) =>
      apiFetch('/api/v1/manage/orgs/me', token, orgId, {
        method: 'DELETE',
      }),
  },
  usage: {
    monthly: (token: string, orgId?: string) =>
      apiFetch<UsageMonthlyResponse>('/api/v1/manage/usage/monthly', token, orgId),
  },
}
