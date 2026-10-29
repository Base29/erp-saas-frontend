import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { fetchSuppliers, fetchSupplierStatement, type SupplierStatementRow } from '@/api/tenant'
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

function fmt(n: number) {
  return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Purchase Invoice',
  payment: 'Supplier Payment',
}

const TYPE_COLORS: Record<string, string> = {
  invoice: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
}

export default function SupplierStatementPage() {
  const [searchParams] = useSearchParams()
  const initialSupplierId = searchParams.get('supplier_id') || ''

  const today = new Date().toISOString().split('T')[0]
  const startOfYear = `${new Date().getFullYear()}-01-01`

  const [params, setParams] = useState({
    supplier_id: initialSupplierId,
    date_from: startOfYear,
    date_to: today,
  })
  const [submitted, setSubmitted] = useState(!!initialSupplierId)

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-all'],
    queryFn: () => fetchSuppliers({ per_page: 500 }).then((r) => r.data.data),
  })

  const suppliers = suppliersData ?? []
  const selectedSupplier = suppliers.find((s) => s.id === params.supplier_id)

  useEffect(() => {
    if (initialSupplierId) {
      setParams((p) => ({ ...p, supplier_id: initialSupplierId }))
      setSubmitted(true)
    }
  }, [initialSupplierId])

  const { data, isLoading } = useQuery({
    queryKey: ['report-supplier-statement', params],
    queryFn: () =>
      fetchSupplierStatement({
        supplier_id: params.supplier_id,
        date_from: params.date_from,
        date_to: params.date_to,
      }).then((r) => r.data),
    enabled: submitted && !!params.supplier_id && !!params.date_from && !!params.date_to,
  })

  const rows: SupplierStatementRow[] = data?.rows ?? []
  const openingBalance: number = data?.opening_balance ?? 0
  const totalDebit: number = data?.total_debit ?? 0
  const totalCredit: number = data?.total_credit ?? 0
  const closingBalance: number = data?.closing_balance ?? 0

  const canRun = !!params.supplier_id && !!params.date_from && !!params.date_to

  return (
    <div className="p-6 space-y-5">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #supplier-stmt-print-area { display: block !important; }
          #supplier-stmt-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Supplier Statement & Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Complete transaction ledger of purchase bills and payments for vendor accounts.
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
        <div className="space-y-1 flex-1 min-w-56">
          <Label>Supplier</Label>
          <Select
            value={params.supplier_id}
            onValueChange={(v) => {
              setParams((p) => ({ ...p, supplier_id: v }))
              setSubmitted(false)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier…" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.supplier_code})
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
            onChange={(e) => {
              setParams((p) => ({ ...p, date_from: e.target.value }))
              setSubmitted(false)
            }}
            className="w-36"
          />
        </div>

        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={params.date_to}
            onChange={(e) => {
              setParams((p) => ({ ...p, date_to: e.target.value }))
              setSubmitted(false)
            }}
            className="w-36"
          />
        </div>

        <Button
          size="sm"
          disabled={!canRun || isLoading}
          onClick={() => setSubmitted(true)}
        >
          {isLoading ? 'Loading…' : 'Generate Ledger'}
        </Button>

        {submitted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSubmitted(false)
              setParams({ supplier_id: '', date_from: startOfYear, date_to: today })
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Report area */}
      {submitted && (
        <div id="supplier-stmt-print-area" className="space-y-4">
          {isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading supplier ledger transactions…
            </div>
          )}

          {!isLoading && selectedSupplier && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="border rounded-lg p-3 bg-muted/10">
                  <span className="text-xs text-muted-foreground block">Opening Balance</span>
                  <span className="font-mono text-lg font-semibold">${fmt(openingBalance)}</span>
                </div>
                <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                  <span className="text-xs text-blue-700 dark:text-blue-300 block">Total Invoiced (Credit)</span>
                  <span className="font-mono text-lg font-semibold text-blue-700 dark:text-blue-300">
                    +${fmt(totalCredit)}
                  </span>
                </div>
                <div className="border rounded-lg p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 block">Total Paid (Debit)</span>
                  <span className="font-mono text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    -${fmt(totalDebit)}
                  </span>
                </div>
                <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
                  <span className="text-xs text-primary font-medium block">Current Balance Owed</span>
                  <span className="font-mono text-lg font-bold text-primary">${fmt(closingBalance)}</span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Date</th>
                      <th className="py-2.5 px-3 text-left">Type</th>
                      <th className="py-2.5 px-3 text-left">Reference #</th>
                      <th className="py-2.5 px-3 text-right">Debit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Invoiced)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Opening balance row */}
                    <tr className="bg-muted/10 text-muted-foreground italic">
                      <td className="py-2 px-3">{formatDate(params.date_from)}</td>
                      <td className="py-2 px-3">Opening Balance</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3 text-right font-mono">—</td>
                      <td className="py-2 px-3 text-right font-mono">—</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">${fmt(openingBalance)}</td>
                    </tr>

                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          No transactions found for this supplier within the selected date range.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="py-2 px-3 text-muted-foreground">{formatDate(r.date)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[r.type] || 'bg-muted'}`}>
                              {TYPE_LABELS[r.type] || r.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-foreground">{r.reference}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {r.debit > 0 ? `$${fmt(r.debit)}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {r.credit > 0 ? `$${fmt(r.credit)}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">
                            ${fmt(r.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot className="bg-muted/30 font-semibold border-t">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3">Closing Balance</td>
                        <td className="py-2.5 px-3 text-right font-mono">${fmt(totalDebit)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">${fmt(totalCredit)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-primary text-sm">${fmt(closingBalance)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
