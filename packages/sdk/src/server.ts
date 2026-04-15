import type { FlagKey, FlagContext, TogglebitConfig, EvalResponse } from './types'

// Hosted Togglebit API origin (cloud-native default).
// Users should not need to pass `baseUrl` for the hosted product.
const DEFAULT_BASE_URL = 'http://xuno.duckdns.org:8765'

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '')
  // If someone sets base URL to `/api`, the SDK would generate `/api/api/v1/...`.
  if (trimmed === '/api') return ''
  return trimmed
}

function resolveBaseUrl(config: TogglebitConfig): string {
  // Optional escape hatch for local testing or custom routing.
  if (config.baseUrl !== undefined) return normalizeBaseUrl(config.baseUrl)
  return DEFAULT_BASE_URL
}

export async function getFlag(
  key: FlagKey,
  context: FlagContext,
  config: TogglebitConfig,
): Promise<boolean> {
  const params = new URLSearchParams({
    userId: context.userId,
    context: JSON.stringify(context),
  })
  const baseUrl = resolveBaseUrl(config)

  try {
    const fetchOptions: RequestInit = {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    }
    ;(fetchOptions as any).next = { revalidate: config.cacheTtl ?? 30 }

    const res = await fetch(
      `${baseUrl}/api/v1/eval/flags/${encodeURIComponent(key)}?${params}`,
      fetchOptions,
    )

    if (!res.ok) return config.defaultValue ?? false

    const data: EvalResponse = await res.json()
    return data.enabled
  } catch {
    return config.defaultValue ?? false
  }
}

export type { FlagKey, FlagContext, TogglebitConfig, EvalResponse } from './types'
