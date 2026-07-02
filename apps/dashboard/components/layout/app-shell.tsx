'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { EnvPersistence } from '@/components/layout/env-persistence'
import { FlagCommandPalette } from '@/components/flags/flag-row-menu'
import { TogglebitDogfoodBadge } from '@/components/togglebit-dogfood-badge'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { resolveEnv } from '@/lib/env-url'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'togglebit.sidebar.collapsed'
const DESKTOP_BREAKPOINT_QUERY = '(min-width: 768px)'

export function AppShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org') ?? undefined
  const env = resolveEnv(searchParams)

  const [isDesktop, setIsDesktop] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return (
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    )
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT_QUERY)
    const updateIsDesktop = () => {
      setIsDesktop(mediaQuery.matches)
      if (mediaQuery.matches) {
        setMobileOpen(false)
      }
    }
    updateIsDesktop()
    mediaQuery.addEventListener('change', updateIsDesktop)
    return () => mediaQuery.removeEventListener('change', updateIsDesktop)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed),
    )
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  const toggleSidebar = useCallback(() => {
    if (isDesktop) {
      setCollapsed((value) => !value)
      return
    }
    setMobileOpen((value) => !value)
  }, [isDesktop])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
        return
      }

      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'b') {
        return
      }
      event.preventDefault()
      toggleSidebar()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen, toggleSidebar])

  return (
    <TooltipProvider>
      <EnvPersistence />
      <div className="relative flex h-screen bg-background">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {mobileOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Toggle sidebar"
                title="Toggle sidebar (Ctrl+B / Cmd+B)"
                onClick={toggleSidebar}
              >
                {isDesktop ? (
                  collapsed ? (
                    <PanelLeftOpen />
                  ) : (
                    <PanelLeftClose />
                  )
                ) : (
                  <PanelLeftOpen />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden gap-2 text-muted-foreground sm:inline-flex"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span>Search flags</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  ⌘K
                </kbd>
              </Button>
              <EnvSwitcher className="hidden md:flex" />
            </div>

            <div className="flex items-center gap-3">
              <TogglebitDogfoodBadge />
              <ThemeToggle />
              <div className="rounded-full ring-0 transition-shadow hover:ring-2 hover:ring-ring/30">
                <UserButton />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>

        <FlagCommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          orgId={orgId}
          env={env}
        />
      </div>
    </TooltipProvider>
  )
}
