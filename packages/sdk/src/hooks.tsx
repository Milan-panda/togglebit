'use client'

import { useState, useEffect } from 'react'
import type { FlagKey, FlagContext } from './types'
import { getClient } from './client'
import { useTogglebitConfig } from './provider'

export function useFlag(key: FlagKey, context: FlagContext): boolean {
  const config = useTogglebitConfig()
  const [enabled, setEnabled] = useState(config.defaultValue ?? false)
  const contextSig = JSON.stringify(context)

  useEffect(() => {
    let cancelled = false
    getClient(config)
      .evaluate(key, context)
      .then((val) => {
        if (!cancelled) setEnabled(val)
      })
    return () => {
      cancelled = true
    }
  }, [
    key,
    contextSig,
    config.apiKey,
    config.environment,
    config.baseUrl,
    config.cacheTtl,
    config.defaultValue,
  ])

  return enabled
}
