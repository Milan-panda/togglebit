'use client'

import { useState } from 'react'
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
}

export function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  function addRule() {
    onChange([...rules, { attribute: '', operator: 'eq', value: '' }])
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index))
  }

  function updateRule(index: number, field: keyof Rule, value: string) {
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
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="attribute (e.g. plan)"
            value={rule.attribute}
            onChange={(e) => updateRule(index, 'attribute', e.target.value)}
            className="w-36"
          />
          <Select
            value={rule.operator}
            onValueChange={(v) => v && updateRule(index, 'operator', v)}
          >
            <SelectTrigger className="w-32">
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
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeRule(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRule}>
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
