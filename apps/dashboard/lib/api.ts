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
    list: (token: string, env: string, orgId?: string) =>
      apiFetch<{ flags: Flag[]; total: number }>(
        `/api/v1/manage/flags?env=${env}`,
        token,
        orgId,
      ),
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
}
