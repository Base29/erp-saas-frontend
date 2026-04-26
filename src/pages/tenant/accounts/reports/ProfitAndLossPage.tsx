import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchProfitAndLoss } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PLDetailRow({ label, amount, isTotal = false, isFinal = false }: { label: string, amount: number, isTotal?: boolean, isFinal?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${isTotal ? 'font-bold border-t border-muted pt-3' : 'text-sm'} ${isFinal ? 'text-lg font-black border-t-2 border-double mt-2 pt-4' : ''}`}>
      <span className={isTotal ? 'uppercase tracking-wider' : 'text-muted-foreground'}>{label}</span>
      <span className="font-mono">{fmt(amount)}</span>
    </div>
  )
}

export default function ProfitAndLossPage() {
  const [params, setParams] = useState({ date_from: '', date_to: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-pl', params],
    queryFn: () => fetchProfitAndLoss(params).then((r) => r.data),
    enabled: submitted && !!params.date_from && !!params.date_to,
  })

  const canRun = !!params.date_from && !!params.date_to

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #pl-print-area { display: block !important; }
          #pl-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement of Profit or Loss</h1>
          <p className="text-sm text-muted-foreground">
            Revenue and Expense performance (IAS 1 compliant)
          </p>
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl border bg-card shadow-sm print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase text-muted-foreground">From</Label>
          <Input
            type="date"
            value={params.date_from}
            onChange={(e) => { setParams((p) => ({ ...p, date_from: e.target.value })); setSubmitted(false) }}
            className="w-40 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase text-muted-foreground">To</Label>
          <Input
            type="date"
            value={params.date_to}
            onChange={(e) => { setParams((p) => ({ ...p, date_to: e.target.value })); setSubmitted(false) }}
            className="w-40 h-9"
          />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!canRun} size="sm" className="h-9 px-6">
          Run Report
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 justify-center text-muted-foreground animate-pulse">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Calculating figures...</span>
        </div>
      )}

      {submitted && !isLoading && !data && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed">
          <p className="text-sm text-muted-foreground font-medium">No financial activity found for the selected period.</p>
        </div>
      )}

      {submitted && !isLoading && data && (
        <div id="pl-print-area" className="bg-card p-10 rounded-2xl border shadow-sm print:shadow-none print:border-0 space-y-10">
          <div className="text-center space-y-1 border-b pb-8">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Statement of Profit or Loss</h2>
            <p className="text-sm text-muted-foreground font-medium">For the period {params.date_from} to {params.date_to}</p>
          </div>

          <div className="space-y-1">
            {/* Revenue Section */}
            <div className="space-y-2 pb-4">
               <PLDetailRow label="Revenue from Sales" amount={data.revenue.sales} />
               <PLDetailRow label="Other Operating Income" amount={data.revenue.other} />
               <PLDetailRow label="Total Revenue" amount={data.revenue.total} isTotal />
            </div>

            {/* COGS Section */}
            <div className="space-y-2 pb-4">
               <PLDetailRow label="Cost of Goods Sold" amount={-data.cogs} />
               <PLDetailRow label="Gross Profit" amount={data.gross_profit} isTotal />
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2 pb-4">
               <PLDetailRow label="Operating Expenses" amount={-data.operating_expenses} />
               <PLDetailRow label="Operating Profit (EBIT)" amount={data.operating_profit} isTotal />
            </div>

            {/* Financial Items */}
            <div className="space-y-2 pb-4">
               <PLDetailRow label="Financial Expenses / Interest" amount={-data.financial_expenses} />
            </div>

            {/* Bottom Line */}
            <div className={`mt-4 p-6 rounded-2xl border ${data.net_profit >= 0 ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${data.net_profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.net_profit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                  </div>
                  <div>
                    <h4 className={`text-xl font-black uppercase tracking-tight ${data.net_profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {data.net_profit >= 0 ? 'Net Profit' : 'Net Loss'}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">For the Period</p>
                  </div>
                </div>
                <div className={`text-3xl font-black font-mono ${data.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt(Math.abs(data.net_profit))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 space-y-4">
             <h3 className="text-sm font-bold uppercase text-muted-foreground border-b pb-2">Account Breakdown</h3>
             <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Account</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.details.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="py-2.5">
                        <span className="font-mono text-[10px] text-muted-foreground mr-2">{item.account_code}</span>
                        <span className="font-medium">{item.account_name}</span>
                      </td>
                      <td className="py-2.5 text-right font-mono">{fmt(Math.abs(item.balance))}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  )
}
