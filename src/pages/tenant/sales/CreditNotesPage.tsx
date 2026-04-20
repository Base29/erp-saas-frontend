import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Eye } from 'lucide-react'
import {
  fetchCreditNotes, fetchCreditNote, createCreditNote,
  submitCreditNoteForApproval, approveCreditNote, rejectCreditNote, postCreditNote,
  fetchCustomersFull, fetchSaleInvoices,
  type CreditNote, type CustomerFull, type SaleInvoice,
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

const schema = z.object({
  source_invoice_id: z.string().min(1, 'Required'),
  customer_id: z.string().min(1, 'Required'),
  credit_date: z.string().min(1, 'Required'),
  reason: z.string().nullable().default(null),
  total_amount: z.coerce.number().positive('Must be > 0'),
})

type FormValues = z.infer<typeof schema>

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
    draft: 'secondary', pending_approval: 'outline', approved: 'success', rejected: 'destructive',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>
}

export default function CreditNotesPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['credit-notes', page],
    queryFn: () => fetchCreditNotes({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['credit-note', detailId],
    queryFn: () => fetchCreditNote(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: customersData } = useQuery({ queryKey: ['customers-all'], queryFn: () => fetchCustomersFull({ per_page: 500 }).then((r) => r.data.data) })
  const customers: CustomerFull[] = customersData ?? []

  const { data: invoicesData } = useQuery({ queryKey: ['sale-invoices-all'], queryFn: () => fetchSaleInvoices({ per_page: 500, posting_status: 'posted' }).then((r) => r.data.data) })
  const invoices: SaleInvoice[] = invoicesData ?? []

  const create = useMutation({
    mutationFn: (v: FormValues) => createCreditNote({
      source_invoice_id: Number(v.source_invoice_id),
      customer_id: Number(v.customer_id),
      credit_date: v.credit_date,
      reason: v.reason,
      total_amount: v.total_amount,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-notes'] }); setCreateOpen(false) },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    reset({ source_invoice_id: '', customer_id: '', credit_date: new Date().toISOString().slice(0, 10), reason: null, total_amount: 0 })
    setCreateOpen(true)
  }

  const columns: ColumnDef<CreditNote>[] = [
    { accessorKey: 'credit_note_number', header: 'Credit Note #', enableSorting: true },
    { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name ?? '—' },
    { accessorKey: 'credit_date', header: 'Date', cell: ({ row }) => formatDate(row.original.credit_date) },
    { accessorKey: 'total_amount', header: 'Amount', cell: ({ row }) => `PKR ${Number(row.original.total_amount).toLocaleString()}` },
    { id: 'approval', header: 'Approval', cell: ({ row }) => statusBadge(row.original.approval_status) },
    { id: 'posting', header: 'Posting', cell: ({ row }) => <Badge variant={row.original.posting_status === 'posted' ? 'success' : 'secondary'}>{row.original.posting_status}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Credit Notes</h1>
          <p className="text-sm text-muted-foreground">Manage customer credit notes</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Credit Note</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Credit Note</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Source Invoice</Label>
              <Select value={watch('source_invoice_id')} onValueChange={(v) => {
                setValue('source_invoice_id', v, { shouldValidate: true })
                const inv = invoices.find((i) => String(i.id) === v)
                if (inv) setValue('customer_id', String(inv.customer_id), { shouldValidate: true })
              }}>
                <SelectTrigger><SelectValue placeholder="Select invoice…" /></SelectTrigger>
                <SelectContent>{invoices.map((inv) => <SelectItem key={inv.id} value={String(inv.id)}>{inv.invoice_number} — {inv.customer?.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.source_invoice_id && <p className="text-xs text-destructive">{errors.source_invoice_id.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={watch('customer_id')} onValueChange={(v) => setValue('customer_id', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Credit Date</Label>
                <Input type="date" {...register('credit_date')} />
              </div>
              <div className="space-y-1">
                <Label>Total Amount</Label>
                <Input type="number" step="0.01" {...register('total_amount')} />
                {errors.total_amount && <p className="text-xs text-destructive">{errors.total_amount.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input {...register('reason')} placeholder="Reason for credit note" />
            </div>

            {create.isError && <p className="text-xs text-destructive">Failed to create credit note</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || create.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Credit Note — {detail?.credit_note_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {detail.customer?.name}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detail.credit_date)}</div>
                <div><span className="text-muted-foreground">Source Invoice:</span> {detail.source_invoice?.invoice_number ?? `#${detail.source_invoice_id}`}</div>
                <div><span className="text-muted-foreground">Amount:</span> PKR {Number(detail.total_amount).toLocaleString()}</div>
                {detail.reason && <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {detail.reason}</div>}
                <div><span className="text-muted-foreground">Posting:</span> <Badge variant={detail.posting_status === 'posted' ? 'success' : 'secondary'}>{detail.posting_status}</Badge></div>
              </div>

              <ApprovalActions
                approvalStatus={detail.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
                postingStatus={detail.posting_status}
                onSubmit={(c) => submitCreditNoteForApproval(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['credit-note', detail.id] }))}
                onApprove={(c) => approveCreditNote(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['credit-note', detail.id] }))}
                onReject={(c) => rejectCreditNote(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['credit-note', detail.id] }))}
                onPost={() => postCreditNote(detail.id).then(() => { qc.invalidateQueries({ queryKey: ['credit-note', detail.id] }); qc.invalidateQueries({ queryKey: ['credit-notes'] }) })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
