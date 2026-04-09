import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchFiscalPeriods, createFiscalPeriod, closeFiscalPeriod } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
})

type FormValues = z.infer<typeof schema>

export default function FiscalPeriodsTab() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data),
  })

  const create = useMutation({
    mutationFn: (v: FormValues) => createFiscalPeriod(v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] }); setOpen(false) },
  })

  const close = useMutation({
    mutationFn: (id: number) => closeFiscalPeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (v: FormValues) => create.mutate(v)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage accounting periods</p>
        <Button size="sm" onClick={() => { reset(); setOpen(true) }}>Add Period</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">End</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{p.start_date}</td>
                  <td className="px-4 py-3">{p.end_date}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'open' ? 'success' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => close.mutate(p.id)}
                        disabled={close.isPending}
                      >
                        Close
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No fiscal periods</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Fiscal Period</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="fp-name">Name</Label>
              <Input id="fp-name" {...register('name')} placeholder="e.g. FY 2025-26" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="fp-start">Start Date</Label>
              <Input id="fp-start" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="fp-end">End Date</Label>
              <Input id="fp-end" type="date" {...register('end_date')} />
              {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
            </div>
            {create.isError && <p className="text-xs text-destructive">Failed to create period</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
