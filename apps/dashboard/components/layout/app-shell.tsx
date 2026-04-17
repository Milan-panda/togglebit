'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { TogglebitDogfoodBadge } from '@/components/togglebit-dogfood-badge'
import { Button } from '@/components/ui/button'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'togglebit.sidebar.collapsed'
const DESKTOP_BREAKPOINT_QUERY = '(min-width: 768px)'

export function AppShell({ children }: { children: React.ReactNode }) {
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
        <header className="flex h-14 items-center justify-between border-b border-border/80 bg-card/70 px-4 backdrop-blur md:px-6">
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
    </div>
  )
}
