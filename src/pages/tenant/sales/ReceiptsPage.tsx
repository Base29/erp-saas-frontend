import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Eye } from 'lucide-react'
import {
  fetchSaleReceipts, fetchSaleReceipt, createSaleReceipt, postSaleReceipt,
  fetchCustomersFull, fetchOutstandingInvoices,
  type SaleReceipt, type CustomerFull, type SaleInvoice,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
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

const allocationSchema = z.object({
  invoice_id: z.string().min(1, 'Required'),
  allocated_amount: z.coerce.number().positive('Must be > 0'),
})

const schema = z.object({
  customer_id: z.string().min(1, 'Required'),
  receipt_date: z.string().min(1, 'Required'),
  amount_received: z.coerce.number().positive('Must be > 0'),
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque']),
  reference: z.string().nullable().default(null),
  allocations: z.array(allocationSchema).default([]),
})

type FormValues = z.infer<typeof schema>

export default function ReceiptsPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', page],
    queryFn: () => fetchSaleReceipts({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['receipt', detailId],
    queryFn: () => fetchSaleReceipt(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: customersData } = useQuery({ queryKey: ['customers-all'], queryFn: () => fetchCustomersFull({ per_page: 500 }).then((r) => r.data.data) })
  const customers: CustomerFull[] = customersData ?? []

  const { data: outstandingData } = useQuery({
    queryKey: ['outstanding-invoices', selectedCustomerId],
    queryFn: () => fetchOutstandingInvoices(selectedCustomerId!).then((r) => r.data.data),
    enabled: !!selectedCustomerId,
  })
  const outstandingInvoices: SaleInvoice[] = outstandingData ?? []

  const create = useMutation({
    mutationFn: (v: FormValues) => createSaleReceipt({
      customer_id: Number(v.customer_id),
      receipt_date: v.receipt_date,
      amount_received: v.amount_received,
      payment_method: v.payment_method,
      reference: v.reference,
      allocations: v.allocations.map((a) => ({ invoice_id: Number(a.invoice_id), allocated_amount: a.allocated_amount })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); setCreateOpen(false) },
  })

  const post = useMutation({
    mutationFn: (id: number) => postSaleReceipt(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipt', detailId] }); qc.invalidateQueries({ queryKey: ['receipts'] }) },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { allocations: [] } })

  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' })

  const openCreate = () => {
    setSelectedCustomerId(null)
    reset({ customer_id: '', receipt_date: new Date().toISOString().slice(0, 10), amount_received: 0, payment_method: 'cash', reference: null, allocations: [] })
    setCreateOpen(true)
  }

  const columns: ColumnDef<SaleReceipt>[] = [
    { accessorKey: 'receipt_number', header: 'Receipt #', enableSorting: true },
    { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name ?? '—' },
    { accessorKey: 'receipt_date', header: 'Date', cell: ({ row }) => formatDate(row.original.receipt_date) },
    { accessorKey: 'amount_received', header: 'Amount', cell: ({ row }) => `PKR ${Number(row.original.amount_received).toLocaleString()}` },
    { accessorKey: 'payment_method', header: 'Method' },
    { id: 'posting', header: 'Posting', cell: ({ row }) => <Badge variant={row.original.posting_status === 'posted' ? 'success' : 'secondary'}>{row.original.posting_status}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Receipts</h1>
          <p className="text-sm text-muted-foreground">Record customer payments</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Receipt</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Receipt</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Customer</Label>
                <Select value={watch('customer_id')} onValueChange={(v) => { setValue('customer_id', v, { shouldValidate: true }); setSelectedCustomerId(Number(v)) }}>
                  <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" {...register('receipt_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Amount Received</Label>
                <Input type="number" step="0.01" {...register('amount_received')} />
                {errors.amount_received && <p className="text-xs text-destructive">{errors.amount_received.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={watch('payment_method')} onValueChange={(v) => setValue('payment_method', v as 'cash' | 'bank_transfer' | 'cheque')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reference</Label>
              <Input {...register('reference')} placeholder="Cheque no. / transaction ref" />
            </div>

            {/* Allocations */}
            {selectedCustomerId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Allocate to Invoices</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ invoice_id: '', allocated_amount: 0 })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-[1fr_120px_32px] gap-2 items-start">
                    <Select value={watch(`allocations.${i}.invoice_id`)} onValueChange={(v) => setValue(`allocations.${i}.invoice_id`, v, { shouldValidate: true })}>
                      <SelectTrigger><SelectValue placeholder="Invoice…" /></SelectTrigger>
                      <SelectContent>
                        {outstandingInvoices.map((inv) => <SelectItem key={inv.id} value={String(inv.id)}>{inv.invoice_number} — PKR {Number(inv.total_amount).toLocaleString()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="Amount" {...register(`allocations.${i}.allocated_amount`)} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}

            {create.isError && <p className="text-xs text-destructive">Failed to create receipt</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || create.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receipt — {detail?.receipt_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {detail.customer?.name}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detail.receipt_date)}</div>
                <div><span className="text-muted-foreground">Amount:</span> PKR {Number(detail.amount_received).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Method:</span> {detail.payment_method}</div>
                <div><span className="text-muted-foreground">Reference:</span> {detail.reference ?? '—'}</div>
                <div><span className="text-muted-foreground">Posting:</span> <Badge variant={detail.posting_status === 'posted' ? 'success' : 'secondary'}>{detail.posting_status}</Badge></div>
              </div>

              {detail.allocations && detail.allocations.length > 0 && (
                <table className="w-full text-sm border rounded-md overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Invoice</th>
                      <th className="px-3 py-2 text-right">Allocated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.allocations.map((a, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{a.invoice?.invoice_number ?? `Invoice #${a.invoice_id}`}</td>
                        <td className="px-3 py-2 text-right">PKR {Number(a.allocated_amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {detail.posting_status === 'unposted' && canEdit && (
                <Button size="sm" disabled={post.isPending} onClick={() => post.mutate(detail.id)}>
                  Post
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
