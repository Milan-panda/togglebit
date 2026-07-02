'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ApiKeyRevealDialogProps {
  apiKey: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
}

export function ApiKeyRevealDialog({
  apiKey,
  open,
  onOpenChange,
  title = 'Your API Key',
  description = 'Copy this key now. You won\'t be able to see it again.',
}: ApiKeyRevealDialogProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!apiKey) return
    const ok = await copyToClipboard(apiKey)
    if (!ok) {
      toast.error('Could not copy automatically. Select the key and copy it manually.')
      return
    }
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenChange(next: boolean) {
    if (!next) setCopied(false)
    onOpenChange(next)
  }

  if (!apiKey) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input value={apiKey} readOnly className="font-mono text-xs" />
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
          <Button
            onClick={() => handleOpenChange(false)}
            className="w-full rounded-full bg-primary hover:bg-[var(--primary-hover)]"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
