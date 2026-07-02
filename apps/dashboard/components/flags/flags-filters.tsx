'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { applyFlagsFilterUpdates, readFlagsFilters } from '@/lib/flags-url'

export function FlagsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = readFlagsFilters(searchParams)
  const { q: urlQ, type, enabled, has_rules, rollout_gt, sort, order } = filters
  const [draftQ, setDraftQ] = useState(urlQ)

  useEffect(() => {
    setDraftQ(urlQ)
  }, [urlQ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = draftQ.trim()
      if (trimmed === urlQ) return

      const sp = applyFlagsFilterUpdates(searchParams, { q: trimmed || null, page: '1' })
      router.replace(`${pathname}?${sp.toString()}`)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [draftQ, urlQ, pathname, router, searchParams])

  function replace(updates: Parameters<typeof applyFlagsFilterUpdates>[1]) {
    const sp = applyFlagsFilterUpdates(searchParams, { ...updates, page: '1' })
    router.replace(`${pathname}?${sp.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search flags…"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={(v) => replace({ type: v === 'all' ? null : v })}>
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

          <Select
            value={enabled}
            onValueChange={(v) => replace({ enabled: v === 'all' ? null : v })}
          >
            <SelectTrigger className="min-w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={has_rules}
            onValueChange={(v) => replace({ has_rules: v === 'true' ? 'true' : null })}
          >
            <SelectTrigger className="min-w-32">
              <SelectValue placeholder="Rules" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">Any rules</SelectItem>
              <SelectItem value="true">Has rules</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={rollout_gt || 'any'}
            onValueChange={(v) => replace({ rollout_gt: v === 'any' ? null : v })}
          >
            <SelectTrigger className="min-w-36">
              <SelectValue placeholder="Rollout" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="any">Any rollout</SelectItem>
              <SelectItem value="0">Rollout &gt; 0%</SelectItem>
              <SelectItem value="50">Rollout &gt; 50%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={sort}
          onValueChange={(v) => replace({ sort: v === 'created_at' ? null : v })}
        >
          <SelectTrigger className="min-w-36">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="created_at">Last changed</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="eval_volume">Eval volume</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={order}
          onValueChange={(v) => replace({ order: v === 'desc' ? null : v })}
        >
          <SelectTrigger className="min-w-28">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
