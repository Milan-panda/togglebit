'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreateFlagDialog } from '@/components/flags/create-flag-dialog'

interface Props {
  canCreate: boolean
  orgId?: string
}

function CreateFlagDialogWithParams({ canCreate, orgId }: Props) {
  const searchParams = useSearchParams()
  const defaultOpen = searchParams.get('create') === '1'

  return (
    <CreateFlagDialog canCreate={canCreate} orgId={orgId} defaultOpen={defaultOpen} />
  )
}

export function DashboardCreateFlag({ canCreate, orgId }: Props) {
  return (
    <Suspense fallback={<CreateFlagDialog canCreate={canCreate} orgId={orgId} />}>
      <CreateFlagDialogWithParams canCreate={canCreate} orgId={orgId} />
    </Suspense>
  )
}
