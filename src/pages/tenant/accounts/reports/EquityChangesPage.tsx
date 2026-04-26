import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, Scale } from 'lucide-react'
import { fetchEquityChanges } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EquityRow({ label, amount, isTotal = false }: { label: string, amount: number, isTotal?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-3 ${isTotal ? 'font-bold border-t-2 border-double border-muted mt-4 pt-4 text-lg' : 'text-sm border-b border-muted/50'}`}>
      <span className={isTotal ? 'uppercase tracking-widest' : 'text-muted-foreground'}>{label}</span>
      <span className="font-mono">{fmt(amount)}</span>
    </div>
  )
}

export default function EquityChangesPage() {
  const [params, setParams] = useState({ date_from: '', date_to: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-equity', params],
    queryFn: () => fetchEquityChanges(params).then((r) => r.data),
    enabled: submitted && !!params.date_from && !!params.date_to,
  })

  const canRun = !!params.date_from && !!params.date_to

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #equity-print-area { display: block !important; }
          #equity-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement of Changes in Equity</h1>
          <p className="text-sm text-muted-foreground">
            Movement in share capital and reserves (IAS 1 compliant)
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
          <span className="text-sm font-medium">Analyzing equity movements...</span>
        </div>
      )}

      {submitted && !isLoading && !data && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed">
          <p className="text-sm text-muted-foreground font-medium">No equity changes found for the selected period.</p>
        </div>
      )}

      {submitted && !isLoading && data && (
        <div id="equity-print-area" className="bg-card p-12 rounded-2xl border shadow-sm print:shadow-none print:border-0 space-y-10">
          <div className="text-center space-y-1 border-b pb-8">
            <h2 className="text-xl font-bold uppercase tracking-widest">Statement of Changes in Equity</h2>
            <p className="text-sm text-muted-foreground font-medium">For the period {params.date_from} to {params.date_to}</p>
          </div>

          <div className="space-y-1">
             <EquityRow label={`Balance as at ${params.date_from}`} amount={data.opening_balance} />
             <EquityRow label="Issue of Share Capital" amount={data.share_capital_issued} />
             <EquityRow label="Total Comprehensive Income (Net Profit)" amount={data.net_profit_for_period} />
             <EquityRow label="Dividends / Drawings" amount={-data.dividends_drawings} />
             <EquityRow label={`Balance as at ${params.date_to}`} amount={data.closing_balance} isTotal />
          </div>

          <div className="mt-12 p-6 bg-muted/20 rounded-2xl border flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg border shadow-sm text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-tight">Financial Position Impact</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                The closing balance of {fmt(data.closing_balance)} represents the total claim of the owners against the assets of the business after all liabilities are settled.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
