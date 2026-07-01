'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ENVIRONMENTS } from '@/lib/constants'

export function EnvSwitcher({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentEnv = searchParams.get('env') || 'dev'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('env', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">Environment</span>
      <Select value={currentEnv} onValueChange={(v) => v && handleChange(v)}>
        <SelectTrigger className="h-8 w-[7.5rem] rounded-lg border border-input bg-background px-2.5 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="min-w-32">
          {ENVIRONMENTS.map((env) => (
            <SelectItem key={env} value={env}>
              {env}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
