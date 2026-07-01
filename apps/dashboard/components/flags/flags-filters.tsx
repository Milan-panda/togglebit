'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function FlagsFilters({
  initialQ,
  initialType,
  initialEnabled,
}: {
  initialQ: string
  initialType: string
  initialEnabled: 'all' | 'true' | 'false'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(initialQ)
  const [debouncedQ, setDebouncedQ] = useState(initialQ)
  const [type, setType] = useState(initialType)
  const [enabled, setEnabled] = useState<'all' | 'true' | 'false'>(initialEnabled)
  const isFirstRun = useRef(true)

  const base = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 300)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    const sp = new URLSearchParams(base.toString())
    const trimmed = debouncedQ.trim()

    if (trimmed) sp.set('q', trimmed)
    else sp.delete('q')

    if (type && type !== 'all') sp.set('type', type)
    else sp.delete('type')

    if (enabled === 'all') sp.delete('enabled')
    else sp.set('enabled', enabled)

    const next = sp.toString()
    const current = searchParams.toString()
    if (next === current) return

    router.push(next ? `${pathname}?${next}` : pathname)
  }, [debouncedQ, type, enabled, base, pathname, router, searchParams])

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center">
      <div className="flex-1">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search flags…"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={(v) => setType(v ?? 'all')}>
          <SelectTrigger className="min-w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="segment">Segment</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
          </SelectContent>
        </Select>

        <Select value={enabled} onValueChange={(v) => setEnabled((v ?? 'all') as 'all' | 'true' | 'false')}>
          <SelectTrigger className="min-w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Enabled</SelectItem>
            <SelectItem value="false">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
