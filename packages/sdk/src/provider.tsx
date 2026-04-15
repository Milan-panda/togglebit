'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { TogglebitConfig } from './types'
import { getClient } from './client'

const TogglebitContext = createContext<TogglebitConfig | null>(null)

export function TogglebitProvider({
  children,
  ...config
}: TogglebitConfig & { children: ReactNode }) {
  getClient(config)
  return (
    <TogglebitContext.Provider value={config}>
      {children}
    </TogglebitContext.Provider>
  )
}

export function useTogglebitConfig(): TogglebitConfig {
  const ctx = useContext(TogglebitContext)
  if (!ctx) {
    throw new Error('useFlag must be used inside <TogglebitProvider>')
  }
  return ctx
}
