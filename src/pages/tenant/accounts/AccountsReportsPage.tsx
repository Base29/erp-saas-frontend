import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchAccounts,
  fetchFiscalPeriods,
  fetchCustomers,
  fetchGeneralLedger,
  fetchTrialBalance,
  fetchProfitAndLoss,
  fetchBalanceSheet,
  fetchCustomerStatement,
} from '@/api/tenant'
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

type Tab = 'gl' | 'tb' | 'pl' | 'bs' | 'cs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'gl', label: 'General Ledger' },
  { id: 'tb', label: 'Trial Balance' },
  { id: 'pl', label: 'Profit & Loss' },
  { id: 'bs', label: 'Balance Sheet' },
  { id: 'cs', label: 'Customer Statement' },
]

export default function AccountsReportsPage() {
  const [tab, setTab] = useState<Tab>('gl')

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">All reports computed from posted transactions</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === 'gl' && <GeneralLedgerReport />}
        {tab === 'tb' && <TrialBalanceReport />}
        {tab === 'pl' && <ProfitAndLossReport />}
        {tab === 'bs' && <BalanceSheetReport />}
        {tab === 'cs' && <CustomerStatementReport />}
      </div>
    </div>
  )
}

// ── General Ledger ────────────────────────────────────────────────────────────

