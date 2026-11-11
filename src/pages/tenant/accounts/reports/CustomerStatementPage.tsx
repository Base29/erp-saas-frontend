import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, X } from 'lucide-react'
import { fetchCustomers, fetchCustomerStatement } from '@/api/tenant'
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
import { ReportPagination } from '@/components/ReportPagination'
import { formatDate } from '@/utils/format'

type CSRow = {
  type: string
  reference: string
  date: string
  debit: number
  credit: number
  balance: number
  customer_id?: string
  customer_name?: string
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  credit_note: 'Credit Note',
}

const TYPE_COLORS: Record<string, string> = {
  invoice:     'bg-blue-100 text-blue-700',
  receipt:     'bg-green-100 text-green-700',
  credit_note: 'bg-amber-100 text-amber-700',
}

export default function CustomerStatementPage() {
  const [params, setParams] = useState({ customer_id: '', date_from: '', date_to: '' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => fetchCustomers({ per_page: 500 }).then((r) => r.data.data),
  })

  const selectedCustomer = customers.find((c) => c.id === params.customer_id)

  const { data, isLoading } = useQuery({
    queryKey: ['report-cs', params],
    queryFn: () =>
      fetchCustomerStatement({
        customer_id: params.customer_id || undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
      }).then((r) => r.data),
  })

  const rows: CSRow[] = (data as { rows?: CSRow[] })?.rows ?? []
  const closingBalance: number = (data as { closing_balance?: number })?.closing_balance ?? 0

  const totalItems = rows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const paginatedRows = rows.slice((page - 1) * perPage, page * perPage)

  const handleClear = () => {
    setParams({ customer_id: '', date_from: '', date_to: '' })
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cs-print-area { display: block !important; }
          #cs-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customer Statement</h1>
          <p className="text-sm text-muted-foreground">
            {selectedCustomer
              ? `Invoices, receipts, and credit notes for ${selectedCustomer.name}`
              : 'Complete transaction statement across all customers'}
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
          <Label>Customer</Label>
          <Select
            value={params.customer_id || 'all'}
            onValueChange={(v) => {
              setParams((p) => ({ ...p, customer_id: v === 'all' ? '' : v }))
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
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
          {(params.customer_id || params.date_from || params.date_to) && (
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
          No posted transactions found for the selected filter criteria.
        </div>
      )}

      {rows.length > 0 && (
        <div id="cs-print-area" className="space-y-3">
          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">Customer Statement</h2>
            <p className="text-sm">Customer: {selectedCustomer ? selectedCustomer.name : 'All Customers'}</p>
            {params.date_from && params.date_to && (
              <p className="text-sm">Period: {params.date_from} to {params.date_to}</p>
            )}
          </div>

          {/* Summary strip */}
          <div className="flex gap-4 print:hidden mb-2">
            <div className="rounded-lg border p-3 flex-1 bg-card">
              <p className="text-xs text-muted-foreground">Scope</p>
              <p className="font-semibold">{selectedCustomer?.name ?? 'All Customers'}</p>
            </div>
            <div className={`rounded-lg border p-3 flex-1 ${closingBalance > 0 ? 'bg-red-50 border-red-200' : closingBalance < 0 ? 'bg-green-50 border-green-200' : 'bg-card'}`}>
              <p className="text-xs text-muted-foreground">Net Closing Balance</p>
              <p className={`font-semibold font-mono ${closingBalance > 0 ? 'text-red-700' : closingBalance < 0 ? 'text-green-700' : ''}`}>
                {fmt(Math.abs(closingBalance))} {closingBalance > 0 ? 'Dr (Receivable)' : closingBalance < 0 ? 'Cr (Overpaid)' : '—'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {!params.customer_id && (
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Customer
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {params.customer_id ? 'Balance' : 'Net'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
                    {!params.customer_id && (
                      <td className="px-4 py-2.5 font-medium text-sm">
                        {row.customer_name ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[row.type] ?? 'bg-muted text-muted-foreground'}`}>
                        {TYPE_LABELS[row.type] ?? row.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.reference}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.debit > 0 ? fmt(row.debit) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.credit > 0 ? fmt(row.credit) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-medium ${row.balance < 0 ? 'text-green-600' : row.balance > 0 ? 'text-red-600' : ''}`}>
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
                  <td colSpan={params.customer_id ? 5 : 6} className="px-4 py-2.5 text-right text-sm">
                    Closing Balance
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${closingBalance < 0 ? 'text-green-600' : closingBalance > 0 ? 'text-red-600' : ''}`}>
                    {fmt(Math.abs(closingBalance))}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {closingBalance < 0 ? 'Cr' : 'Dr'}
                    </span>
                  </td>
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
        </div>
      )}
    </div>
  )
}
