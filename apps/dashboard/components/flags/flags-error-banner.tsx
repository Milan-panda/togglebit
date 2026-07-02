'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function FlagsErrorBanner({ message }: { message: string }) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-destructive">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-destructive/30"
        onClick={() => router.refresh()}
      >
        Retry
      </Button>
    </div>
  )
}
