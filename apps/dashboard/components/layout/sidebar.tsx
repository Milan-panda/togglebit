'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Flag,
  Key,
  Rocket,
  LayoutDashboard,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { OrgSwitcher } from '@/components/layout/org-switcher'

const navItems = [
  { href: '/dashboard', label: 'Flags', icon: LayoutDashboard },
  { href: '/keys', label: 'API Keys', icon: Key },
  { href: '/quickstart', label: 'Quickstart', icon: Rocket },
  { href: '/onboarding', label: 'Organization', icon: Building2 },
]

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedOrgId = searchParams.get('org')

  function withOrg(href: string) {
    if (!selectedOrgId) return href
    const params = new URLSearchParams()
    params.set('org', selectedOrgId)
    return `${href}?${params.toString()}`
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-screen w-52 flex-col border-r border-sidebar-border bg-sidebar shadow-xl backdrop-blur-md transition-[transform,width] duration-300 ease-out md:relative md:z-20 md:w-52 md:translate-x-0 md:shadow-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed && 'md:w-20',
      )}
      aria-label="Main navigation"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(100%_75%_at_50%_0%,hsl(var(--foreground)/0.06),transparent_55%)]" />

      <div
        className={cn(
          'relative flex h-16 items-center border-b border-sidebar-border px-4',
          collapsed && 'md:justify-center md:px-0',
        )}
      >
        <Link
          href={withOrg('/dashboard')}
          onClick={onCloseMobile}
          className={cn(
            'group flex items-center gap-2',
            collapsed && 'md:justify-center',
          )}
          aria-label="Go to dashboard"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background shadow-sm transition-transform group-hover:-rotate-2">
            <Flag className="h-4 w-4" />
          </span>
          <span
            className={cn(
              'leading-tight transition-opacity duration-200',
              collapsed && 'md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0',
            )}
          >
            <span className="block text-sm font-semibold tracking-tight">
              Togglebit
            </span>
            <span className="block text-[11px] text-muted-foreground">
              feature flags
            </span>
          </span>
        </Link>
      </div>

      <div className={cn('space-y-2 border-b border-sidebar-border p-3', collapsed && 'hidden md:block md:px-2')}>
        <div className={cn('space-y-2', collapsed && 'md:hidden')}>
          <OrgSwitcher />
          <EnvSwitcher />
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 p-3">
        {!collapsed && <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Workspace</p>}
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={withOrg(item.href)}
              title={collapsed ? item.label : undefined}
              onClick={onCloseMobile}
              className={cn(
                'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] shadow-sm'
                  : 'text-muted-foreground hover:bg-[var(--nav-hover-bg)] hover:text-foreground',
                collapsed && 'md:justify-center md:px-2',
              )}
              aria-label={item.label}
            >
              {isActive && (
                <span className="absolute inset-y-1 left-0 w-px rounded-full bg-[var(--nav-active-glow)]" />
              )}
              <span
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-md border border-border bg-background/70',
                  isActive && 'bg-background',
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  'transition-opacity duration-200',
                  collapsed && 'md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className={cn('relative border-t border-sidebar-border p-3', collapsed && 'md:px-2 md:py-3')}>
        <div className={cn('rounded-xl border border-border bg-background/70 p-3', collapsed && 'md:grid md:place-items-center md:p-2')}>
          <p className={cn('text-xs text-muted-foreground', collapsed && 'md:hidden')}>
            Shortcut:
            <span className="ml-2 align-middle">
              <kbd className="kbd-chip">Ctrl/Cmd + B</kbd>
            </span>
          </p>
          {collapsed && <span className="sr-only">Shortcut: Ctrl or Command + B</span>}
        </div>
      </div>
    </aside>
  )
}
