import { OrgGate } from '@/components/layout/org-gate'
import { AppShell } from '@/components/layout/app-shell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgGate>
      <AppShell>{children}</AppShell>
    </OrgGate>
  )
}
