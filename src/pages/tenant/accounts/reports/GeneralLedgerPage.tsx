import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Info } from 'lucide-react'
import { fetchAccounts, fetchGeneralLedger } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/utils/format'

type GLRow = {
  voucher_number: string
  voucher_date: string
  narration: string | null
  line_narration: string | null
  debit: number
  credit: number
  balance: number
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GeneralLedgerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledAccount = searchParams.get('account_id') ?? ''

  const [params, setParams] = useState({
    account_id: prefilledAccount,
    date_from: '',
    date_to: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => fetchAccounts({ per_page: 500 }).then((r) => r.data.data),
  })

  const selectedAccount = accounts.find((a) => a.id === params.account_id)

  const { data, isLoading } = useQuery({
    queryKey: ['report-gl', params],
    queryFn: () =>
      fetchGeneralLedger({
        account_id: params.account_id,
        date_from: params.date_from,
        date_to: params.date_to,
      }).then((r) => r.data),
    enabled: submitted && !!params.account_id && !!params.date_from && !!params.date_to,
  })

  const rows: GLRow[] = ((data as { data?: GLRow[] })?.data as GLRow[]) ?? []

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

  const handlePrint = () => {
    window.print()
  }

  const canRun = !!params.account_id && !!params.date_from && !!params.date_to

  return (
    <div className="p-6 space-y-5">
      {/* Print styles injected globally */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #gl-print-area { display: block !important; }
          #gl-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">General Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Posted transactions for a single account within a date range
          </p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print / PDF
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end p-4 rounded-lg border bg-muted/30">
        <div className="space-y-1 flex-1 min-w-52">
          <Label>Account</Label>
          <Select
            value={params.account_id}
            onValueChange={(v) => { setParams((p) => ({ ...p, account_id: v })); setSubmitted(false) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account…" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.account_code} — {a.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* Opening balance notice */}
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <strong>Running Balance</strong> reflects movement <em>within the selected date range</em> only
          (starts at 0 from the first transaction). It does not include pre-period opening balances.
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading transactions…
        </div>
      )}

      {submitted && !isLoading && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No posted transactions found for the selected account and date range.
        </div>
      )}

      {/* Report table — also used for printing */}
      {rows.length > 0 && (
        <div id="gl-print-area">
          {/* Print header (hidden on screen) */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">General Ledger</h2>
            <p className="text-sm">
              Account: {selectedAccount?.account_code} — {selectedAccount?.account_name}
            </p>
            <p className="text-sm">
              Period: {params.date_from} to {params.date_to}
            </p>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Voucher #
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Narration
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <button
                          className="font-mono text-xs text-primary hover:underline"
                          onClick={() => {
                            // Find voucher by number isn't straightforward without the id,
                            // so navigate to vouchers list filtered by number
                            navigate(`/accounts/journal-vouchers?search=${row.voucher_number}`)
                          }}
                        >
                          {row.voucher_number}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-sm">{formatDate(row.voucher_date)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-sm max-w-xs">
                        <div>{row.narration ?? '—'}</div>
                        {row.line_narration && row.line_narration !== row.narration && (
                          <div className="text-xs text-muted-foreground/70 mt-0.5">
                            {row.line_narration}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {row.debit > 0 ? fmt(row.debit) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {row.credit > 0 ? fmt(row.credit) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${row.balance < 0 ? 'text-red-600' : 'text-foreground'}`}>
                        {fmt(Math.abs(row.balance))}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {row.balance < 0 ? 'Cr' : 'Dr'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/40 border-t-2 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right text-sm">
                      Totals
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">{fmt(totalDebit)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">{fmt(totalCredit)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {fmt(Math.abs(totalDebit - totalCredit))}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {totalDebit >= totalCredit ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {rows.length} transaction{rows.length !== 1 ? 's' : ''} · Total rows shown (paginated 10 per page — run with tighter date range to see all)
          </p>
        </div>
      )}
    </div>
  )
}
