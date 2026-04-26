import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { fetchBalanceSheet } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BSRow = {
  account_code: string
  account_name: string
  balance: number
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function BSSection({
  label,
  items,
  total,
}: {
  label: string
  items: BSRow[]
  total: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-2 py-1 bg-muted/20 rounded font-medium text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-b border-black/5 last:border-0">
              <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground w-20">
                {row.account_code}
              </td>
              <td className="px-2 py-1.5">{row.account_name}</td>
              <td className="px-2 py-1.5 text-right font-mono">{fmt(Math.abs(row.balance))}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-2 text-xs text-muted-foreground italic">
                No items in this category
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="font-semibold text-xs border-t">
          <tr>
            <td colSpan={2} className="px-2 py-1.5 text-right">Subtotal {label}</td>
            <td className="px-2 py-1.5 text-right font-mono">{fmt(Math.abs(total))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-bs', asOfDate],
    queryFn: () => fetchBalanceSheet({ as_of_date: asOfDate }).then((r) => r.data),
    enabled: submitted && !!asOfDate,
  })

  const assets = data?.assets
  const liabilities = data?.liabilities
  const equity = data?.equity
  const balanced = data?.is_balanced ?? false

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #bs-print-area { display: block !important; }
          #bs-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement of Financial Position</h1>
          <p className="text-sm text-muted-foreground">
            Balance Sheet as of a specific date (IAS 1 compliant)
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
      <div className="flex gap-4 items-end p-4 rounded-xl border bg-card shadow-sm print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase text-muted-foreground">As of Date</Label>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => { setAsOfDate(e.target.value); setSubmitted(false) }}
            className="w-48 h-9"
          />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!asOfDate} size="sm" className="h-9 px-6">
          Run Report
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 justify-center text-muted-foreground animate-pulse">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Preparing report...</span>
        </div>
      )}

      {submitted && !isLoading && !data && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed">
          <p className="text-sm text-muted-foreground font-medium">No financial data found for the selected date.</p>
        </div>
      )}

      {submitted && !isLoading && data && (
        <div id="bs-print-area" className="space-y-8 bg-card p-8 rounded-2xl border shadow-sm print:shadow-none print:border-0">
          <div className="text-center space-y-1 border-b pb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest">Statement of Financial Position</h2>
            <p className="text-sm text-muted-foreground font-medium">As of {asOfDate}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Assets Side */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold border-b-2 border-primary w-fit pr-4 pb-1">ASSETS</h3>
              
              <BSSection 
                label="Current Assets" 
                items={assets?.current ?? []} 
                total={assets?.current?.reduce((acc: number, curr: any) => acc + curr.balance, 0) ?? 0} 
              />
              
              <BSSection 
                label="Non-Current Assets" 
                items={assets?.non_current ?? []} 
                total={assets?.non_current?.reduce((acc: number, curr: any) => acc + curr.balance, 0) ?? 0} 
              />

              <div className="flex justify-between items-center p-3 bg-blue-50 text-blue-900 rounded-lg font-bold border border-blue-100">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-lg">{fmt(assets?.total ?? 0)}</span>
              </div>
            </div>

            {/* Liabilities & Equity Side */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-bold border-b-2 border-orange-500 w-fit pr-4 pb-1">LIABILITIES</h3>
                
                <BSSection 
                  label="Current Liabilities" 
                  items={liabilities?.current ?? []} 
                  total={liabilities?.current?.reduce((acc: number, curr: any) => acc + curr.balance, 0) ?? 0} 
                />
                
                <BSSection 
                  label="Non-Current Liabilities" 
                  items={liabilities?.non_current ?? []} 
                  total={liabilities?.non_current?.reduce((acc: number, curr: any) => acc + curr.balance, 0) ?? 0} 
                />

                <div className="flex justify-between items-center p-3 bg-orange-50 text-orange-900 rounded-lg font-bold border border-orange-100">
                  <span>TOTAL LIABILITIES</span>
                  <span className="font-mono text-lg">{fmt(liabilities?.total ?? 0)}</span>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold border-b-2 border-purple-500 w-fit pr-4 pb-1">EQUITY</h3>
                
                <BSSection 
                  label="Owner's Equity" 
                  items={equity?.items ?? []} 
                  total={equity?.items?.reduce((acc: number, curr: any) => acc + curr.balance, 0) ?? 0} 
                />

                <div className="flex justify-between items-center px-2 py-1.5 text-sm font-medium italic border-t border-dashed">
                   <span>Retained Earnings / Current Year Profit</span>
                   <span className="font-mono">{fmt(equity?.net_profit ?? 0)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-purple-50 text-purple-900 rounded-lg font-bold border border-purple-100">
                  <span>TOTAL EQUITY</span>
                  <span className="font-mono text-lg">{fmt(equity?.total ?? 0)}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-double border-muted">
                <div className={`flex justify-between items-center p-4 rounded-xl font-black ${balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span className="font-mono text-xl">{fmt((liabilities?.total ?? 0) + (equity?.total ?? 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {!balanced && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
              <span className="text-lg font-bold">⚠️</span>
              The statement does not balance. This may be due to unposted transactions or incorrect account mapping.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
