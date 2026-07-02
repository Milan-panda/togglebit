'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Rule } from '@/lib/api'

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'in', label: 'in' },
  { value: 'not_in', label: 'not in' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
]

const MULTI_VALUE_OPERATORS = new Set(['in', 'not_in'])

function normalizeRuleValue(rule: Rule): string | string[] {
  if (MULTI_VALUE_OPERATORS.has(rule.operator)) {
    if (Array.isArray(rule.value)) return rule.value
    if (typeof rule.value === 'string' && rule.value.includes(',')) {
      return rule.value.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (typeof rule.value === 'string' && rule.value) return [rule.value]
    return []
  }
  return Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value ?? '')
}

interface RuleBuilderProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
  disabled?: boolean
}

function MultiValueInput({
  values,
  onChange,
  disabled,
}: {
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')

  function addValue(raw: string) {
    const next = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((v) => !values.includes(v))
    if (next.length === 0) return
    onChange([...values, ...next])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            {v}
            {!disabled && (
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <Input
        placeholder="Type value and press Enter"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addValue(draft)
          }
        }}
        onBlur={() => {
          if (draft.trim()) addValue(draft)
        }}
      />
    </div>
  )
}

export function RuleBuilder({ rules, onChange, disabled = false }: RuleBuilderProps) {
  function addRule() {
    if (disabled) return
    onChange([...rules, { attribute: '', operator: 'eq', value: '' }])
  }

  function removeRule(index: number) {
    if (disabled) return
    onChange(rules.filter((_, i) => i !== index))
  }

  function updateRule(index: number, patch: Partial<Rule>) {
    if (disabled) return
    const updated = rules.map((rule, i) => {
      if (i !== index) return rule
      const next = { ...rule, ...patch }
      if (patch.operator && MULTI_VALUE_OPERATORS.has(patch.operator)) {
        next.value = Array.isArray(rule.value) ? rule.value : rule.value ? [String(rule.value)] : []
      } else if (patch.operator && !MULTI_VALUE_OPERATORS.has(patch.operator)) {
        next.value = Array.isArray(rule.value) ? rule.value.join(', ') : rule.value
      }
      return next
    })
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Targeting rules</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          All conditions must match (AND).
        </p>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground">No conditions yet.</p>
      )}

      {rules.map((rule, index) => {
        const isMulti = MULTI_VALUE_OPERATORS.has(rule.operator)
        const multiValues = isMulti
          ? (normalizeRuleValue(rule) as string[])
          : []

        return (
          <div
            key={index}
            className="grid items-start gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_auto_1fr_auto]"
          >
            <Input
              placeholder="attribute"
              value={rule.attribute}
              onChange={(e) => updateRule(index, { attribute: e.target.value })}
              disabled={disabled}
            />

            <Select
              value={rule.operator}
              onValueChange={(v) => v && updateRule(index, { operator: v })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full sm:w-[7.5rem]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-36">
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isMulti ? (
              <MultiValueInput
                values={multiValues}
                onChange={(values) => updateRule(index, { value: values })}
                disabled={disabled}
              />
            ) : (
              <Input
                placeholder="value"
                value={normalizeRuleValue(rule) as string}
                onChange={(e) => updateRule(index, { value: e.target.value })}
                disabled={disabled}
              />
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeRule(index)}
              disabled={disabled}
              title="Remove condition"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRule}
        disabled={disabled}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add condition
      </Button>
    </div>
  )
}
