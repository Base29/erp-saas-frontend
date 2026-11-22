import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchSupplierPayments,
  fetchSupplierPayment,
  postSupplierPayment,
  type SupplierPayment,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Send, Eye, CheckCircle2, ExternalLink, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import DataTable from '@/components/DataTable'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function SupplierPaymentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [searchParams, setSearchParams] = useSearchParams()
  const returnTo = location.state?.returnTo || searchParams.get('return_to')
  const backLabel = returnTo?.includes('general-ledger')
    ? 'Back to General Ledger'
    : returnTo?.includes('statement')
    ? 'Back to Statement'
    : 'Back'

  const initialSearch = searchParams.get('search') || ''
  const initialId = searchParams.get('id') || null
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(initialId)

  const handleCloseDialog = () => {
    setSelectedPaymentId(null)
    if (returnTo) {
      navigate(returnTo)
    } else if (searchParams.get('id')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('id')
      nextParams.delete('return_to')
      setSearchParams(nextParams, { replace: true })
    }
  }

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      setSelectedPaymentId(id)
    }
  }, [searchParams])

  const { data: detailPayment } = useQuery({
    queryKey: ['supplier-payment', selectedPaymentId],
    queryFn: () => fetchSupplierPayment(selectedPaymentId!).then((r) => r.data.data),
    enabled: !!selectedPaymentId,
  })

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page }
    if (search.trim()) params.search = search.trim()
    return params
  }, [search, page])

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-payments', queryParams],
    queryFn: () => fetchSupplierPayments(queryParams).then((r) => r.data),
  })

  const payments = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const postMutation = useMutation({
    mutationFn: (id: string) => postSupplierPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-payments'] })
      qc.invalidateQueries({ queryKey: ['supplier-payment', selectedPaymentId] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
  })


  const columns = useMemo<ColumnDef<SupplierPayment>[]>(() => [
    {
      accessorKey: 'payment_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.payment_date ? format(new Date(row.original.payment_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => <span className="font-medium">{row.original.supplier?.name ?? '—'}</span>,
    },
    {
      accessorKey: 'payment_reference',
      header: 'Reference',
      cell: ({ row }) => <span>{row.original.payment_reference || '—'}</span>,
    },
    {
      id: 'account',
      header: 'Bank / Cash Account',
      cell: ({ row }) => <span>{row.original.bank_account?.account_name ?? '—'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold text-foreground">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.amount)}
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
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const pmt = row.original
        const isUnposted = pmt.posting_status !== 'posted'

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="View Payment Details"
              onClick={() => setSelectedPaymentId(pmt.id)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {canEdit && isUnposted && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/40 hover:bg-primary/10 text-primary"
                onClick={() => postMutation.mutate(pmt.id)}
                disabled={postMutation.isPending}
                title="Post payment to General Ledger"
              >
                <Send className="h-3 w-3" />
                Post
              </Button>
            )}
          </div>
        )
      },
    },
  ], [canEdit, postMutation])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Payments</h1>
          <p className="text-muted-foreground">Record, allocate, and post payments made to vendors.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/accounts/supplier-payments/new')}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search payments by reference or supplier…"
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

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPaymentId} onOpenChange={(o) => !o && handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              {returnTo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseDialog}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title={backLabel}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{backLabel}</span>
                </Button>
              )}
              <DialogTitle>
                Supplier Payment #{detailPayment?.payment_reference || selectedPaymentId}
              </DialogTitle>
            </div>
            <div>
              {detailPayment?.posting_status === 'posted' ? (
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

          {detailPayment && (
            <div className="space-y-5 text-sm py-2">
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/10">
                <div>
                  <span className="text-xs text-muted-foreground block">Supplier</span>
                  <span className="font-medium text-foreground">{detailPayment.supplier?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Payment Date</span>
                  <span className="font-medium">
                    {detailPayment.payment_date ? format(new Date(detailPayment.payment_date), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Amount</span>
                  <span className="font-mono font-semibold text-base text-primary">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(detailPayment.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Bank / Cash Account</span>
                  <span>{detailPayment.bank_account?.account_name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Payment Reference</span>
                  <span className="font-mono">{detailPayment.payment_reference || '—'}</span>
                </div>
                {detailPayment.journal_voucher_id && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Journal Voucher</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/accounts/journal-vouchers/${detailPayment.journal_voucher_id}`)}
                      className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1 font-semibold"
                    >
                      <span>View Journal Voucher</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </button>
                  </div>
                )}
              </div>

              {detailPayment.allocations && detailPayment.allocations.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Invoice Allocations
                  </p>
                  <div className="rounded border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium">Invoice #</th>
                          <th className="px-3 py-1.5 text-right font-medium">Allocated Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {detailPayment.allocations.map((alloc) => (
                          <tr key={alloc.id}>
                            <td className="px-3 py-1.5 font-medium">
                              {alloc.invoice ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/accounts/purchase-invoices?id=${alloc.purchase_invoice_id}`)}
                                  className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                                >
                                  <span>{alloc.invoice.invoice_number}</span>
                                  <ExternalLink className="h-3 w-3 opacity-70 shrink-0" />
                                </button>
                              ) : (
                                <span className="font-mono">{alloc.purchase_invoice_id}</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-medium">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                alloc.allocated_amount
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailPayment.posting_status !== 'posted' && canEdit && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium">This payment is unposted.</p>
                    <p className="text-muted-foreground mt-0.5">
                      Post this payment to reflect it in the General Ledger.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => postMutation.mutate(detailPayment.id)}
                    disabled={postMutation.isPending}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {postMutation.isPending ? 'Posting…' : 'Post to Ledger'}
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleCloseDialog} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {returnTo ? backLabel : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
