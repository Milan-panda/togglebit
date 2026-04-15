function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

function publicApiUrl(): string {
  const raw = trimTrailingSlash(
    process.env.NEXT_PUBLIC_TOGGLEBIT_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      '',
  )

  // Dashboard code calls paths like `/api/v1/...` directly.
  // If someone sets NEXT_PUBLIC_API_URL to `/api`, we'd end up with `/api/api/v1/...`.
  if (raw === '/api') return ''
  return raw
}

function serverApiUrl(): string {
  return trimTrailingSlash(process.env.INTERNAL_API_URL || publicApiUrl())
}

// Browser requests should use the public URL. Server-rendered dashboard requests can use
// an internal Docker network URL when available.
export const API_URL =
  typeof window === 'undefined' ? serverApiUrl() : publicApiUrl()

export const ENVIRONMENTS = ['dev', 'staging', 'prod'] as const
export type Environment = (typeof ENVIRONMENTS)[number]
