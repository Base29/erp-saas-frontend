import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Eye, Download, Pencil, Send, RotateCcw } from 'lucide-react'
import {
  fetchSaleInvoices,
  fetchSaleInvoice,
  createSaleInvoice,
  updateSaleInvoice,
  submitSaleInvoiceForApproval,
  approveSaleInvoice,
  rejectSaleInvoice,
  postSaleInvoice,
  unpostSaleInvoice,
  downloadInvoicePdf,
  fetchCustomersFull,
  fetchSaleOrders,
  fetchFiscalPeriods,
  fetchItems,
  fetchUoms,
  type SaleInvoice,
  type CustomerFull,
  type SaleOrder,
  type FiscalPeriod,
  type Item,
  type UnitOfMeasure,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
import ApprovalActions from '@/components/ApprovalActions'
import AttachmentUpload from '@/components/AttachmentUpload'
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
  item_id: z.string().min(1, 'Item is required'),
  description: z.string().nullable().default(null),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit_of_measure_id: z.string().min(1, 'UOM is required'),
  unit_price: z.coerce.number().min(0),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  line_total: z.coerce.number().min(0).default(0),
})

const schema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  source_sale_order_id: z.string().nullable().default(null),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().nullable().default(null),
  fiscal_period_id: z.string().min(1, 'Fiscal period is required'),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  lines: z.array(lineSchema).min(1, 'At least one line item is required'),
})

type FormValues = z.infer<typeof schema>

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    pending_approval: 'outline',
    approved: 'success',
    rejected: 'destructive',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>
}

