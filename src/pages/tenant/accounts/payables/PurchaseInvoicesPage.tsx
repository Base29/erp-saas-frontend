import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPurchaseInvoices } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
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
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="h-24 text-center">Loading...</td></tr>
            ) : invoices?.data?.data?.length ? (
              invoices.data.data.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
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
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="h-24 text-center text-muted-foreground">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
