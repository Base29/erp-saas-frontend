import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Eye } from 'lucide-react'
import {
  fetchGatePasses, fetchGatePass, createGatePass,
  submitGatePassForApproval, approveGatePass, rejectGatePass, dispatchGatePass,
  fetchSaleInvoices, fetchWarehouses,
  type OutwardGatePass, type SaleInvoice, type Warehouse,
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
import type { ColumnDef } from '@tanstack/react-table'

const lineSchema = z.object({
  invoice_line_id: z.string().min(1, 'Required'),
  item_id: z.string().min(1, 'Required'),
  quantity_dispatched: z.coerce.number().positive('Must be > 0'),
  batch_id: z.string().nullable().default(null),
  serial_number_id: z.string().nullable().default(null),
})

const schema = z.object({
  source_invoice_id: z.string().min(1, 'Required'),
  warehouse_id: z.string().min(1, 'Required'),
  dispatch_date: z.string().min(1, 'Required'),
  vehicle_number: z.string().nullable().default(null),
  driver_name: z.string().nullable().default(null),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
})

type FormValues = z.infer<typeof schema>

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
    draft: 'secondary', pending_approval: 'outline', approved: 'success', rejected: 'destructive',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>
}

export default function GatePassesPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['gate-passes', page],
    queryFn: () => fetchGatePasses({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['gate-pass', detailId],
    queryFn: () => fetchGatePass(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: invoicesData } = useQuery({ queryKey: ['sale-invoices-all'], queryFn: () => fetchSaleInvoices({ per_page: 500, posting_status: 'posted' }).then((r) => r.data.data) })
  const invoices: SaleInvoice[] = invoicesData ?? []

  const { data: warehousesData } = useQuery({ queryKey: ['warehouses'], queryFn: () => fetchWarehouses().then((r) => r.data.data ?? r.data) })
  const warehouses: Warehouse[] = warehousesData ?? []

  const create = useMutation({
    mutationFn: (v: FormValues) => createGatePass({
      source_invoice_id: Number(v.source_invoice_id),
      warehouse_id: Number(v.warehouse_id),
      dispatch_date: v.dispatch_date,
      vehicle_number: v.vehicle_number,
      driver_name: v.driver_name,
      lines: v.lines.map((l) => ({
        invoice_line_id: Number(l.invoice_line_id),
        item_id: Number(l.item_id),
        quantity_dispatched: l.quantity_dispatched,
        batch_id: l.batch_id ? Number(l.batch_id) : null,
        serial_number_id: l.serial_number_id ? Number(l.serial_number_id) : null,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gate-passes'] }); setCreateOpen(false) },
  })

  const dispatch = useMutation({
    mutationFn: (id: number) => dispatchGatePass(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gate-pass', detailId] }); qc.invalidateQueries({ queryKey: ['gate-passes'] }) },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { lines: [] } })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const openCreate = () => {
    setSelectedInvoice(null)
    reset({ source_invoice_id: '', warehouse_id: '', dispatch_date: new Date().toISOString().slice(0, 10), vehicle_number: null, driver_name: null, lines: [] })
    setCreateOpen(true)
  }

  const handleInvoiceSelect = (invoiceId: string) => {
    setValue('source_invoice_id', invoiceId, { shouldValidate: true })
    const inv = invoices.find((i) => String(i.id) === invoiceId) ?? null
    setSelectedInvoice(inv)
    // Pre-populate lines from invoice lines
    if (inv?.lines) {
      const newLines = inv.lines.map((l) => ({
        invoice_line_id: String(l.id ?? ''),
        item_id: String(l.item_id),
        quantity_dispatched: l.quantity,
        batch_id: null,
        serial_number_id: null,
      }))
      setValue('lines', newLines)
    }
  }

  const columns: ColumnDef<OutwardGatePass>[] = [
    { accessorKey: 'gate_pass_number', header: 'Gate Pass #', enableSorting: true },
    { id: 'invoice', header: 'Invoice', cell: ({ row }) => row.original.source_invoice?.invoice_number ?? '—' },
    { id: 'warehouse', header: 'Warehouse', cell: ({ row }) => row.original.warehouse?.warehouse_name ?? '—' },
    { accessorKey: 'dispatch_date', header: 'Dispatch Date' },
    { id: 'approval', header: 'Approval', cell: ({ row }) => statusBadge(row.original.approval_status) },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'dispatched' ? 'success' : 'secondary'}>{row.original.status}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Outward Gate Passes</h1>
          <p className="text-sm text-muted-foreground">Authorize goods dispatch</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Gate Pass</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Gate Pass</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Source Invoice</Label>
                <Select value={watch('source_invoice_id')} onValueChange={handleInvoiceSelect}>
                  <SelectTrigger><SelectValue placeholder="Select invoice…" /></SelectTrigger>
                  <SelectContent>{invoices.map((inv) => <SelectItem key={inv.id} value={String(inv.id)}>{inv.invoice_number} — {inv.customer?.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.source_invoice_id && <p className="text-xs text-destructive">{errors.source_invoice_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Warehouse</Label>
                <Select value={watch('warehouse_id')} onValueChange={(v) => setValue('warehouse_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse…" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.warehouse_id && <p className="text-xs text-destructive">{errors.warehouse_id.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Dispatch Date</Label>
                <Input type="date" {...register('dispatch_date')} />
              </div>
              <div className="space-y-1">
                <Label>Vehicle Number</Label>
                <Input {...register('vehicle_number')} placeholder="e.g. ABC-123" />
              </div>
              <div className="space-y-1">
                <Label>Driver Name</Label>
                <Input {...register('driver_name')} placeholder="Driver name" />
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ invoice_line_id: '', item_id: '', quantity_dispatched: 1, batch_id: null, serial_number_id: null })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-start">
                  <div className="space-y-1">
                    <Input placeholder="Invoice line ID" {...register(`lines.${i}.invoice_line_id`)} />
                    <Input placeholder="Item ID" {...register(`lines.${i}.item_id`)} />
                  </div>
                  <Input type="number" step="0.0001" placeholder="Qty" {...register(`lines.${i}.quantity_dispatched`)} />
                  <Input placeholder="Batch ID" {...register(`lines.${i}.batch_id`)} />
                  <Input placeholder="Serial ID" {...register(`lines.${i}.serial_number_id`)} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
              {selectedInvoice && fields.length === 0 && (
                <p className="text-xs text-muted-foreground">Select an invoice to auto-populate lines, or add manually.</p>
              )}
            </div>

            {create.isError && <p className="text-xs text-destructive">Failed to create gate pass</p>}
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
          <DialogHeader><DialogTitle>Gate Pass — {detail?.gate_pass_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Invoice:</span> {detail.source_invoice?.invoice_number ?? `#${detail.source_invoice_id}`}</div>
                <div><span className="text-muted-foreground">Warehouse:</span> {detail.warehouse?.warehouse_name}</div>
                <div><span className="text-muted-foreground">Dispatch Date:</span> {detail.dispatch_date}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {detail.vehicle_number ?? '—'}</div>
                <div><span className="text-muted-foreground">Driver:</span> {detail.driver_name ?? '—'}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={detail.status === 'dispatched' ? 'success' : 'secondary'}>{detail.status}</Badge></div>
              </div>

              {detail.lines && detail.lines.length > 0 && (
                <table className="w-full text-sm border rounded-md overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty Dispatched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{l.item?.item_name ?? `Item #${l.item_id}`}</td>
                        <td className="px-3 py-2 text-right">{l.quantity_dispatched}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <ApprovalActions
                  approvalStatus={detail.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
                  onSubmit={(c) => submitGatePassForApproval(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['gate-pass', detail.id] }))}
                  onApprove={(c) => approveGatePass(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['gate-pass', detail.id] }))}
                  onReject={(c) => rejectGatePass(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['gate-pass', detail.id] }))}
                />
                {detail.approval_status === 'approved' && detail.status === 'pending' && canEdit && (
                  <Button size="sm" disabled={dispatch.isPending} onClick={() => dispatch.mutate(detail.id)}>
                    Dispatch
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