export default function SaleInvoicesPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [postingStatus, setPostingStatus] = useState('')
  const [customerId, setCustomerId] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const queryParams: Record<string, string | number> = { page }
  if (search.trim()) queryParams.search = search.trim()
  if (approvalStatus && approvalStatus !== '__all__') queryParams.approval_status = approvalStatus
  if (postingStatus && postingStatus !== '__all__') queryParams.posting_status = postingStatus
  if (customerId && customerId !== '__all__') queryParams.customer_id = customerId

  const { data, isLoading } = useQuery({
    queryKey: ['sale-invoices', queryParams],
    queryFn: () => fetchSaleInvoices(queryParams).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['sale-invoice', detailId],
    queryFn: () => fetchSaleInvoice(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomersFull({ per_page: 500 }).then((r) => r.data.data),
  })
  const customers: CustomerFull[] = customersData ?? []

  const { data: ordersData } = useQuery({
    queryKey: ['sale-orders-all'],
    queryFn: () => fetchSaleOrders({ per_page: 500, approval_status: 'approved' }).then((r) => r.data.data),
  })
  const orders: SaleOrder[] = ordersData ?? []

  const { data: periodsData } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data ?? r.data),
  })
  const periods: FiscalPeriod[] = periodsData ?? []

  const { data: itemsData } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data),
  })
  const allItems: Item[] = itemsData ?? []

  const { data: uomsData } = useQuery({
    queryKey: ['uoms'],
    queryFn: () => fetchUoms().then((r) => r.data.data ?? r.data),
  })
  const uoms: UnitOfMeasure[] = uomsData ?? []

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: '',
      source_sale_order_id: null,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      fiscal_period_id: '',
      tax_rate: 0,
      discount_amount: 0,
      lines: [
        {
          item_id: '',
          description: null,
          quantity: 1,
          unit_of_measure_id: '',
          unit_price: 0,
          discount_percentage: 0,
          tax_amount: 0,
          line_total: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Calculations
  const watchedLines = watch('lines') || []
  const watchedTaxRate = Number(watch('tax_rate')) || 0
  const watchedDiscount = Number(watch('discount_amount')) || 0

  const calculatedLines = useMemo(() => {
    return watchedLines.map((line) => {
      const qty = Number(line.quantity) || 0
      const price = Number(line.unit_price) || 0
      const discPct = Number(line.discount_percentage) || 0
      const base = qty * price
      const discount = base * (discPct / 100)
      const net = Math.max(0, base - discount)
      const manualTax = Number(line.tax_amount) || 0
      const tax = manualTax > 0 ? manualTax : net * (watchedTaxRate / 100)
      const total = net + tax
      return { base, discount, net, tax, total }
    })
  }, [watchedLines, watchedTaxRate])

  const subtotal = useMemo(() => {
    return calculatedLines.reduce((acc, curr) => acc + curr.net, 0)
  }, [calculatedLines])

  const totalTax = useMemo(() => {
    return calculatedLines.reduce((acc, curr) => acc + curr.tax, 0)
  }, [calculatedLines])

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + totalTax - watchedDiscount)
  }, [subtotal, totalTax, watchedDiscount])

  const handleItemSelect = (index: number, itemId: string) => {
    setValue(`lines.${index}.item_id`, itemId, { shouldValidate: true })
    const it = allItems.find((x) => String(x.id) === String(itemId))
    if (it) {
      if (it.base_unit_of_measure_id) {
        setValue(`lines.${index}.unit_of_measure_id`, String(it.base_unit_of_measure_id), { shouldValidate: true })
      }
      const price = (it as any).sale_price ?? (it as any).standard_cost ?? (it as any).price
      if (price !== undefined && price !== null) {
        setValue(`lines.${index}.unit_price`, Number(price))
      }
    }
  }

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        customer_id: v.customer_id,
        source_sale_order_id:
          v.source_sale_order_id && v.source_sale_order_id !== 'none' ? v.source_sale_order_id : null,
        invoice_date: v.invoice_date,
        due_date: v.due_date,
        fiscal_period_id: v.fiscal_period_id,
        tax_rate: watchedTaxRate,
        discount_amount: watchedDiscount,
        subtotal,
        tax_amount: totalTax,
        total_amount: grandTotal,
        lines: v.lines.map((l, idx) => ({
          item_id: l.item_id,
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit_of_measure_id: l.unit_of_measure_id,
          unit_price: Number(l.unit_price) || 0,
          discount_percentage: Number(l.discount_percentage) || 0,
          tax_amount: Number(l.tax_amount) > 0 ? Number(l.tax_amount) : (calculatedLines[idx]?.tax ?? 0),
          line_total: calculatedLines[idx]?.total ?? 0,
        })),
      }

      if (editingInvoiceId) {
        return updateSaleInvoice(editingInvoiceId, payload)
      }
      return createSaleInvoice(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale-invoices'] })
      if (editingInvoiceId) {
        qc.invalidateQueries({ queryKey: ['sale-invoice', editingInvoiceId] })
      }
      setFormOpen(false)
      setEditingInvoiceId(null)
    },
  })

  const postMutation = useMutation({
    mutationFn: (id: string) => postSaleInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sale-invoices'] })
      qc.invalidateQueries({ queryKey: ['sale-invoice', id] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
  })

  const unpostMutation = useMutation({
    mutationFn: (id: string) => unpostSaleInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sale-invoices'] })
      qc.invalidateQueries({ queryKey: ['sale-invoice', id] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
  })

  const openCreate = () => {
    setEditingInvoiceId(null)
    const openPeriod = periods.find((p) => p.status === 'open')
    reset({
      customer_id: '',
      source_sale_order_id: null,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      fiscal_period_id: openPeriod ? String(openPeriod.id) : '',
      tax_rate: 0,
      discount_amount: 0,
      lines: [
        {
          item_id: '',
          description: null,
          quantity: 1,
          unit_of_measure_id: uoms[0]?.id ? String(uoms[0].id) : '',
          unit_price: 0,
          discount_percentage: 0,
          tax_amount: 0,
          line_total: 0,
        },
      ],
    })
    setFormOpen(true)
  }

  const openEdit = (invoice: SaleInvoice) => {
    setEditingInvoiceId(invoice.id)
    reset({
      customer_id: String(invoice.customer_id),
      source_sale_order_id: invoice.source_sale_order_id ? String(invoice.source_sale_order_id) : null,
      invoice_date: invoice.invoice_date ? invoice.invoice_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : null,
      fiscal_period_id: String(invoice.fiscal_period_id),
      tax_rate: Number(invoice.tax_rate) || 0,
      discount_amount: Number(invoice.discount_amount) || 0,
      lines:
        invoice.lines && invoice.lines.length > 0
          ? invoice.lines.map((l) => ({
              item_id: String(l.item_id),
              description: l.description ?? null,
              quantity: Number(l.quantity) || 1,
              unit_of_measure_id: String(l.unit_of_measure_id),
              unit_price: Number(l.unit_price) || 0,
              discount_percentage: Number(l.discount_percentage) || 0,
              tax_amount: Number(l.tax_amount) || 0,
              line_total: Number(l.line_total) || 0,
            }))
          : [
              {
                item_id: '',
                description: null,
                quantity: 1,
                unit_of_measure_id: uoms[0]?.id ? String(uoms[0].id) : '',
                unit_price: 0,
                discount_percentage: 0,
                tax_amount: 0,
                line_total: 0,
              },
            ],
    })
    setFormOpen(true)
  }

  const handleDownloadPdf = async (id: string, invoiceNumber: string) => {
    const res = await downloadInvoicePdf(id)
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoiceNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: ColumnDef<SaleInvoice>[] = [
    {
      accessorKey: 'invoice_number',
      header: 'Invoice #',
      enableSorting: true,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.invoice_number}</span>,
    },
    { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name ?? '—' },
    { accessorKey: 'invoice_date', header: 'Date', cell: ({ row }) => formatDate(row.original.invoice_date) },
    { accessorKey: 'due_date', header: 'Due', cell: ({ row }) => formatDate(row.original.due_date) },
    {
      accessorKey: 'total_amount',
      header: 'Total',
      cell: ({ row }) => `PKR ${Number(row.original.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    { id: 'approval', header: 'Approval', cell: ({ row }) => statusBadge(row.original.approval_status) },
    {
      id: 'posting',
      header: 'Posting',
      cell: ({ row }) => (
        <Badge variant={row.original.posting_status === 'posted' ? 'success' : 'secondary'}>
          {row.original.posting_status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const inv = row.original
        const isUnposted = inv.posting_status !== 'posted'
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="View Invoice"
              onClick={() => setDetailId(inv.id)}
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            {isUnposted && canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Edit Invoice"
                onClick={() => openEdit(inv)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {isUnposted && canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                title="Post to Ledger"
                disabled={postMutation.isPending}
                onClick={() => postMutation.mutate(inv.id)}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isUnposted && canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                title="Unpost Invoice"
                disabled={unpostMutation.isPending}
                onClick={() => {
                  if (confirm('Unposting will reverse the ledger journal entries for this invoice. Continue?')) {
                    unpostMutation.mutate(inv.id)
                  }
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sale Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage and post sales invoices</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search invoices by # or customer…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(
          search ||
            (approvalStatus && approvalStatus !== '__all__') ||
            (postingStatus && postingStatus !== '__all__') ||
            (customerId && customerId !== '__all__')
        )}
        onClearFilters={() => {
          setSearch('')
          setApprovalStatus('')
          setPostingStatus('')
          setCustomerId('')
          setPage(1)
        }}
        toolbarExtra={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={customerId || '__all__'}
              onValueChange={(val) => {
                setCustomerId(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={approvalStatus || '__all__'}
              onValueChange={(val) => {
                setApprovalStatus(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="All Approvals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Approvals</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={postingStatus || '__all__'}
              onValueChange={(val) => {
                setPostingStatus(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue placeholder="All Postings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Postings</SelectItem>
                <SelectItem value="unposted">Unposted</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoiceId ? 'Edit Sale Invoice' : 'New Sale Invoice'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Customer</Label>
                <Select
                  value={watch('customer_id')}
                  onValueChange={(v) => setValue('customer_id', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Source Sale Order (optional)</Label>
                <Select
                  value={watch('source_sale_order_id') ?? 'none'}
                  onValueChange={(v) => setValue('source_sale_order_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">None</SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.order_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Invoice Date</Label>
                <Input type="date" {...register('invoice_date')} />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input type="date" {...register('due_date')} />
              </div>
              <div className="space-y-1">
                <Label>Fiscal Period</Label>
                <Select
                  value={watch('fiscal_period_id')}
                  onValueChange={(v) => setValue('fiscal_period_id', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {periods
                      .filter((p) => p.status === 'open')
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.fiscal_period_id && (
                  <p className="text-xs text-destructive">{errors.fiscal_period_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tax Rate (%)</Label>
                <Input type="number" step="0.01" min="0" max="100" {...register('tax_rate')} />
              </div>
              <div className="space-y-1">
                <Label>Discount Amount (PKR)</Label>
                <Input type="number" step="0.01" min="0" {...register('discount_amount')} />
              </div>
            </div>

            {/* Lines Section */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/5">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold text-sm">Line Items</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    append({
                      item_id: '',
                      description: null,
                      quantity: 1,
                      unit_of_measure_id: uoms[0]?.id ? String(uoms[0].id) : '',
                      unit_price: 0,
                      discount_percentage: 0,
                      tax_amount: 0,
                      line_total: 0,
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>

              {/* Table Column Headings */}
              <div className="grid grid-cols-[1.5fr_80px_70px_80px_65px_70px_90px_32px] gap-2 items-center px-1 text-xs font-semibold text-muted-foreground border-b pb-1">
                <div>Item</div>
                <div>UOM</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Unit Price</div>
                <div className="text-right">Disc %</div>
                <div className="text-right">Tax (PKR)</div>
                <div className="text-right">Line Total</div>
                <div></div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {fields.map((field, i) => {
                  const lineCalc = calculatedLines[i] ?? { total: 0 }
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1.5fr_80px_70px_80px_65px_70px_90px_32px] gap-2 items-center"
                    >
                      <Select
                        value={watch(`lines.${i}.item_id`)}
                        onValueChange={(v) => handleItemSelect(i, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select item…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {allItems.map((it) => (
                            <SelectItem key={it.id} value={String(it.id)}>
                              {it.item_code} — {it.item_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={watch(`lines.${i}.unit_of_measure_id`)}
                        onValueChange={(v) => setValue(`lines.${i}.unit_of_measure_id`, v, { shouldValidate: true })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="UOM" />
                        </SelectTrigger>
                        <SelectContent>
                          {uoms.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.abbreviation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="0.0001"
                        className="h-8 text-xs text-right"
                        placeholder="Qty"
                        {...register(`lines.${i}.quantity`)}
                      />

                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs text-right"
                        placeholder="Price"
                        {...register(`lines.${i}.unit_price`)}
                      />

                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs text-right"
                        placeholder="Disc%"
                        {...register(`lines.${i}.discount_percentage`)}
                      />

                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs text-right"
                        placeholder="Tax"
                        {...register(`lines.${i}.tax_amount`)}
                      />

                      <div className="h-8 px-2 flex items-center justify-end font-mono text-xs font-medium bg-muted/20 border rounded">
                        {Number(lineCalc.total).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => remove(i)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {/* Order Calculations Summary Box */}
              <div className="border-t pt-2 mt-3 grid grid-cols-2 text-xs">
                <div className="text-muted-foreground space-y-1">
                  <div>* Taxes calculated per item using invoice tax rate or manual override.</div>
                  <div>* Line totals reflect net price after line discount plus tax.</div>
                </div>
                <div className="space-y-1 text-right font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      PKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Amount:</span>
                    <span className="font-medium">
                      PKR {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {watchedDiscount > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Discount:</span>
                      <span>
                        - PKR{' '}
                        {watchedDiscount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t pt-1 text-foreground">
                    <span>Total Amount:</span>
                    <span className="text-primary">
                      PKR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {saveMutation.isError && (
              <p className="text-xs text-destructive">
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save invoice'}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {editingInvoiceId ? 'Save Changes' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Invoice — {detail?.invoice_number}</DialogTitle>
              {detail && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPdf(detail.id, detail.invoice_number)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                  {detail.posting_status !== 'posted' && canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDetailId(null)
                        openEdit(detail)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-3 bg-muted/10">
                <div>
                  <span className="text-muted-foreground block text-xs">Customer</span>
                  <span className="font-medium text-foreground">{detail.customer?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Invoice Date</span>
                  <span className="font-medium">{formatDate(detail.invoice_date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Due Date</span>
                  <span>{formatDate(detail.due_date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Fiscal Period</span>
                  <span>{detail.fiscal_period?.name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Subtotal</span>
                  <span className="font-mono">PKR {Number(detail.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Tax Amount</span>
                  <span className="font-mono">PKR {Number(detail.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Total Amount</span>
                  <span className="font-mono font-bold text-base text-primary">
                    PKR {Number(detail.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Posting Status</span>
                  <Badge variant={detail.posting_status === 'posted' ? 'success' : 'secondary'}>
                    {detail.posting_status}
                  </Badge>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Tax</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines?.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{l.item?.item_name ?? `Item #${l.item_id}`}</td>
                        <td className="px-3 py-2 text-right">{l.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {Number(l.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {Number(l.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {Number(l.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Direct Post & Unpost Actions */}
              {detail.posting_status !== 'posted' && canEdit && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">Invoice is ready to be posted.</p>
                    <p className="text-muted-foreground mt-0.5">
                      Posting this invoice will generate the General Ledger entries and reflect in reports.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={postMutation.isPending}
                    onClick={() => postMutation.mutate(detail.id)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {postMutation.isPending ? 'Posting…' : 'Post to Ledger'}
                  </Button>
                </div>
              )}

              {!detail.posting_status || detail.posting_status === 'posted' ? (
                canEdit && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      <p className="font-medium">This invoice is posted to the ledger.</p>
                      <p className="text-muted-foreground mt-0.5">
                        Need to make changes? Unpost the invoice to edit details or delete it.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                      disabled={unpostMutation.isPending}
                      onClick={() => {
                        if (confirm('Unposting will reverse the ledger journal entries for this invoice. Continue?')) {
                          unpostMutation.mutate(detail.id)
                        }
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {unpostMutation.isPending ? 'Unposting…' : 'Unpost Invoice'}
                    </Button>
                  </div>
                )
              ) : null}

              <div className="border-t pt-4">
                <ApprovalActions
                  approvalStatus={detail.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
                  postingStatus={detail.posting_status}
                  onSubmit={(c) =>
                    submitSaleInvoiceForApproval(detail.id, c).then(() =>
                      qc.invalidateQueries({ queryKey: ['sale-invoice', detail.id] })
                    )
                  }
                  onApprove={(c) =>
                    approveSaleInvoice(detail.id, c).then(() =>
                      qc.invalidateQueries({ queryKey: ['sale-invoice', detail.id] })
                    )
                  }
                  onReject={(c) =>
                    rejectSaleInvoice(detail.id, c).then(() =>
                      qc.invalidateQueries({ queryKey: ['sale-invoice', detail.id] })
                    )
                  }
                  onPost={() => postMutation.mutateAsync(detail.id).then(() => {})}
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Attachments</p>
                <AttachmentUpload attachableType="SaleInvoice" attachableId={detail.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
