export type FlagKey = string

export interface FlagContext {
  userId: string
  plan?: string
  country?: string
  email?: string
  [key: string]: string | undefined
}

export interface TogglebitConfig {
  apiKey: string
  environment: 'dev' | 'staging' | 'prod'
  baseUrl?: string
  cacheTtl?: number
  defaultValue?: boolean
}

export interface EvalResponse {
  flag: string
  enabled: boolean
  reason: string
  latency_ms: number
}
