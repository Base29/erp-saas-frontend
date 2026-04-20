import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStockBalance, fetchStockLedger, fetchItems, fetchWarehouses, type Item, type Warehouse } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ── Stock Balance ─────────────────────────────────────────────────────────────
function StockBalanceTab() {
  const [itemId, setItemId] = useState<string>('')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)

  const { data: itemsData } = useQuery({ queryKey: ['items-all'], queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data) })
  const { data: warehousesData } = useQuery({ queryKey: ['warehouses'], queryFn: () => fetchWarehouses().then((r) => r.data.data ?? r.data) })

  const items: Item[] = itemsData ?? []
  const warehouses: Warehouse[] = (warehousesData as Warehouse[]) ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['stock-balance', itemId, warehouseId],
    queryFn: () => fetchStockBalance({ item_id: itemId && itemId !== 'all' ? Number(itemId) : undefined, warehouse_id: warehouseId && warehouseId !== 'all' ? Number(warehouseId) : undefined }).then((r) => r.data),
    enabled: submitted,
  })

  const rows: Array<{ item_name: string; item_code: string; warehouse_name: string; quantity_on_hand: number }> =
    (data as { data?: typeof rows })?.data ?? (Array.isArray(data) ? data : [])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div className="space-y-1">
          <Label>Item (optional)</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All items" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {items.map((it) => <SelectItem key={it.id} value={String(it.id)}>{it.item_code} — {it.item_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Warehouse (optional)</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All warehouses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSubmitted(true)}>Run Report</Button>
      </div>

      {submitted && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Item Code</th>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Warehouse</th>
                <th className="px-4 py-3 text-right">Qty on Hand</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No data</td></tr>
              ) : rows.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3">{row.item_code}</td>
                  <td className="px-4 py-3">{row.item_name}</td>
                  <td className="px-4 py-3">{row.warehouse_name}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.quantity_on_hand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Stock Ledger ──────────────────────────────────────────────────────────────
function StockLedgerTab() {
  const [itemId, setItemId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: itemsData } = useQuery({ queryKey: ['items-all'], queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data) })
  const items: Item[] = itemsData ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['stock-ledger', itemId, dateFrom, dateTo],
    queryFn: () => fetchStockLedger({ item_id: Number(itemId), date_from: dateFrom, date_to: dateTo }).then((r) => r.data),
    enabled: submitted && !!itemId && !!dateFrom && !!dateTo,
  })

  const rows: Array<{ movement_date: string; movement_type: string; source_document_type: string; source_document_id: number; quantity: number; running_balance: number }> =
    (data as { data?: typeof rows })?.data ?? (Array.isArray(data) ? data : [])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div className="space-y-1">
          <Label>Item</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select item…" /></SelectTrigger>
            <SelectContent>
              {items.map((it) => <SelectItem key={it.id} value={String(it.id)}>{it.item_code} — {it.item_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={!itemId || !dateFrom || !dateTo}>Run Report</Button>
      </div>

      {submitted && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No movements found</td></tr>
              ) : rows.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3">{row.movement_date}</td>
                  <td className="px-4 py-3">{row.movement_type}</td>
                  <td className="px-4 py-3">{row.source_document_type} #{row.source_document_id}</td>
                  <td className={`px-4 py-3 text-right font-mono ${row.quantity < 0 ? 'text-destructive' : 'text-green-600'}`}>{row.quantity > 0 ? '+' : ''}{row.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.running_balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'balance' | 'ledger'

export default function InventoryReportsPage() {
  const [tab, setTab] = useState<Tab>('balance')

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Inventory Reports</h1>
        <p className="text-sm text-muted-foreground">Stock balance and movement analysis</p>
      </div>

      <div className="flex gap-1 border-b">
        {([['balance', 'Stock Balance'], ['ledger', 'Stock Ledger']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'balance' && <StockBalanceTab />}
      {tab === 'ledger' && <StockLedgerTab />}
    </div>
  )
}
