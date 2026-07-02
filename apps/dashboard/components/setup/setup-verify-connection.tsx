'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EvalReasonChain } from '@/components/flags/eval-reason-chain'
import { api, type FlagTestResponse } from '@/lib/api'

interface Props {
  flagKey?: string
  env: string
  orgId?: string
}

export function SetupVerifyConnection({ flagKey, env, orgId }: Props) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FlagTestResponse | null>(null)

  async function verify() {
    if (!flagKey) {
      toast.error('Create a flag first')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const token = await getToken()
      if (!token) return
      const res = await api.flags.test(
        token,
        flagKey,
        { env, userId: 'setup-verify-user', context: {} },
        orgId,
      )
      setResult(res)
      toast.success(`Connection OK — ${res.latency_ms}ms`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Verify connection</p>
          <p className="text-xs text-muted-foreground">
            Run a live test eval against {flagKey ? `“${flagKey}”` : 'your first flag'} in {env}.
          </p>
        </div>
        <Button size="sm" onClick={verify} disabled={loading || !flagKey}>
          {loading ? 'Testing…' : 'Verify connection'}
        </Button>
      </div>
      {result && (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3">
          <p className="text-sm">
            Result: <span className="font-medium">{result.enabled ? 'enabled' : 'disabled'}</span>
            {' · '}
            <span className="text-muted-foreground">{result.reason}</span>
            {' · '}
            <span className="text-muted-foreground">{result.latency_ms}ms</span>
          </p>
          {result.details?.chain && (
            <EvalReasonChain chain={result.details.chain} enabled={result.enabled} />
          )}
        </div>
      )}
    </div>
  )
}
