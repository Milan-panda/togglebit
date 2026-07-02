'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GettingStartedChecklist } from '@/components/onboarding/getting-started-checklist'
import { RoleWelcomeBanner } from '@/components/onboarding/role-welcome-banner'
import type { OrgRole } from '@/lib/api'

interface Props {
  orgId?: string
  orgRole: OrgRole
  showChecklist: boolean
}

export function DashboardExtras({ orgId, orgRole, showChecklist }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      toast.success('Organization created! Follow the checklist to evaluate your first flag.')
      const params = new URLSearchParams(searchParams.toString())
      params.delete('welcome')
      const qs = params.toString()
      router.replace(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false })
    }
  }, [searchParams, router])

  return (
    <div className="space-y-4">
      <RoleWelcomeBanner role={orgRole} orgId={orgId} />
      {showChecklist && <GettingStartedChecklist orgId={orgId} />}
    </div>
  )
}
