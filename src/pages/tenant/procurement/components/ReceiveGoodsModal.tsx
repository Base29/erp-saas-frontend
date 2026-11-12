import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PackageCheck, AlertCircle } from 'lucide-react'
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
import { fetchWarehouses, createGoodsReceipt, type Warehouse } from '@/api/tenant'
import { type PurchaseOrder } from '@/api/procurement'

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
}

export default function ReceiveGoodsModal({
  open,
  onClose,
  onSuccess,
  order,
}: ReceiveGoodsModalProps) {
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

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id)
    }
  }, [warehouses, warehouseId])

  useEffect(() => {
    if (order && order.lines) {
      setReference(`Delivery against PO #${order.po_number}`)
      const itemsToReceive: ReceiveLine[] = order.lines
        .map((l) => {
          const ord = Number(l.quantity) || 0
          const rec = Number(l.received_quantity) || 0
          const rem = Math.max(0, ord - rec)
          return {
            purchase_order_line_id: l.id,
            item_id: l.item_id || '',
            item_name: l.item?.item_name || l.item_description,
            item_code: l.item?.item_code || '',
            ordered_qty: ord,
            already_received_qty: rec,
            receive_qty: rem,
            accepted_qty: rem,
            rejected_qty: 0,
            qc_notes: '',
            unit_cost: Number(l.unit_price) || 0,
            batch_number: '',
          }
        })
        .filter((l) => l.item_id && l.receive_qty > 0)

      setLines(itemsToReceive)
    }
    setErrorMsg('')
  }, [order, open])

  const handleLineChange = (index: number, field: keyof ReceiveLine, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'receive_qty' || field === 'rejected_qty') {
      const rec = Number(updated[index].receive_qty) || 0
      const rej = Number(updated[index].rejected_qty) || 0
      updated[index].accepted_qty = Math.max(0, rec - rej)
    }

    setLines(updated)
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
                    <th className="p-2.5 text-left">Item</th>
                    <th className="p-2.5 text-right w-20">Ordered</th>
                    <th className="p-2.5 text-right w-20">Prior Rec.</th>
                    <th className="p-2.5 text-right w-24">Receiving</th>
                    <th className="p-2.5 text-right w-20 text-emerald-600">Accepted</th>
                    <th className="p-2.5 text-right w-20 text-rose-600">Rejected</th>
                    <th className="p-2.5 text-left w-36">QC Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => (
                    <tr key={line.purchase_order_line_id} className="hover:bg-muted/30">
                      <td className="p-2.5">
                        <div className="font-medium text-foreground">{line.item_name}</div>
                        {line.item_code && (
                          <div className="text-[10px] text-muted-foreground font-mono">{line.item_code}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-medium">{line.ordered_qty}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{line.already_received_qty}</td>
                      <td className="p-2.5">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max={line.ordered_qty - line.already_received_qty}
                          value={line.receive_qty}
                          onChange={(e) => handleLineChange(idx, 'receive_qty', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-mono"
                          required
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-medium text-emerald-600">
                        {line.accepted_qty}
                      </td>
                      <td className="p-2.5">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max={line.receive_qty}
                          value={line.rejected_qty}
                          onChange={(e) => handleLineChange(idx, 'rejected_qty', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-mono text-rose-600"
                        />
                      </td>
                      <td className="p-2.5">
                        <Input
                          value={line.qc_notes}
                          onChange={(e) => handleLineChange(idx, 'qc_notes', e.target.value)}
                          placeholder="Damage, defect..."
                          className="h-8 text-xs"
                          disabled={line.rejected_qty === 0}
                        />
                      </td>
                    </tr>
                  ))}
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
