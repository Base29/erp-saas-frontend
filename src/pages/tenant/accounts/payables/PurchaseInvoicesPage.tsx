import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPurchaseInvoices, postPurchaseInvoice, type PurchaseInvoice } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Plus, Send, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import AttachmentUpload from '@/components/AttachmentUpload'
import DataTable from '@/components/DataTable'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null)

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

        return (
          <div className="flex items-center justify-end gap-1">
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
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSelectedInvoice(inv)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ], [canEdit, postMutation])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-muted-foreground">Track bills received from suppliers and post them to ledgers.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/accounts/purchase-invoices/new')}>
          <Plus size={16} />
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
      <Dialog open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <DialogTitle>Purchase Invoice #{selectedInvoice?.invoice_number}</DialogTitle>
            {selectedInvoice?.posting_status === 'posted' ? (
              <Badge variant="success" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Posted
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs">
                Unposted
              </Badge>
            )}
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
              </div>

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

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Invoice Attachments</p>
                <AttachmentUpload attachableType="PurchaseInvoice" attachableId={selectedInvoice.id} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
