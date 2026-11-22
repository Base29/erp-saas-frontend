import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createItemType, type ItemType } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().max(50).optional().default(''),
  nature: z.enum(['stock', 'service', 'bundle']),
  description: z.string().nullable().default(''),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (type: ItemType) => void
}

export default function QuickAddTypeModal({ open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', nature: 'stock', description: '', is_active: true },
  })

  const nature = watch('nature')

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      createItemType({
        name: values.name,
        code: values.code?.trim() || undefined,
        nature: values.nature,
        description: values.description || null,
        is_active: values.is_active,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['item-types'] })
      reset()
      setErrorMsg(null)
      onOpenChange(false)
      if (res.data?.data) {
        onSuccess?.(res.data.data)
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create item type.')
    },
  })

  const handleClose = () => {
    reset()
    setErrorMsg(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Inventory Item Type</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg text-xs bg-destructive/10 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="type-name">Type Name</Label>
            <Input
              id="type-name"
              placeholder="e.g. Raw Material, Finished Goods, Consumable"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="type-code">Code / Identifier</Label>
              <span className="text-[11px] text-muted-foreground">Auto-generated if left blank</span>
            </div>
            <Input
              id="type-code"
              placeholder="e.g. raw_material (letters, numbers, underscores)"
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Inventory Behavior (Nature)</Label>
            <Select
              value={nature}
              onValueChange={(val: 'stock' | 'service' | 'bundle') => setValue('nature', val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">
                  Stock Item — Physical inventory with stock tracking & movements
                </SelectItem>
                <SelectItem value="service">
                  Service — Labor or non-physical items without inventory tracking
                </SelectItem>
                <SelectItem value="bundle">
                  Bundle / Kit — Composite item composed of multiple components
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Determines whether items of this type maintain warehouse balances, goods receipts, and issues.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type-desc">Description (Optional)</Label>
            <Textarea
              id="type-desc"
              rows={2}
              placeholder="Usage guidelines or classification notes…"
              {...register('description')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
