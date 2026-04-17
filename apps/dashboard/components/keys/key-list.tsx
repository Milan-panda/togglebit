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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-lg font-semibold">No API keys yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate your first key to start evaluating flags in the SDK.
        </p>
      </div>
    )
  }

  return (
    <Table className="rounded-xl border border-border/70 bg-card">
      <TableHeader>
        <TableRow className="border-b border-[var(--row-separator)]">
          <TableHead>Name</TableHead>
          <TableHead>Prefix</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k.id} className="group border-b border-[var(--row-separator)] hover:bg-accent/20">
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
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => handleRevoke(k.id)}
                disabled={!canRevoke}
                title={canRevoke ? undefined : 'Your role cannot revoke keys'}
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
