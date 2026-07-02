import type { EnvConfig, Rule } from '@/lib/api'

export interface EnvDiffItem {
  field: string
  from: string
  to: string
}

function formatRules(rules: Rule[]): string {
  if (rules.length === 0) return '(none)'
  return rules
    .map((r) => `${r.attribute} ${r.operator} ${JSON.stringify(r.value)}`)
    .join('; ')
}

export function envConfigsEqual(a: EnvConfig | undefined, b: EnvConfig | undefined): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.enabled === b.enabled &&
    a.rollout_pct === b.rollout_pct &&
    JSON.stringify(a.rules) === JSON.stringify(b.rules)
  )
}

export function diffEnvConfigs(
  source: EnvConfig | undefined,
  target: EnvConfig | undefined,
): EnvDiffItem[] {
  const src = source ?? { enabled: false, rollout_pct: 0, rules: [] }
  const tgt = target ?? { enabled: false, rollout_pct: 0, rules: [] }
  const diffs: EnvDiffItem[] = []

  if (src.enabled !== tgt.enabled) {
    diffs.push({
      field: 'Enabled',
      from: String(tgt.enabled),
      to: String(src.enabled),
    })
  }

  if (src.rollout_pct !== tgt.rollout_pct) {
    diffs.push({
      field: 'Rollout %',
      from: `${tgt.rollout_pct}%`,
      to: `${src.rollout_pct}%`,
    })
  }

  const srcRules = formatRules(src.rules)
  const tgtRules = formatRules(tgt.rules)
  if (srcRules !== tgtRules) {
    diffs.push({
      field: 'Rules',
      from: tgtRules,
      to: srcRules,
    })
  }

  return diffs
}
