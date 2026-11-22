import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createInventoryCategory, type ItemCategory } from '@/api/tenant'
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
  parent_category_id: z.string().nullable().default(null),
  description: z.string().nullable().default(''),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories?: ItemCategory[]
  onSuccess?: (category: ItemCategory) => void
}

export default function QuickAddCategoryModal({
  open,
  onOpenChange,
  categories = [],
  onSuccess,
}: Props) {
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
    defaultValues: { name: '', parent_category_id: null, description: '' },
  })

  const parentId = watch('parent_category_id')

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      createInventoryCategory({
        name: values.name,
        parent_category_id: values.parent_category_id === 'none' ? null : values.parent_category_id,
        description: values.description || null,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['item-categories'] })
      qc.invalidateQueries({ queryKey: ['product-categories'] })
      reset()
      setErrorMsg(null)
      onOpenChange(false)
      if (res.data?.data) {
        onSuccess?.(res.data.data)
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create item category.')
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
          <DialogTitle>New Item Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg text-xs bg-destructive/10 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Category Name</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Raw Materials, Electronics, Fasteners"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Parent Category (Optional)</Label>
            <Select
              value={parentId ?? 'none'}
              onValueChange={(val) => setValue('parent_category_id', val === 'none' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description (Optional)</Label>
            <Textarea
              id="cat-desc"
              rows={3}
              placeholder="Optional notes or classification details…"
              {...register('description')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
