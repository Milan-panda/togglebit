'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ENVIRONMENTS } from '@/lib/constants'

export function EnvSwitcher() {
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
    <Select value={currentEnv} onValueChange={(v) => v && handleChange(v)}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENVIRONMENTS.map((env) => (
          <SelectItem key={env} value={env}>
            {env}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
