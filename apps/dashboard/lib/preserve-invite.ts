const INVITE_STORAGE_KEY = 'gatepost-pending-invite'

export function storeInviteToken(token: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(INVITE_STORAGE_KEY, token)
}

export function getStoredInviteToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(INVITE_STORAGE_KEY)
}

export function clearStoredInviteToken() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(INVITE_STORAGE_KEY)
}

export function inviteRedirectUrl(token: string) {
  return `/onboarding?invite=${encodeURIComponent(token)}`
}

export function postAuthRedirectUrl(): string {
  const token = getStoredInviteToken()
  if (token) return inviteRedirectUrl(token)
  return '/dashboard'
}
