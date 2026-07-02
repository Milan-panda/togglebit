'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Copy, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ApiKeyRevealDialog } from '@/components/keys/api-key-reveal-dialog'
import { GenerateKeyDialog } from '@/components/keys/generate-key-dialog'
import { api, type ApiKey } from '@/lib/api'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { ENVIRONMENTS } from '@/lib/constants'

interface KeyListProps {
  keys: ApiKey[]
  orgId?: string
  canRevoke?: boolean
  canManage?: boolean
  setupKeyPrefix?: string
  setupEnv?: string
}

export function KeyList({
  keys,
  orgId,
  canRevoke = false,
  canManage = false,
  setupKeyPrefix,
  setupEnv = 'dev',
}: KeyListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const urlEnv = searchParams.get('env') || 'dev'
  const [envTab, setEnvTab] = useState(urlEnv)
  const [rotatedKey, setRotatedKey] = useState<string | null>(null)

  const filteredKeys = useMemo(
    () => keys.filter((k) => k.environment === envTab),
    [keys, envTab],
  )

  function formatLastUsed(ts: string | null): { label: string; title?: string } {
    if (!ts) return { label: 'Never' }
    const d = new Date(ts)
    if (Number.isNaN(d.valueOf())) return { label: ts }

    const diffMs = Date.now() - d.getTime()
    const diffMin = Math.round(diffMs / 60000)
    const diffHr = Math.round(diffMs / 3600000)
    const diffDay = Math.round(diffMs / 86400000)

    let rel = 'Just now'
    if (diffMin >= 2 && diffMin < 60) rel = `${diffMin}m ago`
    else if (diffHr >= 1 && diffHr < 48) rel = `${diffHr}h ago`
    else if (diffDay >= 2) rel = `${diffDay}d ago`

    return { label: rel, title: d.toLocaleString() }
  }

  async function copyPrefix(prefix: string) {
    const ok = await copyToClipboard(prefix)
    if (ok) {
      toast.success('Prefix copied')
    } else {
      toast.error('Could not copy automatically. Select the prefix and copy it manually.')
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    const token = await getToken()
    if (!token) return
    try {
      await api.keys.revoke(token, keyId, orgId)
      toast.success('API key revoked')
      router.refresh()
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  async function handleRotate(key: ApiKey) {
    if (!confirm(`Rotate "${key.name}"? A new key will be created — revoke the old one after updating your app.`)) {
      return
    }
    const token = await getToken()
    if (!token) return
    try {
      const created = await api.keys.create(
        token,
        { name: key.name, environment: key.environment },
        orgId,
      )
      if (created.raw_key) {
        setRotatedKey(created.raw_key)
        toast.success('New key created')
      } else {
        toast.success('New key created')
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate key')
    }
  }

  function switchEnv(env: string) {
    setEnvTab(env)
    const params = new URLSearchParams(searchParams.toString())
    params.set('env', env)
    router.replace(`${window.location.pathname}?${params.toString()}`)
  }

  function handleRotatedKeyClose(open: boolean) {
    if (!open) {
      setRotatedKey(null)
      router.refresh()
    }
  }

  const revealDialog = (
    <ApiKeyRevealDialog
      apiKey={rotatedKey}
      open={rotatedKey !== null}
      onOpenChange={handleRotatedKeyClose}
      title="New API Key"
      description="Your rotated key is shown once. Copy it and update your app before revoking the old key."
    />
  )

  if (keys.length === 0) {
    return (
      <>
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium">No API keys yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a key to use with the SDK in your app.
          </p>
          {canManage && (
            <div className="mt-4">
              <GenerateKeyDialog canManage orgId={orgId} defaultEnv="dev" defaultOpen={false} />
            </div>
          )}
        </div>
        {revealDialog}
      </>
    )
  }

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ENVIRONMENTS.map((env) => (
          <Button
            key={env}
            variant={envTab === env ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchEnv(env)}
          >
            {env}
            <span className="ml-1.5 text-xs opacity-70">
              {keys.filter((k) => k.environment === env).length}
            </span>
          </Button>
        ))}
      </div>

      {filteredKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium">No {envTab} keys</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a {envTab} key for this environment.
          </p>
          {canManage && (
            <div className="mt-4">
              <GenerateKeyDialog canManage orgId={orgId} defaultEnv={envTab} />
            </div>
          )}
        </div>
      ) : (
        <Table className="rounded-lg border border-border bg-card">
          <TableHeader>
            <TableRow className="border-b border-[var(--row-separator)]">
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.map((k) => {
              const lastUsed = formatLastUsed(k.last_used_at)
              const usedInSetup =
                setupKeyPrefix &&
                k.key_prefix === setupKeyPrefix &&
                k.environment === setupEnv

              return (
                <TableRow key={k.id} className="border-b border-[var(--row-separator)]">
                  <TableCell className="font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {k.name}
                      {usedInSetup && (
                        <Badge variant="secondary" className="text-xs">
                          Used in Setup
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => copyPrefix(k.key_prefix)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-code-bg px-2.5 py-1 font-mono text-xs text-code-foreground hover:bg-muted"
                      title="Copy prefix"
                    >
                      {k.key_prefix}...
                      <Copy className="h-3 w-3 opacity-60" />
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(k.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lastUsed.label === 'Never' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted underline-offset-2">
                            Never
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Call the SDK to see activity</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span title={lastUsed.title}>{lastUsed.label}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRotate(k)}
                          title="Rotate key"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRevoke(k.id)}
                        disabled={!canRevoke}
                        title={canRevoke ? 'Revoke key' : 'Your role cannot revoke keys'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
    {revealDialog}
    </>
  )
}
