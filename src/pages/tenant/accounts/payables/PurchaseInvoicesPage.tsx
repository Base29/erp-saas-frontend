import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPurchaseInvoices } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Eye, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AttachmentUpload from '@/components/AttachmentUpload'

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['purchase-invoices', { search }],
    queryFn: () => fetchPurchaseInvoices({ search }),
  })

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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="h-10 px-4 text-left font-medium">Invoice #</th>
              <th className="h-10 px-4 text-left font-medium">Supplier</th>
              <th className="h-10 px-4 text-left font-medium">Date</th>
              <th className="h-10 px-4 text-left font-medium">Due Date</th>
              <th className="h-10 px-4 text-right font-medium">Total</th>
              <th className="h-10 px-4 text-left font-medium">Status</th>
              <th className="h-10 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="h-24 text-center">Loading...</td></tr>
            ) : invoices?.data?.data?.length ? (
              invoices.data.data.map((inv) => (
                <tr 
                  key={inv.id} 
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.supplier?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.total_amount)}
                  </td>
                  <td className="px-4 py-3 uppercase text-[10px] font-bold tracking-wider">
                    <span className={`px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedInvoice(inv)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="h-24 text-center text-muted-foreground">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
