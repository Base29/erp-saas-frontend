import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSalesRegister, fetchReceivablesAging, fetchCustomersFull, type CustomerFull } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ReportTab = 'sales-register' | 'receivables-aging'

interface SalesRegisterRow {
  invoice_number: string
  invoice_date: string
  customer_name: string
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_status: string
}

interface AgingRow {
  customer_name: string
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  over_90: number
  total: number
}

export default function SalesReportsPage() {
  const [tab, setTab] = useState<ReportTab>('sales-register')

  // Sales Register filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [customerId, setCustomerId] = useState<string>('')
  const [registerPage, setRegisterPage] = useState(1)
  const [runRegister, setRunRegister] = useState(false)

  // Aging filters
  const [agingCustomerId, setAgingCustomerId] = useState<string>('')
  const [runAging, setRunAging] = useState(false)

  const { data: customersData } = useQuery({ queryKey: ['customers-all'], queryFn: () => fetchCustomersFull({ per_page: 500 }).then((r) => r.data.data) })
  const customers: CustomerFull[] = customersData ?? []

  const { data: registerData, isLoading: registerLoading } = useQuery({
    queryKey: ['sales-register', dateFrom, dateTo, customerId, registerPage],
    queryFn: () => fetchSalesRegister({ date_from: dateFrom, date_to: dateTo, ...(customerId ? { customer_id: Number(customerId) } : {}), page: registerPage }).then((r) => r.data),
    enabled: runRegister,
  })

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['receivables-aging', agingCustomerId],
    queryFn: () => fetchReceivablesAging(agingCustomerId ? { customer_id: Number(agingCustomerId) } : {}).then((r) => r.data),
    enabled: runAging,
  })

  const registerRows: SalesRegisterRow[] = registerData?.data ?? []
  const agingRows: AgingRow[] = agingData?.data ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Sales Reports</h1>
        <p className="text-sm text-muted-foreground">Sales register and receivables aging</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b">
        {(['sales-register', 'receivables-aging'] as ReportTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'sales-register' ? 'Sales Register' : 'Receivables Aging'}
          </button>
        ))}
      </div>

      {/* Sales Register */}
      {tab === 'sales-register' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All customers</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setRunRegister(true); setRegisterPage(1) }}>Run Report</Button>
          </div>

          {registerLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {registerRows.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice #</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-right">Tax</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registerRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.invoice_number}</td>
                      <td className="px-3 py-2">{row.invoice_date}</td>
                      <td className="px-3 py-2">{row.customer_name}</td>
                      <td className="px-3 py-2 text-right">PKR {Number(row.subtotal).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">PKR {Number(row.tax_amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">PKR {Number(row.total_amount).toLocaleString()}</td>
                      <td className="px-3 py-2"><Badge variant={row.payment_status === 'paid' ? 'success' : 'outline'}>{row.payment_status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {registerData && registerData.last_page > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                  <span className="text-muted-foreground">Page {registerPage} of {registerData.last_page}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={registerPage <= 1} onClick={() => setRegisterPage((p) => p - 1)}>Prev</Button>
                    <Button size="sm" variant="outline" disabled={registerPage >= registerData.last_page} onClick={() => setRegisterPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {runRegister && !registerLoading && registerRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No invoices found for the selected filters.</p>
          )}
        </div>
      )}

      {/* Receivables Aging */}
      {tab === 'receivables-aging' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={agingCustomerId} onValueChange={setAgingCustomerId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All customers</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setRunAging(true)}>Run Report</Button>
          </div>

          {agingLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {agingRows.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-right">Current</th>
                    <th className="px-3 py-2 text-right">1–30 days</th>
                    <th className="px-3 py-2 text-right">31–60 days</th>
                    <th className="px-3 py-2 text-right">61–90 days</th>
                    <th className="px-3 py-2 text-right">90+ days</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {agingRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{row.customer_name}</td>
                      <td className="px-3 py-2 text-right">{Number(row.current).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{Number(row.days_1_30).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{Number(row.days_31_60).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{Number(row.days_61_90).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{Number(row.over_90).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">PKR {Number(row.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {runAging && !agingLoading && agingRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No outstanding receivables found.</p>
          )}
        </div>
      )}
    </div>
  )
}
