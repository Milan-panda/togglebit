'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
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
import { api, type ApiKey } from '@/lib/api'

interface KeyListProps {
  keys: ApiKey[]
  orgId?: string
  canRevoke?: boolean
}

export function KeyList({ keys, orgId, canRevoke = false }: KeyListProps) {
  const envBadgeClass: Record<string, string> = {
    dev: 'bg-muted text-foreground ring-1 ring-border',
    staging: 'bg-muted text-foreground ring-1 ring-border',
    prod: 'bg-muted text-foreground ring-1 ring-border',
  }

  const router = useRouter()
  const { getToken } = useAuth()

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

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="font-medium">No API keys yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a key to use with the SDK in your app.
        </p>
      </div>
    )
  }

  return (
    <Table className="rounded-lg border border-border bg-card">
      <TableHeader>
        <TableRow className="border-b border-[var(--row-separator)]">
          <TableHead>Name</TableHead>
          <TableHead>Prefix</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k.id} className="border-b border-[var(--row-separator)]">
            <TableCell className="font-medium">{k.name}</TableCell>
            <TableCell>
              <code className="rounded-full border border-border bg-code-bg px-2.5 py-1 font-mono text-xs text-code-foreground">
                {k.key_prefix}...
              </code>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className={`rounded-full px-2.5 ${envBadgeClass[k.environment] ?? 'bg-muted text-foreground'}`}>
                {k.environment}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(k.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground" title={formatLastUsed(k.last_used_at).title}>
              {formatLastUsed(k.last_used_at).label}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRevoke(k.id)}
                disabled={!canRevoke}
                title={canRevoke ? 'Revoke key' : 'Your role cannot revoke keys'}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
