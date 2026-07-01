'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Flag, Key, Rocket, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from '@/components/layout/org-switcher'

const navItems = [
  { href: '/dashboard', label: 'Flags', icon: Flag },
  { href: '/keys', label: 'API Keys', icon: Key },
  { href: '/quickstart', label: 'Setup', icon: Rocket },
  { href: '/onboarding', label: 'Settings', icon: Settings },
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
        'fixed inset-y-0 left-0 z-40 flex h-screen w-52 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-300 ease-out md:relative md:z-20 md:w-52 md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed && 'md:w-[4.5rem]',
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-4',
          collapsed && 'md:justify-center md:px-0',
        )}
      >
        <Link
          href={withOrg('/dashboard')}
          onClick={onCloseMobile}
          className={cn('flex items-center gap-2.5', collapsed && 'md:justify-center')}
          aria-label="Go to dashboard"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Flag className="h-4 w-4" />
          </span>
          <span
            className={cn(
              collapsed && 'md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0',
            )}
          >
            <span className="block text-sm font-semibold tracking-tight">Togglebit</span>
          </span>
        </Link>
      </div>

      <div className={cn('border-b border-sidebar-border p-3', collapsed && 'md:px-2')}>
        <OrgSwitcher collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
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
                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]'
                  : 'text-muted-foreground hover:bg-[var(--nav-hover-bg)] hover:text-foreground',
                collapsed && 'md:mx-auto md:h-9 md:w-9 md:justify-center md:px-0',
              )}
              aria-label={item.label}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  collapsed && 'md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
