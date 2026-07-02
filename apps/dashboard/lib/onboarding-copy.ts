export const ONBOARDING_REFRESH_EVENT = 'gatepost-onboarding-refresh'

const KEY_PREFIX = 'gatepost-onboarding-sdk-copied'

function storageKey(orgId?: string) {
  if (typeof window === 'undefined') return `${KEY_PREFIX}:_default`
  const resolved =
    orgId ?? new URLSearchParams(window.location.search).get('org') ?? '_default'
  return `${KEY_PREFIX}:${resolved}`
}

export function refreshOnboardingStatus() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ONBOARDING_REFRESH_EVENT))
}

export function markSdkSnippetCopied(orgId?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(orgId), '1')
  refreshOnboardingStatus()
}

export function hasCopiedSdkSnippet(orgId?: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(storageKey(orgId)) === '1'
}
