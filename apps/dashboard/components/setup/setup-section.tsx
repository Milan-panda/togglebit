'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SETUP_SECTIONS, type SetupSectionId } from './setup-content'

export function SetupToc({ className }: { className?: string }) {
  const [active, setActive] = useState<SetupSectionId>('overview')

  useEffect(() => {
    const sectionEls = SETUP_SECTIONS.map((s) => ({
      id: s.id,
      el: document.getElementById(s.id),
    })).filter((s): s is { id: SetupSectionId; el: HTMLElement } => Boolean(s.el))

    if (sectionEls.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id as SetupSectionId)
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] },
    )

    sectionEls.forEach(({ el }) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav aria-label="On this page" className={cn('space-y-1', className)}>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      {SETUP_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            'block rounded-md px-2.5 py-1.5 text-sm transition-colors',
            active === section.id
              ? 'bg-primary/8 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}

export function SetupSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: SetupSectionId
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-6 space-y-5', className)}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

export function SetupStep({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {String(number).padStart(2, '0')}
        </span>
        <h3 className="text-base font-medium">{title}</h3>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  )
}
