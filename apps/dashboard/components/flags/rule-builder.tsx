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
      <p className="text-sm font-medium">
        Enable for users where...
      </p>
      {rules.map((rule, index) => (
        <div
          key={index}
          className="group/rule relative rounded-xl border border-border bg-background/30 p-2.5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)] md:items-center md:gap-2"
        >
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => removeRule(index)}
            className="absolute -right-2 -top-2 z-10 rounded-full border border-border bg-card opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover/rule:opacity-100 focus-visible:opacity-100"
            disabled={disabled}
            title="Remove condition"
          >
            <X className="h-3.5 w-3.5" />
          </Button>

        {/* Mobile layout */}
        <div className="flex flex-col gap-2 md:hidden">
          
          {/* Attribute full width */}
          <Input
            placeholder="attribute (e.g. plan)"
            value={rule.attribute}
            onChange={(e) => updateRule(index, 'attribute', e.target.value)}
            className="h-9 w-full rounded-lg bg-background"
            disabled={disabled}
          />
      
          {/* Operator + Value + Delete */}
          <div className="flex items-center gap-2">
            <Select
              value={rule.operator}
              onValueChange={(v) => v && updateRule(index, 'operator', v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-[118px] shrink-0 rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              className="h-9 min-w-0 flex-1 rounded-lg bg-background"
              disabled={disabled}
            />
          </div>
        </div>
      
        {/* Desktop layout */}
        <div className="hidden md:contents">
          <div className="min-w-0">
            <Input
              placeholder="attribute (e.g. plan)"
              value={rule.attribute}
              onChange={(e) => updateRule(index, 'attribute', e.target.value)}
              className="h-9 w-full rounded-lg bg-background"
              disabled={disabled}
            />
          </div>
      
          <div className="min-w-0">
            <Select
              value={rule.operator}
              onValueChange={(v) => v && updateRule(index, 'operator', v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      
          <div className="min-w-0">
            <Input
              placeholder="value"
              value={rule.value as string}
              onChange={(e) => updateRule(index, 'value', e.target.value)}
              className="h-9 w-full rounded-lg bg-background"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      ))}
      <Button variant="outline" size="sm" className="rounded-lg border-dashed" onClick={addRule} disabled={disabled}>
        <Plus className="mr-2 h-3 w-3" />
        Add condition
      </Button>
      {rules.length > 0 && (
        <p className="text-xs text-muted-foreground">
          All conditions must match (AND)
        </p>
      )}
    </div>
  )
}
