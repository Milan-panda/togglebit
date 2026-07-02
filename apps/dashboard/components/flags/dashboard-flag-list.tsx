'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FlagTable } from '@/components/flags/flag-table'
import { type Flag } from '@/lib/api'
import { applyFlagsFilterUpdates, FLAGS_PAGE_SIZE } from '@/lib/flags-url'

interface Props {
  flags: Flag[]
  env: string
  orgId?: string
  canEdit: boolean
  canDelete: boolean
  hasActiveFilters: boolean
  usageByFlagId: Record<string, number[]>
  usageTotalsByFlagId: Record<string, number>
  total: number
  page: number
}

export function DashboardFlagList(props: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onPageChange(nextPage: number) {
    const sp = applyFlagsFilterUpdates(searchParams, { page: String(nextPage) })
    router.replace(`${pathname}?${sp.toString()}`)
  }

  return (
    <FlagTable
      {...props}
      onPageChange={onPageChange}
    />
  )
}

export { FLAGS_PAGE_SIZE }
