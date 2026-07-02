export const ENV_STORAGE_KEY = 'togglebit.env'

export function readStoredEnv(): string {
  if (typeof window === 'undefined') return 'dev'
  return window.localStorage.getItem(ENV_STORAGE_KEY) || 'dev'
}

export function storeEnv(env: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ENV_STORAGE_KEY, env)
}

export function withOrgAndEnv(
  href: string,
  org?: string | null,
  env?: string | null,
): string {
  const params = new URLSearchParams()
  if (org) params.set('org', org)
  if (env) params.set('env', env)
  const qs = params.toString()
  return qs ? `${href}?${qs}` : href
}

export function resolveEnv(searchParams: URLSearchParams): string {
  return searchParams.get('env') || readStoredEnv()
}
