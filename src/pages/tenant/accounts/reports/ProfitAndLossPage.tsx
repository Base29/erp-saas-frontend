import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchProfitAndLoss } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PLRow = {
  group_name: string
  account_code: string
  account_name: string
  net_amount: number
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PLSection({
  title,
  rows,
  total,
}: {
  title: string
  rows: PLRow[]
  total: number
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/60 px-4 py-2.5 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground w-20">
                {row.account_code}
              </td>
              <td className="px-4 py-2">{row.account_name}</td>
              <td className="px-4 py-2 text-right font-mono">{fmt(Math.abs(row.net_amount))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-3 text-sm text-muted-foreground text-center">
                No {title.toLowerCase()} accounts with activity
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="bg-muted/30 border-t font-semibold">
          <tr>
            <td colSpan={2} className="px-4 py-2.5 text-right text-sm">
              Total {title}
            </td>
            <td className="px-4 py-2.5 text-right font-mono">{fmt(Math.abs(total))}</td>
          </tr>
        </tfoot>
      </table>
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

  const rows: PLRow[] = (data as { rows?: PLRow[] })?.rows ?? []
  const revenue: number = (data as { revenue?: number })?.revenue ?? 0
  const expenses: number = (data as { expenses?: number })?.expenses ?? 0
  const netProfit: number = (data as { net_profit?: number })?.net_profit ?? 0

  const revenueRows = rows.filter((r) => r.group_name === 'Revenue')
  const expenseRows = rows.filter((r) => r.group_name === 'Expenses')

  const canRun = !!params.date_from && !!params.date_to

  return (
    <div className="p-6 space-y-5">
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
          <h1 className="text-xl font-semibold">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground">
            Revenue and expense account balances for a date range
          </p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print / PDF
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end p-4 rounded-lg border bg-muted/30">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={params.date_from}
            onChange={(e) => { setParams((p) => ({ ...p, date_from: e.target.value })); setSubmitted(false) }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={params.date_to}
            onChange={(e) => { setParams((p) => ({ ...p, date_to: e.target.value })); setSubmitted(false) }}
            className="w-40"
          />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!canRun}>
          Run Report
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      )}

      {submitted && !isLoading && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No posted transactions found for the selected date range.
        </div>
      )}

      {submitted && !isLoading && rows.length > 0 && (
        <div id="pl-print-area" className="space-y-4">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">Profit &amp; Loss Statement</h2>
            <p className="text-sm">Period: {params.date_from} to {params.date_to}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 print:hidden">
            <div className="rounded-lg border p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Revenue</span>
              </div>
              <p className="text-xl font-bold text-green-700 font-mono">{fmt(revenue)}</p>
            </div>
            <div className="rounded-lg border p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Expenses</span>
              </div>
              <p className="text-xl font-bold text-red-700 font-mono">{fmt(expenses)}</p>
            </div>
            <div className={`rounded-lg border p-4 ${netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className={`flex items-center gap-2 mb-1 ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </span>
              </div>
              <p className={`text-xl font-bold font-mono ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {fmt(Math.abs(netProfit))}
              </p>
            </div>
          </div>

          <PLSection title="Revenue" rows={revenueRows} total={revenue} />
          <PLSection title="Expenses" rows={expenseRows} total={expenses} />

          {/* Net Profit/Loss row */}
          <div
            className={`rounded-lg px-5 py-4 flex items-center justify-between font-semibold ${
              netProfit >= 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="text-base">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
            <span className="font-mono text-lg">{fmt(Math.abs(netProfit))}</span>
          </div>
        </div>
      )}
    </div>
  )
}
