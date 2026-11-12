import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
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
import { procurementApi, type PurchaseOrder } from '@/api/procurement'
import { formatCurrency } from '@/utils/format'

interface GenerateBillModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: PurchaseOrder
}

interface BillLineInput {
  purchase_order_line_id: string
  item_description: string
  item_code?: string
  ordered_quantity: number
  accepted_quantity: number
  previously_billed_quantity: number
  quantity: number
  unit_price: number
  tax_rate: number
  line_total: number
}

export default function GenerateBillModal({
  open,
  onClose,
  onSuccess,
  order,
}: GenerateBillModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [lines, setLines] = useState<BillLineInput[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [matchResult, setMatchResult] = useState<any | null>(null)

  useEffect(() => {
    if (!open || !order) return

    setInvoiceNumber(`INV-${order.supplier?.supplier_code || 'SUP'}-${Math.floor(1000 + Math.random() * 9000)}`)
    setErrorMsg('')
    setMatchResult(null)

    // Calculate accepted quantities from GRNs
    const linesData: BillLineInput[] = (order.lines || []).map((poLine) => {
      let acceptedTotal = 0
      const grns = order.goods_receipts || order.goodsReceipts || []
      grns.forEach((grn: any) => {
        (grn.lines || []).forEach((gl: any) => {
          if (gl.purchase_order_line_id === poLine.id) {
            acceptedTotal += Number(gl.accepted_quantity ?? gl.received_quantity) || 0
          }
        })
      })

      const previouslyBilled = Number(poLine.billed_quantity) || 0
      const unbilled = Math.max(0, acceptedTotal - previouslyBilled)
      const defaultQty = unbilled > 0 ? unbilled : (Number(poLine.quantity) || 0)
      const price = Number(poLine.unit_price) || 0
      const taxRate = Number(poLine.tax_rate) || 0
      const taxAmt = (defaultQty * price) * (taxRate / 100)
      const lineTotal = (defaultQty * price) + taxAmt

      return {
        purchase_order_line_id: poLine.id,
        item_description: poLine.item_description,
        item_code: poLine.item?.item_code,
        ordered_quantity: Number(poLine.quantity) || 0,
        accepted_quantity: acceptedTotal,
        previously_billed_quantity: previouslyBilled,
        quantity: defaultQty,
        unit_price: price,
        tax_rate: taxRate,
        line_total: lineTotal,
      }
    })

    setLines(linesData)
  }, [open, order])

  const handleLineChange = (index: number, field: 'quantity' | 'unit_price', val: number) => {
    setLines((prev) => {
      const updated = [...prev]
      const cur = { ...updated[index], [field]: val }
      const taxAmt = (cur.quantity * cur.unit_price) * (cur.tax_rate / 100)
      cur.line_total = (cur.quantity * cur.unit_price) + taxAmt
      updated[index] = cur
      return updated
    })
  }

  const subtotal = lines.reduce((acc, l) => acc + (l.quantity * l.unit_price), 0)
  const taxTotal = lines.reduce((acc, l) => acc + (l.quantity * l.unit_price * (l.tax_rate / 100)), 0)
  const grandTotal = subtotal + taxTotal

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setErrorMsg('Please enter a Supplier Invoice / Bill Number.')
      return
    }

    const validLines = lines.filter((l) => l.quantity > 0)
    if (validLines.length === 0) {
      setErrorMsg('At least one line item must have a quantity greater than zero.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const payload = {
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate,
        lines: validLines.map((l) => ({
          purchase_order_line_id: l.purchase_order_line_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
      }

      const res = await procurementApi.generateBillFromOrder(order.id, payload)
      const billData = res.data

      // If matching report shows variance, inform user
      if (billData?.matching_status === 'variance') {
        setMatchResult({
          status: 'variance',
          message: billData.matching_notes || 'Price or quantity variance was detected during 3-Way Match.',
        })
      }

      onSuccess()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to generate purchase bill.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" /> Convert PO to Purchase Bill (Invoice)
          </DialogTitle>
          <DialogDescription>
            Generate a vendor bill linked to Purchase Order #{order.po_number}. Genie Cloud will run an automated 3-Way Match comparing PO prices and GRN accepted quantities.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/15 text-destructive border border-destructive/30 px-3.5 py-2.5 rounded-md text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {matchResult && (
          <div className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 p-3 rounded-md text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold">3-Way Match Discrepancy Flagged:</p>
              <p>{matchResult.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier Invoice / Bill #</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-9021"
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payment Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border rounded-md overflow-hidden mt-4">
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground font-medium border-b">
              <tr>
                <th className="p-2.5 text-left">Item Description</th>
                <th className="p-2.5 text-right">Ordered</th>
                <th className="p-2.5 text-right">Accepted (GRN)</th>
                <th className="p-2.5 text-right">Billed So Far</th>
                <th className="p-2.5 text-right w-24">Bill Qty</th>
                <th className="p-2.5 text-right w-28">Unit Price</th>
                <th className="p-2.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line, idx) => (
                <tr key={line.purchase_order_line_id} className="hover:bg-muted/30">
                  <td className="p-2.5">
                    <div className="font-medium text-foreground">{line.item_description}</div>
                    {line.item_code && <div className="text-[11px] text-muted-foreground font-mono">{line.item_code}</div>}
                  </td>
                  <td className="p-2.5 text-right font-mono">{line.ordered_quantity}</td>
                  <td className="p-2.5 text-right font-mono text-emerald-600 font-semibold">{line.accepted_quantity}</td>
                  <td className="p-2.5 text-right font-mono text-muted-foreground">{line.previously_billed_quantity}</td>
                  <td className="p-2.5 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs text-right font-mono p-1"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.unit_price}
                      onChange={(e) => handleLineChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs text-right font-mono p-1"
                    />
                  </td>
                  <td className="p-2.5 text-right font-mono font-medium text-foreground">
                    {formatCurrency(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="bg-muted/20 p-3 rounded-md flex flex-col items-end gap-1 text-xs border">
          <div className="flex justify-between w-60 text-muted-foreground">
            <span>Net Subtotal:</span>
            <span className="font-mono text-foreground font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between w-60 text-muted-foreground">
            <span>Purchases VAT:</span>
            <span className="font-mono text-foreground font-medium">+{formatCurrency(taxTotal)}</span>
          </div>
          <div className="flex justify-between w-60 pt-1.5 border-t text-sm font-bold text-foreground">
            <span>Bill Total:</span>
            <span className="font-mono text-indigo-600 font-bold">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Generating Bill...' : 'Create Bill & Validate 3-Way Match'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
