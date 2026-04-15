import type { FlagKey, FlagContext, TogglebitConfig, EvalResponse } from './types'

const DEFAULT_BASE_URL = 'https://api.togglebit.dev'

export async function getFlag(
  key: FlagKey,
  context: FlagContext,
  config: TogglebitConfig,
): Promise<boolean> {
  const params = new URLSearchParams({
    userId: context.userId,
    context: JSON.stringify(context),
  })
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

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
