import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Eye } from 'lucide-react'
import {
  fetchSaleOrders, fetchSaleOrder, createSaleOrder,
  submitSaleOrderForApproval, approveSaleOrder, rejectSaleOrder,
  fetchCustomersFull, fetchItems, fetchUoms,
  type SaleOrder, type CustomerFull, type Item, type UnitOfMeasure,
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
  item_id: z.string().min(1, 'Required'),
  description: z.string().nullable().default(null),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit_of_measure_id: z.string().min(1, 'Required'),
  unit_price: z.coerce.number().min(0),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  line_total: z.coerce.number().min(0).default(0),
})

const schema = z.object({
  customer_id: z.string().min(1, 'Required'),
  order_date: z.string().min(1, 'Required'),
  delivery_date: z.string().nullable().default(null),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
})

type FormValues = z.infer<typeof schema>

function fulfillmentBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'outline'> = {
    pending: 'secondary', partially_fulfilled: 'outline', fulfilled: 'success',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>
}

function approvalBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
    draft: 'secondary', pending_approval: 'outline', approved: 'success', rejected: 'destructive',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>
}

export default function SaleOrdersPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sale-orders', page],
    queryFn: () => fetchSaleOrders({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['sale-order', detailId],
    queryFn: () => fetchSaleOrder(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: customersData } = useQuery({ queryKey: ['customers-all'], queryFn: () => fetchCustomersFull({ per_page: 500 }).then((r) => r.data.data) })
  const customers: CustomerFull[] = customersData ?? []

  const { data: itemsData } = useQuery({ queryKey: ['items-all'], queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data) })
  const allItems: Item[] = itemsData ?? []

  const { data: uomsData } = useQuery({ queryKey: ['uoms'], queryFn: () => fetchUoms().then((r) => r.data.data ?? r.data) })
  const uoms: UnitOfMeasure[] = uomsData ?? []

  const create = useMutation({
    mutationFn: (v: FormValues) => createSaleOrder({
      customer_id: Number(v.customer_id),
      order_date: v.order_date,
      delivery_date: v.delivery_date,
      lines: v.lines.map((l) => ({
        item_id: Number(l.item_id), description: l.description,
        quantity: l.quantity, unit_of_measure_id: Number(l.unit_of_measure_id),
        unit_price: l.unit_price, discount_percentage: l.discount_percentage,
        tax_amount: l.tax_amount, line_total: l.line_total,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-orders'] }); setCreateOpen(false) },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { lines: [{ item_id: '', description: null, quantity: 1, unit_of_measure_id: '', unit_price: 0, discount_percentage: 0, tax_amount: 0, line_total: 0 }] } })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const openCreate = () => {
    reset({ customer_id: '', order_date: new Date().toISOString().slice(0, 10), delivery_date: null, lines: [{ item_id: '', description: null, quantity: 1, unit_of_measure_id: '', unit_price: 0, discount_percentage: 0, tax_amount: 0, line_total: 0 }] })
    setCreateOpen(true)
  }

  const columns: ColumnDef<SaleOrder>[] = [
    { accessorKey: 'order_number', header: 'Order #', enableSorting: true },
    { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name ?? '—' },
    { accessorKey: 'order_date', header: 'Date' },
    { accessorKey: 'delivery_date', header: 'Delivery', cell: ({ row }) => row.original.delivery_date ?? '—' },
    { id: 'approval', header: 'Approval', cell: ({ row }) => approvalBadge(row.original.approval_status) },
    { id: 'fulfillment', header: 'Fulfillment', cell: ({ row }) => fulfillmentBadge(row.original.fulfillment_status) },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sale Orders</h1>
          <p className="text-sm text-muted-foreground">Manage confirmed sales orders</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Order</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sale Order</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 col-span-1">
                <Label>Customer</Label>
                <Select value={watch('customer_id')} onValueChange={(v) => setValue('customer_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Order Date</Label>
                <Input type="date" {...register('order_date')} />
              </div>
              <div className="space-y-1">
                <Label>Delivery Date</Label>
                <Input type="date" {...register('delivery_date')} />
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ item_id: '', description: null, quantity: 1, unit_of_measure_id: '', unit_price: 0, discount_percentage: 0, tax_amount: 0, line_total: 0 })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_60px_80px_70px_70px_70px_32px] gap-2 items-start">
                  <Select value={watch(`lines.${i}.item_id`)} onValueChange={(v) => setValue(`lines.${i}.item_id`, v, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="Item…" /></SelectTrigger>
                    <SelectContent>{allItems.map((it) => <SelectItem key={it.id} value={String(it.id)}>{it.item_code} — {it.item_name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={watch(`lines.${i}.unit_of_measure_id`)} onValueChange={(v) => setValue(`lines.${i}.unit_of_measure_id`, v, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="UOM" /></SelectTrigger>
                    <SelectContent>{uoms.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.abbreviation}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" step="0.0001" placeholder="Qty" {...register(`lines.${i}.quantity`)} />
                  <Input type="number" step="0.01" placeholder="Price" {...register(`lines.${i}.unit_price`)} />
                  <Input type="number" step="0.01" placeholder="Disc%" {...register(`lines.${i}.discount_percentage`)} />
                  <Input type="number" step="0.01" placeholder="Tax" {...register(`lines.${i}.tax_amount`)} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>

            {create.isError && <p className="text-xs text-destructive">Failed to create order</p>}
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
          <DialogHeader><DialogTitle>Sale Order — {detail?.order_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {detail.customer?.name}</div>
                <div><span className="text-muted-foreground">Date:</span> {detail.order_date}</div>
                <div><span className="text-muted-foreground">Delivery:</span> {detail.delivery_date ?? '—'}</div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Fulfillment:</span> {fulfillmentBadge(detail.fulfillment_status)}</div>
              </div>

              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Invoiced</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines?.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{l.item?.item_name ?? `Item #${l.item_id}`}</td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                      <td className="px-3 py-2 text-right">{l.quantity_invoiced}</td>
                      <td className="px-3 py-2 text-right">{l.unit_price}</td>
                      <td className="px-3 py-2 text-right">{l.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ApprovalActions
                approvalStatus={detail.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
                postingStatus={detail.posting_status}
                onSubmit={(c) => submitSaleOrderForApproval(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['sale-order', detail.id] }))}
                onApprove={(c) => approveSaleOrder(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['sale-order', detail.id] }))}
                onReject={(c) => rejectSaleOrder(detail.id, c).then(() => qc.invalidateQueries({ queryKey: ['sale-order', detail.id] }))}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
