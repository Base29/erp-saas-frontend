import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchFiscalPeriods, createFiscalPeriod, closeFiscalPeriod, type FiscalPeriod } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
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
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['fiscal-periods', page],
    queryFn: () => fetchFiscalPeriods({ page }).then((r) => r.data),
  })

  const periods = data?.data ?? []

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

  const columns: ColumnDef<FiscalPeriod>[] = [
    { accessorKey: 'name', header: 'Name', enableSorting: true },
    { accessorKey: 'start_date', header: 'Start', enableSorting: true },
    { accessorKey: 'end_date', header: 'End', enableSorting: true },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'open' ? 'success' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.status === 'open' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => close.mutate(row.original.id)}
              disabled={close.isPending}
            >
              Close
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage accounting periods</p>
        <Button size="sm" onClick={() => { reset(); setOpen(true) }}>Add Period</Button>
      </div>

      <DataTable
        columns={columns}
        data={periods}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="name"
        filterPlaceholder="Search by name…"
      />

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
