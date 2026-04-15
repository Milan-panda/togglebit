'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

export function CreateFlagDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [type, setType] = useState('boolean')
  const router = useRouter()
  const { getToken } = useAuth()

  function handleNameChange(value: string) {
    setName(value)
    setKey(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key || !name) return

    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.flags.create(token, { key, name, type })
      toast.success(`Flag "${name}" created`)
      setOpen(false)
      setName('')
      setKey('')
      setType('boolean')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create flag')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Create Flag
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new flag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Dark mode"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              placeholder="dark-mode"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              pattern="^[a-z0-9][a-z0-9\-]*[a-z0-9]$"
            />
            <p className="text-xs text-muted-foreground">
              URL-safe slug used in your code
            </p>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="segment">Segment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Flag'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
