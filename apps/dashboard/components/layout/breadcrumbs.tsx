'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { withOrgAndEnv } from '@/lib/env-url'

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({
  crumbs,
  orgId,
  env,
}: {
  crumbs: Crumb[]
  orgId?: string
  env?: string
}) {
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            {crumb.href && !isLast ? (
              <Link href={withOrgAndEnv(crumb.href, orgId, env)} className="hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-foreground' : undefined}>{crumb.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
