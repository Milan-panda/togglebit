import { LRUCache } from './cache'
import type { FlagKey, FlagContext, TogglebitConfig, EvalResponse } from './types'

const DEFAULT_BASE_URL = 'https://api.togglebit.dev'

function contextSignature(context: FlagContext): string {
  return JSON.stringify(context)
}

export class TogglebitClient {
  private config: TogglebitConfig
  private cache: LRUCache<string, boolean>

  constructor(config: TogglebitConfig) {
    this.config = config
    this.cache = new LRUCache({
      max: 500,
      ttl: (config.cacheTtl ?? 30) * 1_000,
    })
  }

  async evaluate(key: FlagKey, context: FlagContext): Promise<boolean> {
    const cacheKey = `${key}:${contextSignature(context)}`
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) return cached

    try {
      const params = new URLSearchParams({
        userId: context.userId,
        context: JSON.stringify(context),
      })

      const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL
      const fetchOptions: RequestInit = {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      }
      // Next.js fetch cache: only on server — on the client this can cache false positives.
      if (typeof window === 'undefined') {
        ;(fetchOptions as any).next = { revalidate: this.config.cacheTtl ?? 30 }
      } else {
        fetchOptions.cache = 'no-store'
      }

      const res = await fetch(
        `${baseUrl}/api/v1/eval/flags/${encodeURIComponent(key)}?${params}`,
        fetchOptions,
      )

      if (!res.ok) return this.config.defaultValue ?? false

      const data: EvalResponse = await res.json()
      this.cache.set(cacheKey, data.enabled)
      return data.enabled
    } catch {
      return this.config.defaultValue ?? false
    }
  }
}

let _instance: TogglebitClient | null = null
let _instanceSig: string | null = null

function configSignature(c: TogglebitConfig): string {
  return [
    c.apiKey,
    c.environment,
    c.baseUrl ?? '',
    String(c.cacheTtl ?? 30),
    String(c.defaultValue ?? false),
  ].join('|')
}

export function getClient(config: TogglebitConfig): TogglebitClient {
  const sig = configSignature(config)
  if (!_instance || _instanceSig !== sig) {
    _instance = new TogglebitClient(config)
    _instanceSig = sig
  }
  return _instance
}
