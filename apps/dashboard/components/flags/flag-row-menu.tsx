'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, FlaskConical, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { api, type Flag } from '@/lib/api'
import { withOrgAndEnv } from '@/lib/env-url'

interface FlagRowMenuProps {
  flag: Flag
  env: string
  orgId?: string
  canManage?: boolean
  canDelete?: boolean
  onDuplicated?: () => void
}

export function FlagRowMenu({
  flag,
  env,
  orgId,
  canManage = false,
  canDelete = false,
  onDuplicated,
}: FlagRowMenuProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  async function copyKey() {
    await navigator.clipboard.writeText(flag.key)
    toast.success('Flag key copied')
  }

  async function duplicateFlag() {
    const newKey = `${flag.key}-copy`
    const newName = `${flag.name} (copy)`
    if (!confirm(`Duplicate as "${newKey}"?`)) return

    try {
      const token = await getToken()
      if (!token) return
      const created = await api.flags.clone(token, flag.key, { new_key: newKey, new_name: newName }, orgId)
      toast.success('Flag duplicated')
      onDuplicated?.()
      router.push(withOrgAndEnv(`/flags/${created.key}`, orgId, env))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate flag')
    }
  }

  async function archiveFlag() {
    if (!confirm(`Archive "${flag.name}"? It will be hidden from the flags list.`)) return
    try {
      const token = await getToken()
      if (!token) return
      await api.flags.delete(token, flag.key, orgId, false)
      toast.success('Flag archived')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive flag')
    }
  }

  const testHref = `${withOrgAndEnv(`/flags/${flag.key}`, orgId, env)}&test=1`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Flag actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(testHref)}>
          <FlaskConical className="h-4 w-4" />
          Open test
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyKey}>
          <Copy className="h-4 w-4" />
          Copy key
        </DropdownMenuItem>
        {canManage && (
          <DropdownMenuItem onClick={duplicateFlag}>Duplicate</DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={archiveFlag}
            >
              <Trash2 className="h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const RECENT_FLAGS_KEY = 'togglebit.recentFlags'

export function pushRecentFlag(key: string) {
  if (typeof window === 'undefined') return
  const existing = JSON.parse(window.localStorage.getItem(RECENT_FLAGS_KEY) || '[]') as string[]
  const next = [key, ...existing.filter((k) => k !== key)].slice(0, 5)
  window.localStorage.setItem(RECENT_FLAGS_KEY, JSON.stringify(next))
}

export function readRecentFlags(): string[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(window.localStorage.getItem(RECENT_FLAGS_KEY) || '[]') as string[]
}

export function FlagCommandPalette({
  open,
  onOpenChange,
  orgId,
  env,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId?: string
  env: string
}) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(false)

  const loadFlags = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await api.flags.list(token, env, orgId, { limit: 200 })
      setFlags(res.flags)
    } catch {
      setFlags([])
    } finally {
      setLoading(false)
    }
  }, [getToken, env, orgId])

  useEffect(() => {
    if (open) loadFlags()
  }, [open, loadFlags])

  function navigate(key: string) {
    pushRecentFlag(key)
    onOpenChange(false)
    router.push(withOrgAndEnv(`/flags/${key}`, orgId, env))
  }

  const recent = readRecentFlags()
  const recentFlags = recent
    .map((key) => flags.find((f) => f.key === key))
    .filter(Boolean) as Flag[]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter>
        <CommandInput placeholder="Search flags by name or key…" />
        <CommandList>
          <CommandEmpty>{loading ? 'Loading…' : 'No flags found.'}</CommandEmpty>
          {recentFlags.length > 0 && (
            <CommandGroup heading="Recent">
              {recentFlags.map((flag) => (
                <CommandItem
                  key={flag.key}
                  value={`${flag.name} ${flag.key}`}
                  onSelect={() => navigate(flag.key)}
                >
                  <span className="font-medium">{flag.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{flag.key}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="All flags">
            {flags.map((flag) => (
              <CommandItem
                key={flag.key}
                value={`${flag.name} ${flag.key}`}
                onSelect={() => navigate(flag.key)}
              >
                <span className="font-medium">{flag.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{flag.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
