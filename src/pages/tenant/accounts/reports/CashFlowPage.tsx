import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react'
import { fetchCashFlow } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CFRow({ label, amount, isSubtotal = false, isIndent = false }: { label: string, amount: number, isSubtotal?: boolean, isIndent?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${isSubtotal ? 'font-bold border-t border-muted mt-2 pt-2' : 'text-sm'} ${isIndent ? 'pl-6 text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{fmt(amount)}</span>
    </div>
  )
}

export default function CashFlowPage() {
  const [params, setParams] = useState({ date_from: '', date_to: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-cf', params],
    queryFn: () => fetchCashFlow(params).then((r) => r.data),
    enabled: submitted && !!params.date_from && !!params.date_to,
  })

  const canRun = !!params.date_from && !!params.date_to

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cf-print-area { display: block !important; }
          #cf-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement of Cash Flows</h1>
          <p className="text-sm text-muted-foreground">
            Indirect Method (IAS 7 compliant)
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
          <span className="text-sm font-medium">Reconciling cash flows...</span>
        </div>
      )}

      {submitted && !isLoading && !data && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed">
          <p className="text-sm text-muted-foreground font-medium">No cash flow data available for the selected period.</p>
        </div>
      )}

      {submitted && !isLoading && data && (
        <div id="cf-print-area" className="bg-card p-10 rounded-2xl border shadow-sm print:shadow-none print:border-0 space-y-10">
          <div className="text-center space-y-1 border-b pb-8">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Statement of Cash Flows</h2>
            <p className="text-sm text-muted-foreground font-medium">For the period {params.date_from} to {params.date_to}</p>
          </div>

          <div className="space-y-8">
            {/* Operating Activities */}
            <div className="space-y-2">
              <h3 className="font-bold border-b pb-2 text-sm uppercase tracking-wider">Cash flows from operating activities</h3>
              <CFRow label="Net Profit for the Period" amount={data.operating_activities.net_profit} />
              <CFRow label="Adjustments for non-cash items:" amount={0} />
              <CFRow label="Depreciation & Amortization" amount={data.operating_activities.depreciation_adj} isIndent />
              
              <CFRow label="Changes in Working Capital:" amount={0} />
              <CFRow label="(Increase)/Decrease in Accounts Receivable" amount={data.operating_activities.ar_change} isIndent />
              <CFRow label="(Increase)/Decrease in Inventory" amount={data.operating_activities.inventory_change} isIndent />
              <CFRow label="Increase/(Decrease) in Accounts Payable" amount={data.operating_activities.ap_change} isIndent />
              
              <CFRow label="Net cash from operating activities" amount={data.operating_activities.net_operating_cash} isSubtotal />
            </div>

            {/* Investing Activities */}
            <div className="space-y-2">
              <h3 className="font-bold border-b pb-2 text-sm uppercase tracking-wider">Cash flows from investing activities</h3>
              <CFRow label="Purchase/Sale of Property, Plant & Equipment" amount={data.investing_activities.ppe_movements} />
              <CFRow label="Net cash from investing activities" amount={data.investing_activities.net_investing_cash} isSubtotal />
            </div>

            {/* Financing Activities */}
            <div className="space-y-2">
              <h3 className="font-bold border-b pb-2 text-sm uppercase tracking-wider">Cash flows from financing activities</h3>
              <CFRow label="Proceeds/Repayment of Loans" amount={data.financing_activities.loan_movements} />
              <CFRow label="Net cash from financing activities" amount={data.financing_activities.net_financing_cash} isSubtotal />
            </div>

            {/* Net Change */}
            <div className={`mt-8 p-6 rounded-2xl border ${data.net_cash_increase >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-full ${data.net_cash_increase >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    <RefreshCcw className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className={`text-xl font-black uppercase tracking-tight ${data.net_cash_increase >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                      Net Increase in Cash
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Reconciled</p>
                  </div>
                </div>
                <div className={`text-3xl font-black font-mono ${data.net_cash_increase >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {fmt(data.net_cash_increase)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
