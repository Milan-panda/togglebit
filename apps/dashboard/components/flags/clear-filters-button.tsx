'use client'

import { usePathname, useRouter } from 'next/navigation'
import { buildDashboardUrl } from '@/lib/flags-url'

export function ClearFiltersButton({
  env,
  orgId,
}: {
  env: string
  orgId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  function handleClear() {
    router.replace(buildDashboardUrl(pathname, env, orgId))
  }

  return (
    <button
      type="button"
      onClick={handleClear}
      className="mt-4 text-sm font-medium text-primary hover:underline"
    >
      Clear filters
    </button>
  )
}
