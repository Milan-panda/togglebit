'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Plus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { refreshOnboardingStatus } from '@/components/onboarding/getting-started-checklist'

export function GenerateKeyDialog({
  canManage = false,
  orgId,
  defaultEnv = 'dev',
  defaultOpen = false,
  buttonLabel = 'Generate Key',
}: {
  canManage?: boolean
  orgId?: string
  defaultEnv?: string
  defaultOpen?: boolean
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState(defaultEnv)
  const [generatedKey, setGeneratedKey] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const { getToken } = useAuth()

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return

    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const result = await api.keys.create(token, { name, environment }, orgId)
      setGeneratedKey(result.raw_key || '')
      setOpen(true)
      toast.success('API key generated')
      refreshOnboardingStatus()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate key'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(generatedKey)
    if (!ok) {
      toast.error('Could not copy automatically. Select the key and copy it manually.')
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose(isOpen: boolean) {
    const hadGeneratedKey = Boolean(generatedKey)
    setOpen(isOpen)
    if (!isOpen) {
      if (hadGeneratedKey) {
        router.refresh()
      }
      setGeneratedKey('')
      setName('')
      setEnvironment(defaultEnv)
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button
            disabled={!canManage}
            className="rounded-full bg-primary px-4 hover:bg-[var(--primary-hover)]"
            title={canManage ? undefined : 'Your role cannot create API keys'}
          />
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate API Key</DialogTitle>
          <DialogDescription>
            Keys are shown once. Copy and store it before closing.
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input value={generatedKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                Copy this key now. You won&apos;t be able to see it again.
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full rounded-full bg-primary hover:bg-[var(--primary-hover)]">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Production key"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(v) => v && setEnvironment(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">dev</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                  <SelectItem value="prod">prod</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-full bg-primary hover:bg-[var(--primary-hover)]" disabled={loading}>
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
