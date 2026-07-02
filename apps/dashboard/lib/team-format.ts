import type { OrgMember, OrgRole } from '@/lib/api'

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  developer: 'Developer',
  member: 'Member',
}

export function formatRole(role: OrgRole): string {
  return ROLE_LABELS[role]
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelativeExpiry(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso

  const diffMs = d.getTime() - Date.now()
  const diffDay = Math.ceil(diffMs / 86400000)

  if (diffDay < 0) return 'Expired'
  if (diffDay === 0) return 'Expires today'
  if (diffDay === 1) return 'Expires tomorrow'
  if (diffDay <= 14) return `Expires in ${diffDay} days`
  return `Expires ${formatDate(iso)}`
}

export function memberDisplayName(
  member: Pick<OrgMember, 'name' | 'email' | 'user_id'>,
): string {
  if (member.name?.trim()) return member.name.trim()
  if (member.email?.trim()) return member.email.trim()
  return 'Unknown member'
}

export function memberInitial(
  member: Pick<OrgMember, 'name' | 'email' | 'user_id'>,
): string {
  const source = member.name || member.email || '?'
  return source.slice(0, 1).toUpperCase()
}

export function avatarColorSeed(value: string): string {
  const palette = [
    'bg-zinc-600',
    'bg-zinc-500',
    'bg-zinc-700',
    'bg-zinc-400',
    'bg-zinc-800',
  ]
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash << 5) - hash + value.charCodeAt(i)
  return palette[Math.abs(hash) % palette.length]
}
