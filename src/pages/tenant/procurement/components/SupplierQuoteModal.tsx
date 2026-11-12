import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { fetchSuppliers } from '@/api/tenant'
import { procurementApi, type Rfq } from '@/api/procurement'
import { formatCurrency } from '@/utils/format'

interface SupplierQuoteModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  rfq: Rfq
  defaultSupplierId?: string
}

interface QuoteLineInput {
  rfq_line_id: string
  item_id?: string | null
  item_description: string
  quantity: number
  unit_price: number
  discount_percent: number
  tax_rate: number
  line_total: number
  lead_time_days: number
}

export default function SupplierQuoteModal({
  open,
  onClose,
  onSuccess,
  rfq,
  defaultSupplierId,
}: SupplierQuoteModalProps) {
  const [supplierId, setSupplierId] = useState('')
  const [quoteRef, setQuoteRef] = useState('')
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [leadTimeDays, setLeadTimeDays] = useState(7)
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [lines, setLines] = useState<QuoteLineInput[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => fetchSuppliers({ per_page: 100 }).then((r) => r.data.data),
    enabled: open,
  })

  const suppliers = suppliersData ?? []

  useEffect(() => {
    if (!open || !rfq) return

    setSupplierId(defaultSupplierId || '')
    setQuoteRef('')
    setQuotationDate(new Date().toISOString().slice(0, 10))
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setValidUntil(d.toISOString().slice(0, 10))
    setCurrencyCode('USD')
    setLeadTimeDays(7)
    setPaymentTerms('Net 30')
    setErrorMsg('')

    // Pre-populate with RFQ lines
    const quoteLines: QuoteLineInput[] = (rfq.lines || []).map((l) => ({
      rfq_line_id: l.id,
      item_id: l.item_id,
      item_description: l.item_description,
      quantity: Number(l.quantity) || 1,
      unit_price: Number(l.target_price) || 0,
      discount_percent: 0,
      tax_rate: 0,
      line_total: (Number(l.quantity) || 1) * (Number(l.target_price) || 0),
      lead_time_days: 7,
    }))

    setLines(quoteLines)
  }, [open, rfq, defaultSupplierId])

  const handleLineChange = (index: number, field: keyof QuoteLineInput, val: number) => {
    setLines((prev) => {
      const updated = [...prev]
      const cur = { ...updated[index], [field]: val }
      const sub = cur.quantity * cur.unit_price
      const disc = sub * (cur.discount_percent / 100)
      const tax = (sub - disc) * (cur.tax_rate / 100)
      cur.line_total = (sub - disc) + tax
      updated[index] = cur
      return updated
    })
  }

  const subtotal = lines.reduce((acc, l) => acc + (l.quantity * l.unit_price), 0)
  const discountTotal = lines.reduce((acc, l) => acc + (l.quantity * l.unit_price * (l.discount_percent / 100)), 0)
  const taxTotal = lines.reduce((acc, l) => {
    const net = (l.quantity * l.unit_price) * (1 - l.discount_percent / 100)
    return acc + (net * (l.tax_rate / 100))
  }, 0)
  const grandTotal = (subtotal - discountTotal) + taxTotal

  const handleSubmit = async () => {
    if (!supplierId) {
      setErrorMsg('Please select a supplier.')
      return
    }

    if (lines.some((l) => l.unit_price <= 0)) {
      setErrorMsg('All line items must have a unit price greater than 0.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const payload: any = {
        rfq_id: rfq.id,
        supplier_id: supplierId,
        supplier_quote_reference: quoteRef.trim() || null,
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        currency_code: currencyCode,
        lead_time_days: leadTimeDays,
        payment_terms: paymentTerms,
        lines: lines.map((l) => ({
          rfq_line_id: l.rfq_line_id,
          item_id: l.item_id || null,
          item_description: l.item_description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
          lead_time_days: l.lead_time_days,
        })),
      }

      await procurementApi.createQuotation(payload)
      onSuccess()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit supplier quotation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Supplier Quotation</DialogTitle>
          <DialogDescription>
            Enter bid submission details received from a vendor for RFQ #{rfq.rfq_number}.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/15 text-destructive border border-destructive/30 px-3.5 py-2 rounded-md text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select supplier..." />
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

          <div className="space-y-1.5">
            <Label className="text-xs">Supplier's Quote Reference</Label>
            <Input
              value={quoteRef}
              onChange={(e) => setQuoteRef(e.target.value)}
              placeholder="e.g. QT-2026-99"
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payment Terms</Label>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Net 30, COD"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quotation Date</Label>
            <Input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Valid Until</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Lead Time (Days)</Label>
            <Input
              type="number"
              min="0"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(parseInt(e.target.value, 10) || 0)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Lines */}
        <div className="border rounded-md overflow-hidden mt-4">
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground font-medium border-b">
              <tr>
                <th className="p-2.5 text-left">Item Description</th>
                <th className="p-2.5 text-right w-20">Qty</th>
                <th className="p-2.5 text-right w-28">Unit Price *</th>
                <th className="p-2.5 text-right w-20">Disc %</th>
                <th className="p-2.5 text-right w-20">Tax %</th>
                <th className="p-2.5 text-right w-24">Lead (Days)</th>
                <th className="p-2.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l, idx) => (
                <tr key={l.rfq_line_id} className="hover:bg-muted/20">
                  <td className="p-2.5 font-medium">{l.item_description}</td>
                  <td className="p-2.5 text-right font-mono">{l.quantity}</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      value={l.unit_price}
                      onChange={(e) => handleLineChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs text-right font-mono p-1"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={l.discount_percent}
                      onChange={(e) => handleLineChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs text-right font-mono p-1"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={l.tax_rate}
                      onChange={(e) => handleLineChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs text-right font-mono p-1"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      value={l.lead_time_days}
                      onChange={(e) => handleLineChange(idx, 'lead_time_days', parseInt(e.target.value, 10) || 0)}
                      className="h-7 text-xs text-right font-mono p-1"
                    />
                  </td>
                  <td className="p-2.5 text-right font-mono font-medium text-foreground">
                    {formatCurrency(l.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-muted/20 p-3 rounded-md flex flex-col items-end gap-1 text-xs border">
          <div className="flex justify-between w-56 text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-mono text-foreground font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between w-56 text-muted-foreground">
              <span>Discount:</span>
              <span className="font-mono text-emerald-600 font-medium">-{formatCurrency(discountTotal)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between w-56 text-muted-foreground">
              <span>Tax:</span>
              <span className="font-mono text-foreground font-medium">+{formatCurrency(taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between w-56 pt-1.5 border-t text-sm font-bold text-foreground">
            <span>Total Bid Value:</span>
            <span className="font-mono text-primary font-bold">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Submit Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
