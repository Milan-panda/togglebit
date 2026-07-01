'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface RuleBuilderProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
  disabled?: boolean
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

  function updateRule(index: number, field: keyof Rule, value: string) {
    if (disabled) return
    const updated = rules.map((rule, i) =>
      i === index ? { ...rule, [field]: value } : rule,
    )
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

      {rules.map((rule, index) => (
        <div
          key={index}
          className="grid items-center gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_auto_1fr_auto]"
        >
          <Input
            placeholder="attribute"
            value={rule.attribute}
            onChange={(e) => updateRule(index, 'attribute', e.target.value)}
            disabled={disabled}
          />

          <Select
            value={rule.operator}
            onValueChange={(v) => v && updateRule(index, 'operator', v)}
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

          <Input
            placeholder="value"
            value={rule.value as string}
            onChange={(e) => updateRule(index, 'value', e.target.value)}
            disabled={disabled}
          />

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
      ))}

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
