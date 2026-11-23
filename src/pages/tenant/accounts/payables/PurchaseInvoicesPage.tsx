import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPurchaseInvoices,
  fetchPurchaseInvoice,
  postPurchaseInvoice,
  unpostPurchaseInvoice,
  type PurchaseInvoice,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Plus, Send, CheckCircle2, Pencil, RotateCcw, ExternalLink, ArrowLeft, Package, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { formatQuantity } from '@/utils/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import AttachmentUpload from '@/components/AttachmentUpload'
import DataTable from '@/components/DataTable'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [searchParams, setSearchParams] = useSearchParams()
  const returnTo = location.state?.returnTo || searchParams.get('return_to')
  const backLabel = returnTo?.includes('purchase-invoices')
    ? 'Back to Purchase Invoice'
    : returnTo?.includes('orders')
    ? 'Back to Purchase Order'
    : returnTo?.includes('goods-receipts')
    ? 'Back to Goods Receipt'
    : returnTo?.includes('general-ledger')
    ? 'Back to General Ledger'
    : returnTo?.includes('statement')
    ? 'Back to Statement'
    : 'Back'

  const initialSearch = searchParams.get('search') || ''
  const initialId = searchParams.get('id') || null
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(initialId)
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null)

  const handleCloseDetail = () => {
    setSelectedInvoice(null)
    setDetailId(null)
    if (returnTo) {
      navigate(returnTo)
    } else if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams)
      next.delete('id')
      next.delete('return_to')
      setSearchParams(next, { replace: true })
    }
  }

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      setDetailId(id)
    }
  }, [searchParams])

  const { data: fetchedInvoiceData } = useQuery({
    queryKey: ['purchase-invoice', detailId],
    queryFn: () => fetchPurchaseInvoice(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  useEffect(() => {
    if (fetchedInvoiceData) {
      setSelectedInvoice(fetchedInvoiceData)
    }
  }, [fetchedInvoiceData])

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page }
    if (search.trim()) params.search = search.trim()
    return params
  }, [search, page])

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-invoices', queryParams],
    queryFn: () => fetchPurchaseInvoices(queryParams).then((r) => r.data),
  })

  const invoices = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const postMutation = useMutation({
    mutationFn: (id: string) => postPurchaseInvoice(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['purchase-invoices'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
      if (selectedInvoice && res.data?.data) {
        setSelectedInvoice(res.data.data)
      }
      toast.success('Invoice posted to ledger successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to post invoice')
    },
  })

  const unpostMutation = useMutation({
    mutationFn: (id: string) => unpostPurchaseInvoice(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['purchase-invoices'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
      if (selectedInvoice && res.data?.data) {
        setSelectedInvoice(res.data.data)
      }
      toast.success('Invoice unposted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to unpost invoice')
    },
  })

  const columns = useMemo<ColumnDef<PurchaseInvoice>[]>(() => [
    {
      accessorKey: 'invoice_number',
      header: 'Invoice #',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.invoice_number}</span>,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => <span>{row.original.supplier?.name ?? '—'}</span>,
    },
    {
      accessorKey: 'invoice_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.invoice_date ? format(new Date(row.original.invoice_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.due_date ? format(new Date(row.original.due_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'total_amount',
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-medium">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.total_amount)}
        </div>
      ),
    },
    {
      accessorKey: 'posting_status',
      header: 'Posting',
      cell: ({ row }) => {
        const isPosted = row.original.posting_status === 'posted'
        return (
          <Badge variant={isPosted ? 'success' : 'warning'} className="uppercase text-[10px] font-bold tracking-wider">
            {isPosted ? 'Posted' : 'Unposted'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Payment Status',
      cell: ({ row }) => {
        const s = row.original.status
        const color =
          s === 'paid'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            : s === 'partially_paid'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        return (
          <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-wider ${color}`}>
            {s ? s.replace('_', ' ') : 'approved'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const inv = row.original
        const isUnposted = inv.posting_status !== 'posted'
        const canModify = inv.status !== 'paid' && inv.status !== 'partially_paid'

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="View Invoice"
              onClick={() => {
                setDetailId(inv.id)
                setSelectedInvoice(inv)
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {canEdit && canModify && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Edit Invoice"
                onClick={() => navigate(`/accounts/purchase-invoices/${inv.id}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && isUnposted && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/40 hover:bg-primary/10 text-primary"
                onClick={() => postMutation.mutate(inv.id)}
                disabled={postMutation.isPending}
                title="Post to General Ledger"
              >
                <Send className="h-3 w-3" />
                Post
              </Button>
            )}
            {canEdit && !isUnposted && canModify && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
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
  ], [canEdit, postMutation, unpostMutation, navigate])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-muted-foreground">Track bills received from suppliers and post them to ledgers.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/accounts/purchase-invoices/new')}>
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search invoices by number or supplier…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(search)}
        onClearFilters={() => {
          setSearch('')
          setPage(1)
        }}
      />

      {/* Invoice Detail Dialog */}
      <Dialog open={Boolean(selectedInvoice || detailId)} onOpenChange={(o) => !o && handleCloseDetail()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              {returnTo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseDetail}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title={backLabel}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{backLabel}</span>
                </Button>
              )}
              <DialogTitle>Purchase Invoice #{selectedInvoice?.invoice_number}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && selectedInvoice && selectedInvoice.status !== 'paid' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => {
                    navigate(`/accounts/purchase-invoices/${selectedInvoice.id}/edit`)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {selectedInvoice?.posting_status === 'posted' ? (
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Posted
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  Unposted
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-5 text-sm py-2">
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/10">
                <div>
                  <span className="text-xs text-muted-foreground block">Supplier</span>
                  <span className="font-medium text-foreground">{selectedInvoice.supplier?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Invoice Date</span>
                  <span className="font-medium">{selectedInvoice.invoice_date ? format(new Date(selectedInvoice.invoice_date), 'MMM d, yyyy') : '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total Amount</span>
                  <span className="font-mono font-semibold text-base text-primary">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Due Date</span>
                  <span>{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'MMM d, yyyy') : '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Tax / VAT Amount</span>
                  <span className="font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.tax_amount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Payment Status</span>
                  <span className="capitalize font-medium">{selectedInvoice.status ? selectedInvoice.status.replace('_', ' ') : 'Approved'}</span>
                </div>
                {(() => {
                  const grns: any[] = []
                  if ((selectedInvoice as any).goodsReceipt) grns.push((selectedInvoice as any).goodsReceipt)
                  if ((selectedInvoice as any).goods_receipt) grns.push((selectedInvoice as any).goods_receipt)
                  const poGrns = (selectedInvoice as any).purchaseOrder?.goodsReceipts || (selectedInvoice as any).purchase_order?.goods_receipts || []
                  poGrns.forEach((pg: any) => {
                    if (!grns.some((g) => g.id === pg.id)) grns.push(pg)
                  })

                  const lines = (selectedInvoice as any).lines || []
                  lines.forEach((ln: any) => {
                    const gr = ln.goodsReceiptLine?.goodsReceipt || ln.goods_receipt_line?.goods_receipt || ln.goodsReceiptLine?.goods_receipt || ln.goods_receipt
                    if (gr && !grns.some((g) => g.id === gr.id)) {
                      grns.push(gr)
                    } else if (ln.goods_receipt_id && !grns.some((g) => g.id === ln.goods_receipt_id)) {
                      grns.push({ id: ln.goods_receipt_id, grn_number: 'View GRN' })
                    }
                  })

                  if (grns.length === 0 && selectedInvoice.goods_receipt_id) {
                    grns.push({ id: selectedInvoice.goods_receipt_id, grn_number: 'View GRN' })
                  }

                  if (grns.length === 0) return null

                  return (
                    <div>
                      <span className="text-xs text-muted-foreground block">Goods Receipt (GRN)</span>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {grns.map((grn) => (
                          <button
                            key={grn.id}
                            type="button"
                            onClick={() =>
                              navigate(
                                `/inventory/goods-receipts?id=${grn.id}&return_to=${encodeURIComponent(
                                  `/accounts/purchase-invoices?id=${selectedInvoice.id}`
                                )}`
                              )
                            }
                            className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1 font-semibold"
                          >
                            <Package className="h-3 w-3 opacity-70" />
                            <span>{grn.grn_number || 'View GRN'}</span>
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {(() => {
                  const po = (selectedInvoice as any).purchaseOrder || (selectedInvoice as any).purchase_order
                  let poId = selectedInvoice.purchase_order_id || po?.id
                  let poNumber = po?.po_number

                  if (!poId) {
                    const lines = (selectedInvoice as any).lines || []
                    for (const ln of lines) {
                      const lPo = ln.purchaseOrder || ln.purchase_order || ln.purchaseOrderLine?.order || ln.purchase_order_line?.order
                      if (lPo?.id) {
                        poId = lPo.id
                        poNumber = lPo.po_number
                        break
                      } else if (ln.purchase_order_id) {
                        poId = ln.purchase_order_id
                        break
                      }
                    }
                  }

                  if (!poId && !po) return null
                  poNumber = poNumber || 'View PO'
                  return (
                    <div>
                      <span className="text-xs text-muted-foreground block">Purchase Order</span>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/procurement/orders/${poId}?return_to=${encodeURIComponent(
                              `/accounts/purchase-invoices?id=${selectedInvoice.id}`
                            )}`
                          )
                        }
                        className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1 font-semibold"
                      >
                        <FileText className="h-3 w-3 opacity-70" />
                        <span>{poNumber}</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </button>
                    </div>
                  )
                })()}

                {selectedInvoice.journal_voucher_id && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Journal Voucher</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/accounts/journal-vouchers/${selectedInvoice.journal_voucher_id}`)}
                      className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1 font-semibold"
                    >
                      <span>View Journal Voucher</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </button>
                  </div>
                )}
              </div>

              {(selectedInvoice as any).lines && (selectedInvoice as any).lines.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Line Items</p>
                  <div className="rounded border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium">Item</th>
                          <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                          <th className="px-3 py-1.5 text-right font-medium">Unit Price</th>
                          <th className="px-3 py-1.5 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(selectedInvoice as any).lines.map((ln: any, idx: number) => {
                          const itemName =
                            ln.item?.item_name ||
                            ln.item_name ||
                            ln.item_description ||
                            ln.description ||
                            ln.purchaseOrderLine?.item_description ||
                            ln.purchase_order_line?.item_description ||
                            ln.purchaseOrderLine?.item?.item_name ||
                            ln.purchase_order_line?.item?.item_name ||
                            ln.purchaseOrderLine?.description ||
                            ln.purchase_order_line?.description ||
                            ln.goodsReceiptLine?.item_description ||
                            ln.goods_receipt_line?.item_description ||
                            ln.goodsReceiptLine?.item?.item_name ||
                            ln.goods_receipt_line?.item?.item_name ||
                            ln.item?.name ||
                            ln.name ||
                            ln.title ||
                            '—'
                          const itemCode =
                            ln.item?.item_code ||
                            ln.item_code ||
                            ln.purchaseOrderLine?.item?.item_code ||
                            ln.purchase_order_line?.item?.item_code ||
                            ln.goodsReceiptLine?.item?.item_code ||
                            ln.goods_receipt_line?.item?.item_code
                          return (
                            <tr key={ln.id ?? idx}>
                              <td className="px-3 py-1.5 font-medium">
                                <div>{itemName}</div>
                                {itemCode && (
                                  <div className="text-[10px] text-muted-foreground font-mono">{itemCode}</div>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono">{formatQuantity(ln.quantity)}</td>
                              <td className="px-3 py-1.5 text-right font-mono">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ln.unit_price)}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-medium">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(ln.quantity) * Number(ln.unit_price))}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedInvoice.posting_status !== 'posted' && canEdit && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium">This invoice is unposted.</p>
                    <p className="text-muted-foreground mt-0.5">Post this invoice to reflect it in the General Ledger and Trial Balance.</p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => postMutation.mutate(selectedInvoice.id)}
                    disabled={postMutation.isPending}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {postMutation.isPending ? 'Posting…' : 'Post to Ledger'}
                  </Button>
                </div>
              )}

              {selectedInvoice.posting_status === 'posted' && canEdit && selectedInvoice.status !== 'paid' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium">This invoice is posted to the ledger.</p>
                    <p className="text-muted-foreground mt-0.5">Need to make adjustments? Unpost the invoice to modify or delete it.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-100"
                    onClick={() => {
                      if (confirm('Unposting will reverse the ledger journal entries for this invoice. Continue?')) {
                        unpostMutation.mutate(selectedInvoice.id)
                      }
                    }}
                    disabled={unpostMutation.isPending}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {unpostMutation.isPending ? 'Unposting…' : 'Unpost Invoice'}
                  </Button>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Invoice Attachments</p>
                <AttachmentUpload attachableType="PurchaseInvoice" attachableId={selectedInvoice.id} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleCloseDetail} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {returnTo ? backLabel : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