function GeneralLedgerReport() {
  const [params, setParams] = useState({ account_id: '', date_from: '', date_to: '', page: 1 })
  const [submitted, setSubmitted] = useState(false)

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report-gl', params],
    queryFn: () =>
      fetchGeneralLedger({
        account_id: Number(params.account_id),
        date_from: params.date_from,
        date_to: params.date_to,
        page: params.page,
      }).then((r) => r.data),
    enabled: submitted && !!params.account_id && !!params.date_from && !!params.date_to,
  })

  const rows: Array<{ voucher_number: string; voucher_date: string; narration: string; debit: number; credit: number; balance: number }> =
    ((data as { data?: unknown })?.data as Array<{ voucher_number: string; voucher_date: string; narration: string; debit: number; credit: number; balance: number }>) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Account</Label>
          <Select value={params.account_id} onValueChange={(v) => setParams((p) => ({ ...p, account_id: v }))}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select account…" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.account_code} — {a.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={params.date_from} onChange={(e) => setParams((p) => ({ ...p, date_from: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={params.date_to} onChange={(e) => setParams((p) => ({ ...p, date_to: e.target.value }))} />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!params.account_id || !params.date_from || !params.date_to}>
          Run Report
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {submitted && !isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No transactions found for the selected criteria.</p>
      )}

      {rows.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Voucher #</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Narration</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Credit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{row.voucher_number}</td>
                  <td className="px-4 py-2">{row.voucher_date}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.narration ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {row.debit > 0 ? fmt(row.debit) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {row.credit > 0 ? fmt(row.credit) : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono font-medium ${row.balance < 0 ? 'text-destructive' : ''}`}>
                    {fmt(Math.abs(row.balance))} {row.balance < 0 ? 'Cr' : 'Dr'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Trial Balance ─────────────────────────────────────────────────────────────

function TrialBalanceReport() {
  const [periodId, setPeriodId] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: periods = [] } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report-tb', periodId],
    queryFn: () => fetchTrialBalance({ fiscal_period_id: Number(periodId) }).then((r) => r.data),
    enabled: submitted && !!periodId,
  })

  type TBRow = { account_id: number; account_code: string; account_name: string; total_debit: number; total_credit: number }
  const rows: TBRow[] = (data as { rows?: TBRow[] })?.rows ?? []
  const grandDebit: number = (data as { grand_debit?: number })?.grand_debit ?? 0
  const grandCredit: number = (data as { grand_credit?: number })?.grand_credit ?? 0
  const balanced: boolean = (data as { balanced?: boolean })?.balanced ?? false

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Fiscal Period</Label>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select period…" /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!periodId}>Run Report</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {rows.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Account</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.account_id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{row.account_code}</td>
                  <td className="px-4 py-2">{row.account_name}</td>
                  <td className="px-4 py-2 text-right font-mono">{row.total_debit > 0 ? fmt(row.total_debit) : '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">{row.total_credit > 0 ? fmt(row.total_credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-2 text-right">Grand Total</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(grandDebit)}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(grandCredit)}</td>
              </tr>
            </tfoot>
          </table>
          <div className={`px-4 py-2 text-xs ${balanced ? 'text-green-600' : 'text-destructive'}`}>
            {balanced ? '✓ Balanced' : '✗ Not balanced — difference: ' + fmt(Math.abs(grandDebit - grandCredit))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profit & Loss ─────────────────────────────────────────────────────────────

function ProfitAndLossReport() {
  const [params, setParams] = useState({ date_from: '', date_to: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-pl', params],
    queryFn: () => fetchProfitAndLoss(params).then((r) => r.data),
    enabled: submitted && !!params.date_from && !!params.date_to,
  })

  type PLRow = { group_name: string; account_code: string; account_name: string; net_amount: number }
  const rows: PLRow[] = (data as { rows?: PLRow[] })?.rows ?? []
  const revenue: number = (data as { revenue?: number })?.revenue ?? 0
  const expenses: number = (data as { expenses?: number })?.expenses ?? 0
  const netProfit: number = (data as { net_profit?: number })?.net_profit ?? 0

  const revenueRows = rows.filter((r) => r.group_name === 'Revenue')
  const expenseRows = rows.filter((r) => r.group_name === 'Expenses')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={params.date_from} onChange={(e) => setParams((p) => ({ ...p, date_from: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={params.date_to} onChange={(e) => setParams((p) => ({ ...p, date_to: e.target.value }))} />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!params.date_from || !params.date_to}>Run Report</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {submitted && !isLoading && rows.length > 0 && (
        <div className="space-y-4">
          <PLSection title="Revenue" rows={revenueRows} total={revenue} />
          <PLSection title="Expenses" rows={expenseRows} total={expenses} />
          <div className={`rounded-md px-4 py-3 font-semibold flex justify-between ${netProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
            <span className="font-mono">{fmt(Math.abs(netProfit))}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PLSection({ title, rows, total }: { title: string; rows: Array<{ account_code: string; account_name: string; net_amount: number }>; total: number }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 font-semibold text-sm">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2 font-mono text-xs">{row.account_code}</td>
              <td className="px-4 py-2">{row.account_name}</td>
              <td className="px-4 py-2 text-right font-mono">{fmt(Math.abs(row.net_amount))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted/30 border-t font-semibold">
          <tr>
            <td colSpan={2} className="px-4 py-2 text-right">Total {title}</td>
            <td className="px-4 py-2 text-right font-mono">{fmt(Math.abs(total))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

function BalanceSheetReport() {
  const [asOfDate, setAsOfDate] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-bs', asOfDate],
    queryFn: () => fetchBalanceSheet({ as_of_date: asOfDate }).then((r) => r.data),
    enabled: submitted && !!asOfDate,
  })

  type BSRow = { group_name: string; account_code: string; account_name: string; balance: number }
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>As of Date</Label>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!asOfDate}>Run Report</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {submitted && !isLoading && rows.length > 0 && (
        <div className="space-y-4">
          {sections.map(({ key, label }) => {
            const sectionRows = rows.filter((r) => r.group_name === key)
            return (
              <div key={key} className="rounded-md border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-semibold text-sm">{label}</div>
                <table className="w-full text-sm">
                  <tbody>
                    {sectionRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{row.account_code}</td>
                        <td className="px-4 py-2">{row.account_name}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(Math.abs(row.balance))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t font-semibold">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-right">Total {label}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(Math.abs(totals[key]))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          })}
          <div className={`rounded-md px-4 py-2 text-xs ${balanced ? 'text-green-600' : 'text-destructive'}`}>
            {balanced
              ? `✓ Balanced — Assets (${fmt(assets)}) = Liabilities (${fmt(liabilities)}) + Equity (${fmt(equity)})`
              : '✗ Balance sheet does not balance'}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Customer Statement ────────────────────────────────────────────────────────

function CustomerStatementReport() {
  const [params, setParams] = useState({ customer_id: '', date_from: '', date_to: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => fetchCustomers().then((r) => r.data.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report-cs', params],
    queryFn: () =>
      fetchCustomerStatement({
        customer_id: Number(params.customer_id),
        date_from: params.date_from,
        date_to: params.date_to,
      }).then((r) => r.data),
    enabled: submitted && !!params.customer_id && !!params.date_from && !!params.date_to,
  })

  type CSRow = { type: string; reference: string; date: string; debit: number; credit: number; balance: number }
  const rows: CSRow[] = (data as { rows?: CSRow[] })?.rows ?? []
  const closingBalance: number = (data as { closing_balance?: number })?.closing_balance ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Customer</Label>
          <Select value={params.customer_id} onValueChange={(v) => setParams((p) => ({ ...p, customer_id: v }))}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={params.date_from} onChange={(e) => setParams((p) => ({ ...p, date_from: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={params.date_to} onChange={(e) => setParams((p) => ({ ...p, date_to: e.target.value }))} />
        </div>
        <Button
          onClick={() => setSubmitted(true)}
          disabled={!params.customer_id || !params.date_from || !params.date_to}
        >
          Run Report
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {submitted && !isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No transactions found.</p>
      )}

      {rows.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Reference</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Credit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 capitalize">{row.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.reference}</td>
                  <td className="px-4 py-2">{row.date}</td>
                  <td className="px-4 py-2 text-right font-mono">{row.debit > 0 ? fmt(row.debit) : '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">{row.credit > 0 ? fmt(row.credit) : '—'}</td>
                  <td className={`px-4 py-2 text-right font-mono font-medium ${row.balance < 0 ? 'text-destructive' : ''}`}>
                    {fmt(Math.abs(row.balance))} {row.balance < 0 ? 'Cr' : 'Dr'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t font-semibold">
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right">Closing Balance</td>
                <td className={`px-4 py-2 text-right font-mono ${closingBalance < 0 ? 'text-destructive' : ''}`}>
                  {fmt(Math.abs(closingBalance))} {closingBalance < 0 ? 'Cr' : 'Dr'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
