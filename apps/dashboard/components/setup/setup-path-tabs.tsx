'use client'

import { useEffect, useState } from 'react'
import { MonitorSmartphone, Server, Shield } from 'lucide-react'
import { SetupCodeBlock } from '@/components/setup/setup-code-block'
import { SetupStep } from '@/components/setup/setup-section'
import {
  SERVER_VS_CLIENT,
  clientSetupSnippets,
  serverSetupSnippets,
} from '@/components/setup/setup-content'
import { cn } from '@/lib/utils'

export type SetupPath = 'server' | 'client'

interface SetupPathTabsProps {
  apiKeyPlaceholder: string
  defaultPath?: SetupPath
  flagKey?: string
  environment?: string
  orgId?: string
}

export function SetupPathTabs({
  apiKeyPlaceholder,
  defaultPath = 'server',
  flagKey,
  environment = 'dev',
  orgId,
}: SetupPathTabsProps) {
  const [path, setPath] = useState<SetupPath>(defaultPath)
  const snippetOpts = { flagKey, environment }
  const server = serverSetupSnippets(apiKeyPlaceholder, snippetOpts)
  const client = clientSetupSnippets(apiKeyPlaceholder, snippetOpts)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash === 'client') setPath('client')
    else if (hash === 'server') setPath('server')
  }, [])

  function selectPath(next: SetupPath) {
    setPath(next)
    window.history.replaceState(null, '', `#${next}`)
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="SDK setup path"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        <TabButton
          active={path === 'server'}
          onClick={() => selectPath('server')}
          icon={Server}
          label="Server setup"
          hint="Recommended"
        />
        <TabButton
          active={path === 'client'}
          onClick={() => selectPath('client')}
          icon={MonitorSmartphone}
          label="Client setup"
        />
      </div>

      {path === 'server' ? (
        <div role="tabpanel" id="server-panel" aria-labelledby="server-tab" className="space-y-6">
          <PathIntro
            icon={Server}
            tone="primary"
            text={
              <>
                Import from <code className="font-mono text-xs">togglebit/server</code> in Server
                Components, route handlers, and Server Actions. Your API key stays secret.
              </>
            }
          />
          <div className="space-y-8">
            <SetupStep number={1} title="Install the package">
              <SetupCodeBlock code={server.install} language="bash" orgId={orgId} />
            </SetupStep>
            <SetupStep number={2} title="Create a shared server client">
              <p className="mb-3 text-sm text-muted-foreground">
                One config file, import everywhere on the server. Same idea as a database client.
              </p>
              <SetupCodeBlock code={server.client} language="typescript" orgId={orgId} />
            </SetupStep>
            <SetupStep number={3} title="Set your API key">
              <SetupCodeBlock code={server.env} language="bash" orgId={orgId} />
              <p className="mt-2 text-xs text-muted-foreground">
                Never commit this file. Keep{' '}
                <code className="font-mono">TOGGLEBIT_API_KEY</code> server-only.
              </p>
            </SetupStep>
            <SetupStep number={4} title="Evaluate in a Server Component">
              <SetupCodeBlock code={server.page} language="tsx" orgId={orgId} />
            </SetupStep>
            <SetupStep number={5} title="Pass results to client components">
              <p className="mb-3 text-sm text-muted-foreground">
                Evaluate on the server, pass the boolean as a prop. No API key in the browser.
              </p>
              <div className="space-y-3">
                <SetupCodeBlock code={server.passToClient} language="tsx" orgId={orgId} />
                <SetupCodeBlock code={server.passToClientChild} language="tsx" orgId={orgId} />
              </div>
            </SetupStep>
            <SetupStep number={6} title="Use in route handlers">
              <SetupCodeBlock code={server.routeHandler} language="typescript" orgId={orgId} />
            </SetupStep>
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="client-panel" aria-labelledby="client-tab" className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Client-side keys are visible in your JavaScript bundle. Treat them as read-only eval
              keys, not secrets. Prefer server setup when you can.
            </p>
          </div>
          <PathIntro
            icon={MonitorSmartphone}
            tone="muted"
            text={
              <>
                Import from <code className="font-mono text-xs text-foreground">togglebit</code> in
                client components only.
              </>
            }
          />
          <div className="space-y-8">
            <SetupStep number={1} title="Install the package">
              <SetupCodeBlock code={client.install} language="bash" orgId={orgId} />
            </SetupStep>
            <SetupStep number={2} title="Add TogglebitProvider">
              <SetupCodeBlock code={client.provider} language="tsx" orgId={orgId} />
            </SetupStep>
            <SetupStep number={3} title="Wrap your root layout">
              <SetupCodeBlock code={client.layout} language="tsx" orgId={orgId} />
            </SetupStep>
            <SetupStep number={4} title="Set a public API key">
              <SetupCodeBlock code={client.env} language="bash" orgId={orgId} />
            </SetupStep>
            <SetupStep number={5} title="Use the useFlag hook">
              <SetupCodeBlock code={client.hook} language="tsx" orgId={orgId} />
              <p className="mt-2 text-xs text-muted-foreground">
                Returns a boolean. Starts at your default (off), then updates once evaluation
                completes.
              </p>
            </SetupStep>
          </div>
        </div>
      )}

      <ComparisonTable />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
}) {
  const tabId = label === 'Server setup' ? 'server-tab' : 'client-tab'

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={active}
      aria-controls={label === 'Server setup' ? 'server-panel' : 'client-panel'}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors sm:flex-row sm:items-center sm:gap-2',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </span>
      {hint && (
        <span className="text-[11px] font-medium text-primary sm:ml-auto">{hint}</span>
      )}
    </button>
  )
}

function PathIntro({
  icon: Icon,
  tone,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: 'primary' | 'muted'
  text: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        tone === 'primary' ? 'bg-primary/8' : 'bg-muted',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4', tone === 'primary' && 'text-primary')} />
      <span>{text}</span>
    </div>
  )
}

function ComparisonTable() {
  return (
    <div className="space-y-3 border-t border-border pt-6">
      <h3 className="text-base font-medium">Server vs client at a glance</h3>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-2.5 font-medium" />
              <th className="px-4 py-2.5 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Server
                </span>
              </th>
              <th className="px-4 py-2.5 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  Client
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {SERVER_VS_CLIENT.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{row.label}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.server}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.client}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
