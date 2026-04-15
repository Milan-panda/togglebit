'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Copy, Trash2 } from 'lucide-react'
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
}

export function KeyList({ keys }: KeyListProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    const token = await getToken()
    if (!token) return
    try {
      await api.keys.revoke(token, keyId)
      toast.success('API key revoked')
      router.refresh()
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No API keys</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate an API key to start evaluating flags.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Prefix</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k.id}>
            <TableCell className="font-medium">{k.name}</TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {k.key_prefix}...
              </code>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{k.environment}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(k.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRevoke(k.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
