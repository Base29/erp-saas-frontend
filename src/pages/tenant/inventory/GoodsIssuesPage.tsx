import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Eye } from 'lucide-react'
import {
  fetchGoodsIssues, fetchGoodsIssue, createGoodsIssue,
  submitGoodsIssueForApproval, approveGoodsIssue, rejectGoodsIssue, postGoodsIssue,
  fetchWarehouses, fetchItems,
  type GoodsIssue, type Warehouse, type Item,
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
  warehouse_id: z.string().min(1, 'Required'),
  issue_date: z.string().min(1, 'Required'),
  purpose: z.string().nullable().default(null),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
})

type FormValues = z.infer<typeof schema>

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
    draft: 'secondary', pending_approval: 'outline', approved: 'success', rejected: 'destructive',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace('_', ' ')}</Badge>
}

export default function GoodsIssuesPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'inventory')

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['goods-issues', page],
    queryFn: () => fetchGoodsIssues({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['goods-issue', detailId],
    queryFn: () => fetchGoodsIssue(detailId!).then((r) => r.data.data),
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
    mutationFn: (v: FormValues) => createGoodsIssue({
      warehouse_id: v.warehouse_id,
      issue_date: v.issue_date,
      purpose: v.purpose ?? undefined,
      lines: v.lines.map((l) => ({
        item_id: l.item_id,
        quantity: l.quantity,
        batch_id: l.batch_id,
        serial_number_id: l.serial_number_id,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goods-issues'] }); setCreateOpen(false) },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { lines: [{ item_id: '', quantity: 1, batch_id: null, serial_number_id: null }] } })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const openCreate = () => {
    reset({ warehouse_id: '', issue_date: new Date().toISOString().slice(0, 10), purpose: null, lines: [{ item_id: '', quantity: 1, batch_id: null, serial_number_id: null }] })
    setCreateOpen(true)
  }

  const columns: ColumnDef<GoodsIssue>[] = [
    { accessorKey: 'issue_number', header: 'Issue #', enableSorting: true },
    { id: 'warehouse', header: 'Warehouse', cell: ({ row }) => row.original.warehouse?.warehouse_name ?? '—' },
    { accessorKey: 'issue_date', header: 'Date', cell: ({ row }) => formatDate(row.original.issue_date) },
    { accessorKey: 'purpose', header: 'Purpose', cell: ({ row }) => row.original.purpose ?? '—' },
    { id: 'approval', header: 'Approval', cell: ({ row }) => statusBadge(row.original.approval_status) },
    { id: 'posting', header: 'Posting', cell: ({ row }) => <Badge variant={row.original.posting_status === 'posted' ? 'success' : 'secondary'}>{row.original.posting_status}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Goods Issues</h1>
          <p className="text-sm text-muted-foreground">Record outgoing stock</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Issue</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Goods Issue</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Warehouse</Label>
                <Select value={watch('warehouse_id')} onValueChange={(v) => setValue('warehouse_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse…" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses as Warehouse[]).map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.warehouse_id && <p className="text-xs text-destructive">{errors.warehouse_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" {...register('issue_date')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Purpose</Label>
              <Input {...register('purpose')} placeholder="e.g. Production, Internal use" />
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

            {create.isError && <p className="text-xs text-destructive">Failed to create goods issue</p>}
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
          <DialogHeader><DialogTitle>Issue Detail — {detail?.issue_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Warehouse:</span> {detail.warehouse?.warehouse_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detail.issue_date)}</div>
                <div><span className="text-muted-foreground">Purpose:</span> {detail.purpose ?? '—'}</div>
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
                onSubmit={(c) => submitGoodsIssueForApproval(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['goods-issue', detail.id] }))}
                onApprove={(c) => approveGoodsIssue(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['goods-issue', detail.id] }))}
                onReject={(c) => rejectGoodsIssue(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['goods-issue', detail.id] }))}
                onPost={() => postGoodsIssue(detail.id).then(() => { qc.invalidateQueries({ queryKey: ['goods-issue', detail.id] }); qc.invalidateQueries({ queryKey: ['goods-issues'] }) })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
