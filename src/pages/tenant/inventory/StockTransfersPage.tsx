import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Eye } from 'lucide-react'
import {
  fetchStockTransfers, fetchStockTransfer, createStockTransfer,
  submitStockTransferForApproval, approveStockTransfer, rejectStockTransfer, postStockTransfer,
  fetchWarehouses, fetchItems,
  type StockTransfer, type Warehouse, type Item,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
import ApprovalActions from '@/components/ApprovalActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import { formatDate } from '@/utils/format'
import type { ColumnDef } from '@tanstack/react-table'

const lineSchema = z.object({
  item_id: z.string().min(1, 'Required'),
  quantity: z.coerce.number().positive('Must be > 0'),
  batch_id: z.string().nullable().default(null),
  serial_number_id: z.string().nullable().default(null),
})

const schema = z.object({
  from_warehouse_id: z.string().min(1, 'Required'),
  to_warehouse_id: z.string().min(1, 'Required'),
  transfer_date: z.string().min(1, 'Required'),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
})

type FormValues = z.infer<typeof schema>

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
    draft: 'secondary', pending_approval: 'outline', approved: 'success', rejected: 'destructive',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace('_', ' ')}</Badge>
}

export default function StockTransfersPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'inventory')

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', page],
    queryFn: () => fetchStockTransfers({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['stock-transfer', detailId],
    queryFn: () => fetchStockTransfer(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchWarehouses().then((r) => r.data.data ?? r.data),
  })

  const { data: itemsData } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data),
  })
  const items: Item[] = itemsData ?? []

  const create = useMutation({
    mutationFn: (v: FormValues) => createStockTransfer({
      from_warehouse_id: v.from_warehouse_id,
      to_warehouse_id: v.to_warehouse_id,
      transfer_date: v.transfer_date,
      lines: v.lines.map((l) => ({
        item_id: l.item_id,
        quantity: l.quantity,
        batch_id: l.batch_id,
        serial_number_id: l.serial_number_id,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); setCreateOpen(false) },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { lines: [{ item_id: '', quantity: 1, batch_id: null, serial_number_id: null }] } })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const openCreate = () => {
    reset({ from_warehouse_id: '', to_warehouse_id: '', transfer_date: new Date().toISOString().slice(0, 10), lines: [{ item_id: '', quantity: 1, batch_id: null, serial_number_id: null }] })
    setCreateOpen(true)
  }

  const columns: ColumnDef<StockTransfer>[] = [
    { accessorKey: 'transfer_number', header: 'Transfer #', enableSorting: true },
    { id: 'from', header: 'From', cell: ({ row }) => row.original.from_warehouse?.warehouse_name ?? '—' },
    { id: 'to', header: 'To', cell: ({ row }) => row.original.to_warehouse?.warehouse_name ?? '—' },
    { accessorKey: 'transfer_date', header: 'Date', cell: ({ row }) => formatDate(row.original.transfer_date) },
    { id: 'approval', header: 'Approval', cell: ({ row }) => statusBadge(row.original.approval_status) },
    { id: 'posting', header: 'Posting', cell: ({ row }) => <Badge variant={row.original.posting_status === 'posted' ? 'success' : 'secondary'}>{row.original.posting_status}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground">Move stock between warehouses</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Transfer</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>From Warehouse</Label>
                <Select value={watch('from_warehouse_id')} onValueChange={(v) => setValue('from_warehouse_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="From…" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses as Warehouse[]).map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.from_warehouse_id && <p className="text-xs text-destructive">{errors.from_warehouse_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>To Warehouse</Label>
                <Select value={watch('to_warehouse_id')} onValueChange={(v) => setValue('to_warehouse_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="To…" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses as Warehouse[]).map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.to_warehouse_id && <p className="text-xs text-destructive">{errors.to_warehouse_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" {...register('transfer_date')} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ item_id: '', quantity: 1, batch_id: null, serial_number_id: null })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-start">
                  <Select value={watch(`lines.${i}.item_id`)} onValueChange={(v) => setValue(`lines.${i}.item_id`, v, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="Item…" /></SelectTrigger>
                    <SelectContent>
                      {items.filter((it) => it.item_type !== 'service').map((it) => (
                        <SelectItem key={it.id} value={String(it.id)}>{it.item_code} — {it.item_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.0001" placeholder="Qty" {...register(`lines.${i}.quantity`)} />
                  <Input placeholder="Batch" {...register(`lines.${i}.batch_id`)} />
                  <Input placeholder="Serial" {...register(`lines.${i}.serial_number_id`)} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>

            {create.isError && <p className="text-xs text-destructive">Failed to create transfer</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || create.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transfer Detail — {detail?.transfer_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">From:</span> {detail.from_warehouse?.warehouse_name}</div>
                <div><span className="text-muted-foreground">To:</span> {detail.to_warehouse?.warehouse_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detail.transfer_date)}</div>
                <div><span className="text-muted-foreground">Posting:</span> <Badge variant={detail.posting_status === 'posted' ? 'success' : 'secondary'}>{detail.posting_status}</Badge></div>
              </div>

              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines?.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{l.item?.item_name ?? `Item #${l.item_id}`}</td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ApprovalActions
                approvalStatus={detail.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
                postingStatus={detail.posting_status}
                onSubmit={(c) => submitStockTransferForApproval(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['stock-transfer', detail.id] }))}
                onApprove={(c) => approveStockTransfer(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['stock-transfer', detail.id] }))}
                onReject={(c) => rejectStockTransfer(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['stock-transfer', detail.id] }))}
                onPost={() => postStockTransfer(detail.id).then(() => { qc.invalidateQueries({ queryKey: ['stock-transfer', detail.id] }); qc.invalidateQueries({ queryKey: ['stock-transfers'] }) })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
