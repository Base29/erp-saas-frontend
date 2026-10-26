import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPurchaseInvoices } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Eye, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AttachmentUpload from '@/components/AttachmentUpload'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)

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

  const columns = useMemo<ColumnDef<any>[]>(() => [
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-wider ${
          row.original.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedInvoice(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ], [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-muted-foreground">Track bills received from suppliers.</p>
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
          <DialogHeader>
            <DialogTitle>Purchase Invoice #{selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/10">
                <div>
                  <span className="text-xs text-muted-foreground block">Supplier</span>
                  <span className="font-medium">{selectedInvoice.supplier?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Invoice Date</span>
                  <span className="font-medium">{selectedInvoice.invoice_date ? format(new Date(selectedInvoice.invoice_date), 'MMM d, yyyy') : '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total Amount</span>
                  <span className="font-mono font-semibold text-base">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Due Date</span>
                  <span>{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'MMM d, yyyy') : '—'}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Invoice Attachments</p>
                <AttachmentUpload attachableType="PurchaseInvoice" attachableId={selectedInvoice.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
