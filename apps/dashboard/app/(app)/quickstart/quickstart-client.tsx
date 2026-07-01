'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  KeyRound,
  Flag,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SetupCodeBlock } from '@/components/setup/setup-code-block'
import { SetupToc, SetupSection } from '@/components/setup/setup-section'
import { SetupPathTabs } from '@/components/setup/setup-path-tabs'
import {
  CONTEXT_FIELDS,
  FLAG_TYPES,
  SETUP_SECTIONS,
} from '@/components/setup/setup-content'
import {
  EvalFlowDiagram,
  FlagTypeDiagram,
} from '@/components/setup/setup-flag-diagrams'
import { cn } from '@/lib/utils'

interface Props {
  keyPrefix?: string
  hasKeys: boolean
  orgId?: string
}

export function QuickstartClient({ keyPrefix, hasKeys, orgId }: Props) {
  const apiKeyPlaceholder = keyPrefix
    ? `${keyPrefix}...your_full_key_here`
    : 'tb_dev_your_api_key_here'
  const keysHref = orgId ? `/keys?org=${encodeURIComponent(orgId)}` : '/keys'
  const flagsHref = orgId ? `/dashboard?org=${encodeURIComponent(orgId)}` : '/dashboard'

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-48 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.55_0.16_292/0.08),transparent)]"
      />

      <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1fr)_200px] xl:items-start xl:gap-14">
        <div className="min-w-0 space-y-14">
          <header className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Getting started</span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Setup guide</h1>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground">
                Everything you need to evaluate flags in a Next.js app: install the SDK,
                wire up server or client evaluation, and understand how each flag type behaves.
              </p>
            </div>
          </header>

          <nav
            aria-label="Page sections"
            className="flex gap-2 overflow-x-auto pb-1 xl:hidden"
          >
            {SETUP_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <SetupSection
            id="overview"
            title="How evaluation works"
            description="Your app asks Togglebit whether a flag is on for a given user. The SDK handles caching, auth, and fail-safe defaults so your code stays simple."
          >
            <EvalFlowDiagram />
            <p className="text-sm text-muted-foreground">
              Create flags and API keys in this dashboard first, then call{' '}
              <code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-xs">getFlag</code>{' '}
              on the server or{' '}
              <code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-xs">useFlag</code>{' '}
              on the client. Togglebit returns a boolean; you branch your UI or logic accordingly.
            </p>
          </SetupSection>

          <SetupSection
            id="prerequisites"
            title="Before you write code"
            description="Two things from this dashboard are required before the SDK can return meaningful results."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <PrereqCard
                icon={Flag}
                title="Create a flag"
                body="Pick a type, configure rollout or rules per environment, and turn it on when ready."
                href={flagsHref}
                cta="Go to Flags"
              />
              <PrereqCard
                icon={KeyRound}
                title="Generate an API key"
                body="Scoped to dev, staging, or prod. Copy it immediately; it is only shown once."
                href={keysHref}
                cta="Go to API Keys"
                highlight={!hasKeys}
              />
            </div>
            {!hasKeys && (
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-sm text-muted-foreground">
                  You have not generated an API key yet. Snippets below use placeholders until you
                  create one for your environment.
                </p>
              </div>
            )}
          </SetupSection>

          <SetupSection
            id="sdk-setup"
            title="SDK setup"
            description="Pick how you evaluate flags. Server-side is the recommended default; client-side works for interactive UI that reacts after mount."
          >
            <SetupPathTabs apiKeyPlaceholder={apiKeyPlaceholder} />
          </SetupSection>

          <SetupSection
            id="flag-types"
            title="Flag types"
            description="Togglebit supports four flag types. Each controls who sees a feature and how rollout behaves. Pick the type when you create a flag."
          >
            <div className="space-y-14">
              {FLAG_TYPES.map((flagType, index) => (
                <article key={flagType.id} className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {flagType.id}
                    </Badge>
                    {index === 0 && (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        Simplest
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{flagType.name}</h3>
                    <p className="mt-1 text-sm font-medium text-primary">{flagType.tagline}</p>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                      {flagType.description}
                    </p>
                  </div>
                  <FlagTypeDiagram type={flagType.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Good for
                      </p>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {flagType.useCases.map((useCase) => (
                          <li key={useCase} className="flex gap-2">
                            <span className="text-primary">·</span>
                            {useCase}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        SDK context
                      </p>
                      <p className="text-sm text-muted-foreground">{flagType.contextNote}</p>
                      <SetupCodeBlock
                        code={flagType.sdkExample}
                        language="typescript"
                        className="mt-3"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SetupSection>

          <SetupSection
            id="context"
            title="Flag context"
            description="Pass attributes that describe the current user or request. Togglebit uses them for segment rules and percentage bucketing."
          >
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Required</th>
                    <th className="px-4 py-2.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTEXT_FIELDS.map((row) => (
                    <tr key={row.field} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs">{row.field}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.required}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              For percentage and combined flags, omitting userId returns the flag as off. Keep
              userId stable across page loads so users do not flip in and out of a rollout.
            </p>
          </SetupSection>

          <SetupSection
            id="environments"
            title="Environments"
            description="Flags are configured independently per environment. Match the environment in your SDK config to where your app runs."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { env: 'dev', use: 'Local development' },
                  { env: 'staging', use: 'Preview and QA deploys' },
                  { env: 'prod', use: 'Production traffic' },
                ] as const
              ).map((item) => (
                <div
                  key={item.env}
                  className="rounded-xl border border-border bg-muted/20 px-4 py-4"
                >
                  <code className="font-mono text-sm font-medium">{item.env}</code>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.use}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              A flag can be at 100% in dev and 0% in prod until you are ready to roll out. Each
              environment has its own API keys.
            </p>
          </SetupSection>

          <SetupSection
            id="failsafe"
            title="Fail-safe behavior"
            description="A flag system should never take your app down."
          >
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              If Togglebit is unreachable, your API key is invalid, or a flag does not exist, the
              SDK returns <code className="rounded bg-code-bg px-1 py-0.5 font-mono text-xs">defaultValue</code>{' '}
              (off by default). Your app keeps running; the new feature stays hidden until the next
              successful evaluation.
            </p>
            <SetupCodeBlock
              language="typescript"
              code={`createTogglebit({
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: 'prod',
  defaultValue: false, // change only if off-by-default is wrong for your use case
})`}
            />
          </SetupSection>
        </div>

        <aside className="hidden xl:sticky xl:top-6 xl:block xl:w-[200px] xl:shrink-0">
          <SetupToc />
        </aside>
      </div>
    </div>
  )
}

function PrereqCard({
  icon: Icon,
  title,
  body,
  href,
  cta,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  href: string
  cta: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border px-4 py-4',
        highlight ? 'border-warning/40 bg-warning/5' : 'border-border bg-muted/20',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link href={href} className="mt-4">
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          {cta}
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  )
}
