import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCostCenter,
  updateCostCenter,
  type CostCenter,
} from '@/api/tenant'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface CostCenterModalProps {
  costCenter?: CostCenter | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CostCenterModal({ costCenter, open, onOpenChange }: CostCenterModalProps) {
  const qc = useQueryClient()
  const isEdit = !!costCenter

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_active: true,
    },
  })

  useEffect(() => {
    if (costCenter) {
      reset({
        code: costCenter.code,
        name: costCenter.name,
        is_active: costCenter.is_active,
      })
    } else {
      reset({
        code: '',
        name: '',
        is_active: true,
      })
    }
  }, [costCenter, reset, open])

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      return isEdit ? updateCostCenter(costCenter!.id, v) : createCostCenter(v)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-centers'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Cost Center' : 'Add Cost Center'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register('code')} placeholder="e.g. HR, SALES, PROJECT-A" />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Human Resources" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex items-center gap-2">
             <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-gray-300" />
             <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
