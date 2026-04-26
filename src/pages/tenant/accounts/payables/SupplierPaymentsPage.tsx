import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSupplierPayments } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function SupplierPaymentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: payments, isLoading } = useQuery({
    queryKey: ['supplier-payments', { search }],
    queryFn: () => fetchSupplierPayments({ search }),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Payments</h1>
          <p className="text-muted-foreground">Record and manage payments made to vendors.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/accounts/supplier-payments/new')}>
          <Plus size={16} />
          Record Payment
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
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
              <th className="h-10 px-4 text-left font-medium">Date</th>
              <th className="h-10 px-4 text-left font-medium">Supplier</th>
              <th className="h-10 px-4 text-left font-medium">Reference</th>
              <th className="h-10 px-4 text-left font-medium">Account</th>
              <th className="h-10 px-4 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="h-24 text-center">Loading...</td></tr>
            ) : payments?.data?.data?.length ? (
              payments.data.data.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.supplier?.name}</td>
                  <td className="px-4 py-3">{p.payment_reference || '-'}</td>
                  <td className="px-4 py-3">{p.bank_account?.account_name}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">No payments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
