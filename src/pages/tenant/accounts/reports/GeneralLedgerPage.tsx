import React, { useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Info, X, ChevronRight, ChevronDown, ExternalLink, FileText } from 'lucide-react'
import { fetchAccounts, fetchGeneralLedger, type Account } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import AccountCombobox from '@/components/accounts/AccountCombobox'
import { ReportPagination } from '@/components/ReportPagination'
import { formatDate } from '@/utils/format'

type GLRow = {
  id?: string
  journal_voucher_id?: string
  voucher_number: string
  voucher_type?: string
  voucher_date: string
  reference?: string | null
  account_id?: string
  account_code?: string
  account_name?: string
  narration: string | null
  line_narration: string | null
  debit: number
  credit: number
  balance: number
  source_document?: {
    type: string
    type_label: string
    id: string | null
    number: string
    url: string | null
  } | null
  voucher_lines?: Array<{
    id: string
    account_id: string
    account_code?: string
    account_name?: string
    debit: number
    credit: number
    narration?: string | null
  }>
}

function fmt(n: number) {
  return (n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const VOUCHER_TYPE_LABELS: Record<string, string> = {
  general: 'Journal Entry',
  bank_payment: 'Bank Payment',
  cash_payment: 'Cash Payment',
  bank_receipt: 'Bank Receipt',
  cash_receipt: 'Cash Receipt',
  sale_invoice: 'Sales Invoice',
  purchase_invoice: 'Purchase Bill',
  purchase_debit_note: 'Debit Note',
  credit_note: 'Credit Note',
  goods_receipt: 'Goods Receipt',
}

export default function GeneralLedgerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const prefilledAccount = searchParams.get('account_id') ?? ''

  const navigateToDocument = (url: string) => {
    const currentPath = location.pathname + location.search
    const separator = url.includes('?') ? '&' : '?'
    const urlWithReturn = `${url}${separator}return_to=${encodeURIComponent(currentPath)}`
    navigate(urlWithReturn, { state: { returnTo: currentPath } })
  }

  const [params, setParams] = useState({
    account_id: prefilledAccount,
    date_from: searchParams.get('date_from') ?? '',
    date_to: searchParams.get('date_to') ?? '',
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => fetchAccounts({ per_page: -1 }).then((r) => r.data),
  })

  const accounts: Account[] = React.useMemo(() => {
    if (!accountsData) return []
    if (Array.isArray(accountsData)) return accountsData
    if (Array.isArray((accountsData as any).data)) return (accountsData as any).data
    return []
  }, [accountsData])

  const selectedAccount = accounts.find((a) => a.id === params.account_id)

  const { data, isLoading } = useQuery({
    queryKey: ['report-gl', params, page, perPage],
    queryFn: () =>
      fetchGeneralLedger({
        account_id: params.account_id || undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        page,
        per_page: perPage,
      }).then((r) => r.data),
  })

  const rows: GLRow[] = ((data as { data?: GLRow[] })?.data as GLRow[]) ?? []
  const totalItems: number = (data as { total?: number })?.total ?? rows.length
  const totalPages: number = (data as { last_page?: number })?.last_page ?? 1

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

  const handlePrint = () => {
    window.print()
  }

  const handleFilter = () => {
    setPage(1)
  }

  const handleClear = () => {
    setParams({ account_id: '', date_from: '', date_to: '' })
    setPage(1)
  }

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
            {selectedAccount
              ? `Posted transactions for ${selectedAccount.account_code} — ${selectedAccount.account_name}`
              : 'Complete ledger of posted transactions across all accounts'}
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
      <div className="flex flex-wrap gap-3 items-end p-4 rounded-lg border bg-muted/30 print:hidden">
        <div className="space-y-1 flex-1 min-w-64">
          <Label>Account</Label>
          <AccountCombobox
            accounts={accounts}
            value={params.account_id}
            onChange={(val) => {
              setParams((p) => ({ ...p, account_id: val }))
              setPage(1)
            }}
            allowAll
            placeholder="All Accounts"
            isLoading={isLoadingAccounts}
          />
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={params.date_from}
            onChange={(e) => {
              setParams((p) => ({ ...p, date_from: e.target.value }))
              setPage(1)
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={params.date_to}
            onChange={(e) => {
              setParams((p) => ({ ...p, date_to: e.target.value }))
              setPage(1)
            }}
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleFilter}>
            Filter
          </Button>
          {(params.account_id || params.date_from || params.date_to) && (
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

      {/* Opening balance notice when a specific account is filtered */}
      {selectedAccount && params.date_from && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>Running Balance</strong> for this account starts from the opening balance prior to {formatDate(params.date_from)}.
          </span>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading transactions…
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No posted transactions found matching the filter criteria.
        </div>
      )}

      {/* Report table — also used for printing */}
      {rows.length > 0 && (
        <div id="gl-print-area" className="space-y-3">
          {/* Print header (hidden on screen) */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">General Ledger</h2>
            <p className="text-sm">
              Account: {selectedAccount ? `${selectedAccount.account_code} — ${selectedAccount.account_name}` : 'All Accounts'}
            </p>
            {params.date_from && params.date_to && (
              <p className="text-sm">
                Period: {params.date_from} to {params.date_to}
              </p>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="w-8 px-2 py-2.5 print:hidden"></th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Voucher #
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Related Doc / Ref
                    </th>
                    {!params.account_id && (
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Account
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Narration
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {params.account_id ? 'Running Balance' : 'Net Movement'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const rowKey = row.id ?? `${row.voucher_number}-${i}`
                    const isExpanded = !!expandedRows[rowKey]
                    const hasLines = Array.isArray(row.voucher_lines) && row.voucher_lines.length > 0

                    return (
                      <React.Fragment key={rowKey}>
                        <tr className={`border-t hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}>
                          <td className="w-8 px-2 py-2.5 text-center print:hidden">
                            {hasLines ? (
                              <button
                                type="button"
                                onClick={() => toggleRow(rowKey)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={isExpanded ? 'Collapse transaction details' : 'Expand full transaction details'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              className="font-mono text-xs text-primary hover:underline font-semibold"
                              onClick={() => {
                                if (row.journal_voucher_id) {
                                  navigateToDocument(`/accounts/journal-vouchers/${row.journal_voucher_id}`)
                                } else {
                                  navigateToDocument(`/accounts/journal-vouchers?search=${row.voucher_number}`)
                                }
                              }}
                              title="View full Journal Voucher"
                            >
                              {row.voucher_number}
                            </button>
                            {row.voucher_type && (
                              <span className="block text-[10px] text-muted-foreground mt-0.5">
                                {VOUCHER_TYPE_LABELS[row.voucher_type] || row.voucher_type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm whitespace-nowrap">{formatDate(row.voucher_date)}</td>
                          <td className="px-3 py-2.5 text-sm">
                            {row.source_document ? (
                              <div>
                                {row.source_document.url ? (
                                  <button
                                    type="button"
                                    onClick={() => navigateToDocument(row.source_document!.url!)}
                                    className="font-mono text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
                                    title={`View ${row.source_document.type_label}`}
                                  >
                                    <span>{row.source_document.number}</span>
                                    <ExternalLink className="h-3 w-3 opacity-70 shrink-0" />
                                  </button>
                                ) : (
                                  <span className="font-mono text-xs font-medium text-foreground">
                                    {row.source_document.number}
                                  </span>
                                )}
                                <span className="block text-[10px] text-muted-foreground">
                                  {row.source_document.type_label}
                                </span>
                              </div>
                            ) : row.reference ? (
                              <span className="font-mono text-xs text-muted-foreground font-medium">
                                {row.reference}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          {!params.account_id && (
                            <td className="px-3 py-2.5 text-sm">
                              <span className="font-mono text-xs text-muted-foreground mr-1.5">
                                {row.account_code}
                              </span>
                              <span className="font-medium">{row.account_name}</span>
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-muted-foreground text-sm max-w-xs">
                            <div>{row.narration ?? '—'}</div>
                            {row.line_narration && row.line_narration !== row.narration && (
                              <div className="text-xs text-muted-foreground/70 mt-0.5">
                                {row.line_narration}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">
                            {row.debit > 0 ? fmt(row.debit) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">
                            {row.credit > 0 ? fmt(row.credit) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono text-sm font-medium ${row.balance < 0 ? 'text-red-600' : 'text-foreground'}`}>
                            {fmt(Math.abs(row.balance))}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              {row.balance < 0 ? 'Cr' : 'Dr'}
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Transaction Details panel */}
                        {isExpanded && (
                          <tr className="bg-muted/10 border-t border-b print:hidden">
                            <td colSpan={params.account_id ? 8 : 9} className="px-6 py-4">
                              <div className="space-y-3 rounded-lg border bg-card p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-primary shrink-0" />
                                    <div>
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Transaction Details: {row.voucher_number}
                                      </h4>
                                      <p className="text-[11px] text-muted-foreground">
                                        Date: {formatDate(row.voucher_date)} · Type:{' '}
                                        {row.voucher_type
                                          ? VOUCHER_TYPE_LABELS[row.voucher_type] || row.voucher_type.replace(/_/g, ' ')
                                          : 'General Journal'}
                                        {row.reference ? ` · Reference: ${row.reference}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {row.source_document?.url && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => navigateToDocument(row.source_document!.url!)}
                                      >
                                        <span>View {row.source_document.type_label}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {row.journal_voucher_id && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => navigateToDocument(`/accounts/journal-vouchers/${row.journal_voucher_id}`)}
                                      >
                                        <span>Open Journal Voucher</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {row.narration && (
                                  <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
                                    <span className="font-semibold text-foreground">Narration: </span>
                                    {row.narration}
                                  </div>
                                )}

                                {/* Complete lines table for this JV */}
                                {hasLines && (
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                      All Journal Voucher Lines
                                    </span>
                                    <div className="rounded-md border overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                          <tr>
                                            <th className="px-3 py-1.5 text-left font-medium">Account</th>
                                            <th className="px-3 py-1.5 text-left font-medium">Line Narration</th>
                                            <th className="px-3 py-1.5 text-right font-medium">Debit</th>
                                            <th className="px-3 py-1.5 text-right font-medium">Credit</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                          {row.voucher_lines!.map((vl, idx) => {
                                            const isCurrentAccount =
                                              params.account_id && String(vl.account_id) === String(params.account_id)

                                            return (
                                              <tr
                                                key={vl.id || idx}
                                                className={isCurrentAccount ? 'bg-primary/5 font-medium' : 'hover:bg-muted/20'}
                                              >
                                                <td className="px-3 py-1.5">
                                                  <span className="font-mono text-primary font-bold mr-1.5">
                                                    {vl.account_code}
                                                  </span>
                                                  <span>{vl.account_name}</span>
                                                  {isCurrentAccount && (
                                                    <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">
                                                      Current
                                                    </Badge>
                                                  )}
                                                </td>
                                                <td className="px-3 py-1.5 text-muted-foreground">
                                                  {vl.narration ?? '—'}
                                                </td>
                                                <td className="px-3 py-1.5 text-right font-mono">
                                                  {vl.debit > 0 ? fmt(vl.debit) : '—'}
                                                </td>
                                                <td className="px-3 py-1.5 text-right font-mono">
                                                  {vl.credit > 0 ? fmt(vl.credit) : '—'}
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                        <tfoot className="bg-muted/30 font-semibold border-t">
                                          <tr>
                                            <td colSpan={2} className="px-3 py-1.5 text-right">
                                              Total
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono">
                                              {fmt(row.voucher_lines!.reduce((s, l) => s + l.debit, 0))}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono">
                                              {fmt(row.voucher_lines!.reduce((s, l) => s + l.credit, 0))}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
                <tfoot className="bg-muted/40 border-t-2 font-semibold">
                  <tr>
                    <td className="print:hidden"></td>
                    <td colSpan={params.account_id ? 4 : 5} className="px-3 py-2.5 text-right text-sm">
                      Page Totals
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(totalDebit)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(totalCredit)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">
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
        </div>
      )}
    </div>
  )
}
