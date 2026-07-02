'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { markSdkSnippetCopied } from '@/lib/onboarding-copy'

export function SetupCodeBlock({
  code,
  language,
  className,
  orgId,
}: {
  code: string
  language: string
  className?: string
  orgId?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const ok = await copyToClipboard(code)
    if (!ok) {
      toast.error('Could not copy automatically. Select the snippet and copy it manually.')
      return
    }
    setCopied(true)
    markSdkSnippetCopied(orgId)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-code-bg',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-code-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}
