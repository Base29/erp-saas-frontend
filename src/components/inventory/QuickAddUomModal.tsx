import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUom, type UnitOfMeasure } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(20),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (uom: UnitOfMeasure) => void
}

export default function QuickAddUomModal({ open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', abbreviation: '', is_active: true },
  })

  const create = useMutation({
    mutationFn: (values: FormValues) => createUom(values),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['uoms'] })
      reset()
      setErrorMsg(null)
      onOpenChange(false)
      if (res.data?.data) {
        onSuccess?.(res.data.data)
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create unit of measure.')
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
          <DialogTitle>New Unit Of Measure (UOM)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg text-xs bg-destructive/10 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="uom-name">Name</Label>
            <Input
              id="uom-name"
              placeholder="e.g. Kilogram, Meter, Liter, Box"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uom-abbr">Abbreviation</Label>
            <Input
              id="uom-abbr"
              placeholder="e.g. kg, m, ltr, bx"
              {...register('abbreviation')}
            />
            {errors.abbreviation && (
              <p className="text-xs text-destructive">{errors.abbreviation.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create UOM'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
