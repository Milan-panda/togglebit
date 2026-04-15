'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@clerk/nextjs'

interface FlagToggleProps {
  flagKey: string
  env: string
  enabled: boolean
}

export function FlagToggle({ flagKey, env, enabled: initial }: FlagToggleProps) {
  const [enabled, setEnabled] = useState(initial)
  const [loading, setLoading] = useState(false)
  const { getToken } = useAuth()

  async function handleToggle(checked: boolean) {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.flags.updateEnv(token, flagKey, env, { enabled: checked })
      setEnabled(checked)
      toast.success(`${flagKey} ${checked ? 'enabled' : 'disabled'} in ${env}`)
    } catch (err) {
      toast.error(`Failed to toggle ${flagKey}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Switch
      checked={enabled}
      onCheckedChange={handleToggle}
      disabled={loading}
    />
  )
}
