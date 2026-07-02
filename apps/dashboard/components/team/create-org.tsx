'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Building2, Plus } from 'lucide-react'
import { ORG_LIST_CHANGED_EVENT } from '@/components/layout/org-switcher'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

function useCreateOrgForm() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (slugTouched) return
    setSlug(slugify(name))
  }, [name, slugTouched])

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  function reset() {
    setName('')
    setSlug('')
    setSlugTouched(false)
  }

  return {
    name,
    slug,
    setName,
    handleSlugChange,
    reset,
    isValid: name.trim().length > 0 && slug.trim().length >= 2,
  }
}

function SlugPreview({ slug }: { slug: string }) {
  const preview = slug.trim() || 'your-org'
  return (
    <p className="text-xs text-muted-foreground">
      Workspace URL:{' '}
      <code className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
        ?org={preview}
      </code>
    </p>
  )
}

function CreateOrgFields({
  idPrefix,
  name,
  slug,
  onNameChange,
  onSlugChange,
  className,
}: {
  idPrefix: string
  name: string
  slug: string
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Organization name</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="Acme Inc"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="organization"
          autoFocus={idPrefix === 'welcome-org'}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-slug`}>URL slug</Label>
        <Input
          id={`${idPrefix}-slug`}
          placeholder="acme-inc"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <SlugPreview slug={slug} />
      </div>
    </div>
  )
}

function useCreateOrgSubmit() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [submitting, setSubmitting] = useState(false)

  async function submit(name: string, slug: string) {
    const n = name.trim()
    const s = slug.trim()
    if (!n || !s || s.length < 2) {
      toast.error('Enter an organization name and a valid slug (letters, numbers, hyphens).')
      return false
    }

    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) return false
      const userEmail = user?.primaryEmailAddress?.emailAddress
      const created = await api.orgs.create(token, { name: n, slug: s, email: userEmail })
      toast.success('Organization created')
      window.dispatchEvent(new Event(ORG_LIST_CHANGED_EVENT))
      router.replace(`/dashboard?org=${encodeURIComponent(created.slug)}&welcome=1`)
      router.refresh()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create organization'
      toast.error(message)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return { submit, submitting }
}

export function CreateOrgWelcome() {
  const form = useCreateOrgForm()
  const { submit, submitting } = useCreateOrgSubmit()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit(form.name, form.slug)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-5 py-6 sm:px-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Set up your workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Name your organization to start creating flags, API keys, and team access. You will
              be the owner.
            </p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 px-5 py-6 sm:px-6">
        <CreateOrgFields
          idPrefix="welcome-org"
          name={form.name}
          slug={form.slug}
          onNameChange={form.setName}
          onSlugChange={form.handleSlugChange}
        />
        <Button type="submit" className="w-full" disabled={submitting || !form.isValid}>
          {submitting ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
    </section>
  )
}

export function CreateOrgDialog() {
  const [open, setOpen] = useState(false)
  const form = useCreateOrgForm()
  const { submit, submitting } = useCreateOrgSubmit()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) form.reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await submit(form.name, form.slug)
    if (ok) {
      setOpen(false)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium">Add another organization</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Run a separate workspace with its own flags, keys, and members.
            </p>
          </div>
        </div>
        <DialogTrigger
          render={
            <Button variant="outline" className="shrink-0 sm:ml-4">
              <Plus className="mr-2 h-4 w-4" />
              New organization
            </Button>
          }
        />
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            You will be the owner. Switch between organizations anytime from the sidebar.
          </DialogDescription>
        </DialogHeader>
        <form id="create-org-dialog-form" onSubmit={handleSubmit}>
          <CreateOrgFields
            idPrefix="dialog-org"
            name={form.name}
            slug={form.slug}
            onNameChange={form.setName}
            onSlugChange={form.handleSlugChange}
          />
        </form>
        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-org-dialog-form"
            disabled={submitting || !form.isValid}
          >
            {submitting ? 'Creating…' : 'Create organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
