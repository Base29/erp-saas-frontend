import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchTaxSettings, upsertTaxSetting } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect } from 'react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  rate_percentage: z.coerce.number().min(0).max(100),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function TaxSettingsTab() {
  const queryClient = useQueryClient()

  const { data: settings = [] } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => fetchTaxSettings().then((r) => r.data.data),
  })

  const active = settings.find((s) => s.is_active) ?? settings[0]

  const save = useMutation({
    mutationFn: (v: FormValues) => upsertTaxSetting(v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-settings'] }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', rate_percentage: 0, is_active: true },
  })

  useEffect(() => {
    if (active) reset({ name: active.name, rate_percentage: active.rate_percentage, is_active: active.is_active })
  }, [active, reset])

  return (
    <div className="max-w-sm space-y-4">
      <p className="text-sm text-muted-foreground">Configure the active tax rate for this tenant.</p>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="tax-name">Tax Name</Label>
          <Input id="tax-name" {...register('name')} placeholder="e.g. GST" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="tax-rate">Rate (%)</Label>
          <Input id="tax-rate" type="number" step="0.01" min="0" max="100" {...register('rate_percentage')} />
          {errors.rate_percentage && <p className="text-xs text-destructive">{errors.rate_percentage.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input id="tax-active" type="checkbox" {...register('is_active')} className="h-4 w-4" />
          <Label htmlFor="tax-active">Active</Label>
        </div>
        {save.isError && <p className="text-xs text-destructive">Failed to save</p>}
        {save.isSuccess && <p className="text-xs text-green-600">Saved</p>}
        <Button type="submit" disabled={isSubmitting || !isDirty}>Save</Button>
      </form>
    </div>
  )
}
