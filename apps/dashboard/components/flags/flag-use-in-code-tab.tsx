'use client'

import { SetupCodeBlock } from '@/components/setup/setup-code-block'
import { SetupPathTabs } from '@/components/setup/setup-path-tabs'

interface Props {
  flagKey: string
  flagType: string
  environment: string
  apiKeyPlaceholder: string
  orgId?: string
}

export function FlagUseInCodeTab({
  flagKey,
  flagType,
  environment,
  apiKeyPlaceholder,
  orgId,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Use in code</h2>
        <p className="text-sm text-muted-foreground">
          Pre-filled snippets for flag{' '}
          <code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-xs">{flagKey}</code>{' '}
          in the <span className="font-medium">{environment}</span> environment.
        </p>
      </div>

      <SetupPathTabs
        apiKeyPlaceholder={apiKeyPlaceholder}
        flagKey={flagKey}
        environment={environment}
        orgId={orgId}
      />

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Quick evaluate</h3>
        <p className="text-sm text-muted-foreground">
          Minimal server-side example for this flag ({flagType}):
        </p>
        <SetupCodeBlock
          language="typescript"
          code={`import { getFlag } from 'togglebit/server'

const enabled = await getFlag('${flagKey}', {
  userId: user.id,
}, {
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: '${environment}',
})`}
          orgId={orgId}
        />
      </div>
    </div>
  )
}
