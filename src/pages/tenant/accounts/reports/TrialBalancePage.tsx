import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, ArrowRight, X } from 'lucide-react'
import { fetchFiscalPeriods, fetchTrialBalance } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReportPagination } from '@/components/ReportPagination'

type TBRow = {
  account_id: string
  account_code: string
  account_name: string
  total_debit: number
  total_credit: number
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TrialBalancePage() {
  const navigate = useNavigate()
  const [periodId, setPeriodId] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const { data: periods = [] } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods({ per_page: 100 }).then((r) => r.data.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report-tb', periodId],
    queryFn: () => fetchTrialBalance({ fiscal_period_id: periodId || undefined }).then((r) => r.data),
  })

  const rows: TBRow[] = (data as { rows?: TBRow[] })?.rows ?? []
  const grandDebit: number = (data as { grand_debit?: number })?.grand_debit ?? 0
  const grandCredit: number = (data as { grand_credit?: number })?.grand_credit ?? 0
  const balanced: boolean = (data as { balanced?: boolean })?.balanced ?? false

  const selectedPeriod = periods.find((p) => p.id === periodId)

  // Client-side pagination over accounts
  const totalItems = rows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const paginatedRows = rows.slice((page - 1) * perPage, page * perPage)

  const handleDrillDown = (row: TBRow) => {
    if (selectedPeriod) {
      navigate(
        `/accounts/reports/general-ledger?account_id=${row.account_id}&date_from=${selectedPeriod.start_date}&date_to=${selectedPeriod.end_date}`
      )
    } else {
      navigate(`/accounts/reports/general-ledger?account_id=${row.account_id}`)
    }
  }

  const handleClear = () => {
    setPeriodId('')
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #tb-print-area { display: block !important; }
          #tb-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">
            {selectedPeriod
              ? `Debit and credit totals per account for ${selectedPeriod.name}`
              : 'Cumulative debit and credit totals per account across all periods'}
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
      <div className="flex flex-wrap gap-3 items-end p-4 rounded-lg border bg-muted/30 print:hidden">
        <div className="space-y-1 flex-1 min-w-52">
          <Label>Fiscal Period</Label>
          <Select
            value={periodId || 'all'}
            onValueChange={(v) => {
              setPeriodId(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Periods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods (Cumulative)</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">({p.status})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {periodId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No posted transactions found for the selected filter.
        </div>
      )}

      {rows.length > 0 && (
        <div id="tb-print-area" className="space-y-3">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">Trial Balance</h2>
            <p className="text-sm">Period: {selectedPeriod ? selectedPeriod.name : 'All Periods (Cumulative)'}</p>
          </div>

          {/* Balance indicator */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${balanced ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span className="text-base">{balanced ? '✓' : '✗'}</span>
            {balanced
              ? 'Trial Balance is in balance — total debits equal total credits.'
              : `Trial Balance is OUT OF BALANCE by ${fmt(Math.abs(grandDebit - grandCredit))}.`}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider w-32">
                    Code
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider w-36">
                    Debit
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider w-36">
                    Credit
                  </th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider w-16 print:hidden">
                    GL
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr key={row.account_id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.account_code}</td>
                    <td className="px-4 py-2.5 font-medium">{row.account_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.total_debit > 0 ? fmt(row.total_debit) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.total_credit > 0 ? fmt(row.total_credit) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center print:hidden">
                      <button
                        onClick={() => handleDrillDown(row)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                        title="View in General Ledger"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t-2 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 text-right text-sm">
                    Grand Totals
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">{fmt(grandDebit)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">{fmt(grandCredit)}</td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination controls */}
          <ReportPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            perPage={perPage}
            onPageChange={(p) => setPage(p)}
            onPerPageChange={(pp) => {
              setPerPage(pp)
              setPage(1)
            }}
          />

          <p className="text-xs text-muted-foreground mt-2 print:hidden">
            Tip: Click the <ArrowRight className="inline h-3 w-3" /> icon on any row to drill down into the General Ledger for that account.
          </p>
        </div>
      )}
    </div>
  )
}
