import { UserButton } from '@clerk/nextjs'
import { Sidebar } from '@/components/layout/sidebar'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { OrgGate } from '@/components/layout/org-gate'
import { TogglebitDogfoodBadge } from '@/components/togglebit-dogfood-badge'
import { Suspense } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgGate>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b px-6">
            <Suspense>
              <EnvSwitcher />
            </Suspense>
            <div className="flex items-center gap-3">
              <TogglebitDogfoodBadge />
              <UserButton />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </OrgGate>
  )
}
