import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, AlertCircle, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  fetchWarehouses,
  fetchItems,
  fetchUoms,
  createItem,
  createGoodsReceipt,
  type Warehouse,
  type Item,
} from '@/api/tenant'
import { type PurchaseOrder } from '@/api/procurement'
import { formatQuantity } from '@/utils/format'

interface ReceiveGoodsModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: PurchaseOrder
}

interface ReceiveLine {
  purchase_order_line_id: string
  item_id: string
  item_name: string
  item_code: string
  ordered_qty: number
  already_received_qty: number
  receive_qty: number
  accepted_qty: number
  rejected_qty: number
  qc_notes: string
  unit_cost: number
  batch_number: string
  is_originally_linked: boolean
}

export default function ReceiveGoodsModal({
  open,
  onClose,
  onSuccess,
  order,
}: ReceiveGoodsModalProps) {
  const qc = useQueryClient()
  const [warehouseId, setWarehouseId] = useState('')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<ReceiveLine[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchWarehouses().then((r) => r.data.data ?? r.data),
  })

  const warehouses: Warehouse[] = warehousesData ?? []

  const { data: itemsData } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data),
  })

  const items: Item[] = itemsData ?? []

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id)
    }
  }, [warehouses, warehouseId])

  // Initialize lines when modal opens for a PO
  useEffect(() => {
    if (open && order && order.lines) {
      setReference(`Delivery against PO #${order.po_number}`)
      const itemsToReceive: ReceiveLine[] = order.lines
        .map((l) => {
          const ord = Math.round(Number(l.quantity)) || 0
          const rec = Math.round(Number(l.received_quantity)) || 0
          const rem = Math.max(0, ord - rec)
          const itemName = l.item?.item_name || l.item_description || 'Item'
          const origItemId = l.item_id || ''
          const origItemCode = l.item?.item_code || ''

          return {
            purchase_order_line_id: l.id,
            item_id: origItemId,
            item_name: itemName,
            item_code: origItemCode,
            ordered_qty: ord,
            already_received_qty: rec,
            receive_qty: rem,
            accepted_qty: rem,
            rejected_qty: 0,
            qc_notes: '',
            unit_cost: Number(l.unit_price) || 0,
            batch_number: '',
            is_originally_linked: Boolean(origItemId),
          }
        })
        .filter((l) => l.receive_qty > 0)

      setLines(itemsToReceive)
      setErrorMsg('')
    }
  }, [order?.id, open])

  // Try auto-matching unlinked lines when items catalog becomes available
  useEffect(() => {
    if (items.length > 0) {
      setLines((prev) =>
        prev.map((line) => {
          if (!line.item_id) {
            const found = items.find(
              (it) =>
                it.item_name.trim().toLowerCase() === line.item_name.trim().toLowerCase() ||
                it.item_code.trim().toLowerCase() === line.item_name.trim().toLowerCase()
            )
            if (found) {
              return { ...line, item_id: found.id, item_code: found.item_code }
            }
          }
          return line
        })
      )
    }
  }, [items])

  const updateLine = (index: number, patch: Partial<ReceiveLine>) => {
    setLines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }

      if ('receive_qty' in patch || 'rejected_qty' in patch) {
        const rec = Number(next[index].receive_qty) || 0
        const rej = Number(next[index].rejected_qty) || 0
        next[index].accepted_qty = Math.max(0, rec - rej)
      }

      return next
    })
  }

  const handleQuickCreateItem = async (lineIdx: number, itemName: string) => {
    try {
      setIsSubmitting(true)
      setErrorMsg('')
      const uomRes = await fetchUoms({ per_page: 5 })
      const uoms = uomRes.data.data ?? uomRes.data ?? []
      const baseUomId = uoms[0]?.id

      if (!baseUomId) {
        setErrorMsg('Please configure at least one Unit of Measure in Inventory before creating items.')
        return
      }

      const res = await createItem({
        item_name: itemName,
        item_type: 'stock',
        base_unit_of_measure_id: baseUomId,
        is_active: true,
      })

      const newItem = res.data.data
      await qc.invalidateQueries({ queryKey: ['items-all'] })

      updateLine(lineIdx, {
        item_id: newItem.id,
        item_name: newItem.item_name,
        item_code: newItem.item_code,
      })
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to auto-create inventory item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!warehouseId) {
      setErrorMsg('Please select a receiving warehouse.')
      return
    }

    const validLines = lines.filter((l) => l.receive_qty > 0)
    if (validLines.length === 0) {
      setErrorMsg('No items selected for receipt.')
      return
    }

    const missingItem = validLines.find((l) => !l.item_id)
    if (missingItem) {
      setErrorMsg(`Please select an inventory item for "${missingItem.item_name}" before creating Goods Receipt.`)
      return
    }

    try {
      setIsSubmitting(true)
      await createGoodsReceipt({
        warehouse_id: warehouseId,
        purchase_order_id: order.id,
        receipt_date: receiptDate,
        reference: reference || undefined,
        lines: validLines.map((l) => ({
          purchase_order_line_id: l.purchase_order_line_id,
          item_id: l.item_id,
          quantity: l.receive_qty,
          accepted_quantity: l.accepted_qty,
          rejected_quantity: l.rejected_qty,
          qc_status: l.rejected_qty > 0 ? (l.accepted_qty > 0 ? 'partial' : 'failed') : 'passed',
          qc_notes: l.qc_notes || undefined,
          unit_cost: l.unit_cost,
        })),
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to record Goods Receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Receive Goods for PO #{order.po_number}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Verify quantities, perform Quality Inspection (QC), and record inward warehouse receipt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="warehouse">Receiving Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.warehouse_code} - {w.warehouse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receiptDate">Receipt Date *</Label>
              <Input
                id="receiptDate"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference">Carrier / Delivery Ref</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Inward Gate Pass #108"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-semibold">Incoming Items & Quality Inspection (QC)</Label>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-2.5 text-left">Item / Inventory Mapping</th>
                    <th className="p-2.5 text-right w-20">Ordered</th>
                    <th className="p-2.5 text-right w-20">Prior Rec.</th>
                    <th className="p-2.5 text-right w-24">Receiving</th>
                    <th className="p-2.5 text-right w-20 text-emerald-600">Accepted</th>
                    <th className="p-2.5 text-right w-20 text-rose-600">Rejected</th>
                    <th className="p-2.5 text-left w-36">QC Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <PackageCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                        <div className="font-semibold text-foreground text-sm">No pending items to receive</div>
                        <div className="text-xs mt-1">
                          All ordered items on Purchase Order #{order.po_number} have already been received.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={line.purchase_order_line_id} className="hover:bg-muted/30">
                        <td className="p-2.5 max-w-sm">
                          <div className="font-medium text-foreground">{line.item_name}</div>
                          {line.is_originally_linked ? (
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-muted border text-foreground font-mono font-semibold">
                                {line.item_code || 'Linked'}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Select
                                  value={line.item_id || '__none__'}
                                  onValueChange={(val) => {
                                    const actualVal = val === '__none__' ? '' : val
                                    const selected = items.find((it) => it.id === actualVal)
                                    updateLine(idx, {
                                      item_id: actualVal,
                                      item_code: selected?.item_code || '',
                                    })
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs min-w-[210px] border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                                    <SelectValue placeholder="-- Select inventory item --" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60 overflow-y-auto">
                                    <SelectItem value="__none__">-- Select inventory item --</SelectItem>
                                    {items
                                      .filter((it) => it.item_type !== 'service')
                                      .map((it) => (
                                        <SelectItem key={it.id} value={it.id}>
                                          {it.item_code} — {it.item_name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>

                                {!items.some(
                                  (it) => it.item_name.trim().toLowerCase() === line.item_name.trim().toLowerCase()
                                ) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] text-primary border-primary/40 hover:bg-primary/10 whitespace-nowrap gap-1"
                                    onClick={() => handleQuickCreateItem(idx, line.item_name)}
                                    disabled={isSubmitting}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Create "{line.item_name}"
                                  </Button>
                                )}
                              </div>
                              {line.item_id && line.item_code && (
                                <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                  ✓ Mapped to SKU: <span className="font-mono font-bold">{line.item_code}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-medium">{formatQuantity(line.ordered_qty)}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{formatQuantity(line.already_received_qty)}</td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max={line.ordered_qty - line.already_received_qty}
                            value={line.receive_qty}
                            onChange={(e) => updateLine(idx, { receive_qty: parseInt(e.target.value, 10) || 0 })}
                            className="h-8 text-xs text-right font-mono"
                            required
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-emerald-600">
                          {formatQuantity(line.accepted_qty)}
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max={line.receive_qty}
                            value={line.rejected_qty}
                            onChange={(e) => updateLine(idx, { rejected_qty: parseInt(e.target.value, 10) || 0 })}
                            className="h-8 text-xs text-right font-mono text-rose-600"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            value={line.qc_notes}
                            onChange={(e) => updateLine(idx, { qc_notes: e.target.value })}
                            placeholder="Damage, defect..."
                            className="h-8 text-xs"
                            disabled={line.rejected_qty === 0}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <PackageCheck className="h-4 w-4" />
              {isSubmitting ? 'Recording GRN...' : 'Confirm Goods Receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
