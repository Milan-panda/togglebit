import { LRUCache } from './cache'
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

      const baseUrl = resolveBaseUrl(this.config)
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
