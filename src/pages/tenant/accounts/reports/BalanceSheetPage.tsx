import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { fetchBalanceSheet } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BSRow = {
  group_name: string
  account_code: string
  account_name: string
  balance: number
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const SECTION_COLORS: Record<string, { bg: string; border: string; header: string }> = {
  Assets:      { bg: 'bg-blue-50',   border: 'border-blue-200',   header: 'bg-blue-100 text-blue-800' },
  Liabilities: { bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-orange-100 text-orange-800' },
  Equity:      { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100 text-purple-800' },
}

function BSSection({
  label,
  rows,
  total,
}: {
  label: string
  rows: BSRow[]
  total: number
}) {
  const colors = SECTION_COLORS[label] ?? { bg: 'bg-muted/30', border: 'border', header: 'bg-muted/60 text-foreground' }

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
      <div className={`px-4 py-2.5 font-semibold text-sm uppercase tracking-wider ${colors.header}`}>
        {label}
      </div>
      <table className="w-full text-sm">
        <tbody className={colors.bg}>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-black/5 hover:brightness-95 transition-all">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground w-20">
                {row.account_code}
              </td>
              <td className="px-4 py-2">{row.account_name}</td>
              <td className="px-4 py-2 text-right font-mono">{fmt(Math.abs(row.balance))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-3 text-sm text-muted-foreground text-center">
                No {label.toLowerCase()} accounts with a balance
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="border-t border-black/10 font-semibold bg-white/50">
          <tr>
            <td colSpan={2} className="px-4 py-2.5 text-right text-sm">
              Total {label}
            </td>
            <td className="px-4 py-2.5 text-right font-mono">{fmt(Math.abs(total))}</td>
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

  const rows: BSRow[] = (data as { rows?: BSRow[] })?.rows ?? []
  const assets: number = (data as { assets?: number })?.assets ?? 0
  const liabilities: number = (data as { liabilities?: number })?.liabilities ?? 0
  const equity: number = (data as { equity?: number })?.equity ?? 0
  const balanced: boolean = (data as { balanced?: boolean })?.balanced ?? false

  const sections: Array<{ key: string; label: string }> = [
    { key: 'Assets', label: 'Assets' },
    { key: 'Liabilities', label: 'Liabilities' },
    { key: 'Equity', label: 'Equity' },
  ]

  const totals: Record<string, number> = { Assets: assets, Liabilities: liabilities, Equity: equity }

  return (
    <div className="p-6 space-y-5">
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
          <h1 className="text-xl font-semibold">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">
            Asset, Liability, and Equity balances as of a specific date
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
          <Label>As of Date</Label>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => { setAsOfDate(e.target.value); setSubmitted(false) }}
            className="w-44"
          />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!asOfDate}>
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
          No posted transactions found as of the selected date.
        </div>
      )}

      {submitted && !isLoading && rows.length > 0 && (
        <div id="bs-print-area" className="space-y-4">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">Balance Sheet</h2>
            <p className="text-sm">As of: {asOfDate}</p>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-4 print:hidden">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">Total Assets</p>
              <p className="text-xl font-bold font-mono text-blue-700">{fmt(assets)}</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 mb-1">Total Liabilities</p>
              <p className="text-xl font-bold font-mono text-orange-700">{fmt(liabilities)}</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-1">Total Equity</p>
              <p className="text-xl font-bold font-mono text-purple-700">{fmt(equity)}</p>
            </div>
          </div>

          {sections.map(({ key, label }) => (
            <BSSection
              key={key}
              label={label}
              rows={rows.filter((r) => r.group_name === key)}
              total={totals[key]}
            />
          ))}

          {/* Balance check */}
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
              balanced
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="text-base">{balanced ? '✓' : '✗'}</span>
            {balanced
              ? `Balanced — Assets (${fmt(assets)}) = Liabilities (${fmt(liabilities)}) + Equity (${fmt(equity)})`
              : 'Balance sheet does not balance — check for unposted or missing entries'}
          </div>
        </div>
      )}
    </div>
  )
}
