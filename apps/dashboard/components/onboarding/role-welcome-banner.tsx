'use client'

import Link from 'next/link'
import { Info } from 'lucide-react'
import type { OrgRole } from '@/lib/api'

interface Props {
  role: OrgRole
  orgId?: string
}

export function RoleWelcomeBanner({ role, orgId }: Props) {
  if (role === 'owner' || role === 'admin') return null

  const teamHref = orgId ? `/onboarding?org=${encodeURIComponent(orgId)}` : '/onboarding'

  if (role === 'developer') {
    return (
      <div className="flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          You can create and edit flags. Ask an admin for a dev API key to integrate the SDK.{' '}
          <Link href={teamHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            Go to Team
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-muted-foreground">
        You can view flags and eval logs. Contact an admin to change flag settings.{' '}
        <Link href={teamHref} className="font-medium text-foreground underline-offset-4 hover:underline">
          Go to Team
        </Link>
      </p>
    </div>
  )
}
