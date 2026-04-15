'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FlagToggle } from './flag-toggle'
import type { Flag } from '@/lib/api'

interface FlagTableProps {
  flags: Flag[]
  env: string
}

export function FlagTable({ flags, env }: FlagTableProps) {
  if (flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No flags yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first feature flag to get started.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Rollout</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((flag) => {
          const envConfig = flag.environments?.[env]
          return (
            <TableRow key={flag.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/flags/${flag.key}?env=${env}`}
                  className="hover:underline"
                >
                  {flag.name}
                </Link>
              </TableCell>
              <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {flag.key}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{flag.type}</Badge>
              </TableCell>
              <TableCell>
                <FlagToggle
                  flagKey={flag.key}
                  env={env}
                  enabled={envConfig?.enabled ?? false}
                />
              </TableCell>
              <TableCell className="text-right">
                {flag.type === 'percentage' && envConfig
                  ? `${envConfig.rollout_pct}%`
                  : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
