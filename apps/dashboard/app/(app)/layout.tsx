import { Suspense } from 'react'
import { OrgGate } from '@/components/layout/org-gate'
import { AppShell } from '@/components/layout/app-shell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OrgGate>
        <AppShell>{children}</AppShell>
      </OrgGate>
    </Suspense>
  )
}
