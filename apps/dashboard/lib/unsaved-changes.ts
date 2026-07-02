import type { Rule } from '@/lib/api'

export type EnvConfigSnapshot = {
  enabled: boolean
  rolloutPct: number
  rules: Rule[]
}

export function snapshotEnvConfig(
  enabled: boolean,
  rolloutPct: number,
  rules: Rule[],
): EnvConfigSnapshot {
  return { enabled, rolloutPct, rules: [...rules] }
}

export function isEnvDirty(
  current: EnvConfigSnapshot,
  saved: EnvConfigSnapshot,
): boolean {
  return (
    current.enabled !== saved.enabled ||
    current.rolloutPct !== saved.rolloutPct ||
    JSON.stringify(current.rules) !== JSON.stringify(saved.rules)
  )
}

export type MetadataSnapshot = {
  name: string
  description: string
}

export function snapshotMetadata(name: string, description: string | null): MetadataSnapshot {
  return { name, description: description ?? '' }
}

export function isMetadataDirty(
  current: MetadataSnapshot,
  saved: MetadataSnapshot,
): boolean {
  return current.name !== saved.name || current.description !== saved.description
}

export const LEAVE_CONFIRM_MESSAGE =
  'You have unsaved changes. Leave this page without saving?'

export function confirmLeave(hasUnsavedChanges: boolean): boolean {
  if (!hasUnsavedChanges) return true
  return window.confirm(LEAVE_CONFIRM_MESSAGE)
}

export function isSameOriginNavigation(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin)
    return url.origin === window.location.origin && url.pathname !== window.location.pathname
  } catch {
    return false
  }
}
