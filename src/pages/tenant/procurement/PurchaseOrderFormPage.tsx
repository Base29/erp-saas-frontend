import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, ArrowLeft, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchSuppliers, fetchItems } from '@/api/tenant'
import { procurementApi, type PurchaseRequisitionLine } from '@/api/procurement'
import { formatCurrency } from '@/utils/format'

interface DraftPOLine {
  purchase_requisition_line_id?: string | null
  item_id: string
  item_description: string
  quantity: number
  unit_of_measure_id?: string
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  notes?: string
}

export default function PurchaseOrderFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requisitionId = searchParams.get('requisition_id')

  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(1.0)
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Standard purchasing terms apply. Goods subject to warehouse inspection.')

  const [lines, setLines] = useState<DraftPOLine[]>([
    {
      item_id: '',
      item_description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      tax_rate: 0,
      tax_amount: 0,
      line_total: 0,
    },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Load suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['procurement-suppliers'],
    queryFn: () => fetchSuppliers({ per_page: 200 }).then((r) => r.data.data),
  })
  const suppliers = suppliersData ?? []

  // Load inventory items
  const { data: itemsData } = useQuery({
    queryKey: ['procurement-items'],
    queryFn: () => fetchItems({ per_page: 200 }).then((r) => r.data.data),
  })
  const items = itemsData ?? []

  // Pre-load from requisition if linked
  const { data: requisitionData } = useQuery({
    queryKey: ['requisition-preload', requisitionId],
    queryFn: () => procurementApi.getRequisition(requisitionId!),
    enabled: Boolean(requisitionId),
  })

  useEffect(() => {
    if (requisitionData?.data) {
      const req = requisitionData.data
      setNotes(`Imported from Requisition #${req.requisition_number}. ${req.purpose || ''}`)
      if (req.lines && req.lines.length > 0) {
        setLines(
          req.lines.map((l: PurchaseRequisitionLine) => {
            const reqQty = Number(l.quantity) || 0
            const ordQty = Number(l.ordered_quantity) || 0
            const remQty = Math.max(1, reqQty - ordQty)
            const unitPrice = Number(l.estimated_unit_cost) || 0
            const lineSub = remQty * unitPrice
            return {
              purchase_requisition_line_id: l.id,
              item_id: l.item_id || '',
              item_description: l.item_description,
              quantity: remQty,
              unit_of_measure_id: l.unit_of_measure_id || undefined,
              unit_price: unitPrice,
              discount_percent: 0,
              discount_amount: 0,
              tax_rate: 0,
              tax_amount: 0,
              line_total: lineSub,
            }
          })
        )
      }
    }
  }, [requisitionData])

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = items.find((i) => i.id === itemId)
    const newLines = [...lines]
    newLines[index].item_id = itemId
    if (selected) {
      newLines[index].item_description = selected.item_name
      newLines[index].unit_of_measure_id = selected.base_unit_of_measure_id
    }
    setLines(newLines)
  }

  const handleLineChange = (index: number, field: keyof DraftPOLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }

    const qty = Number(newLines[index].quantity) || 0
    const price = Number(newLines[index].unit_price) || 0
    const discPct = Number(newLines[index].discount_percent) || 0
    const taxRate = Number(newLines[index].tax_rate) || 0

    const sub = qty * price
    const discAmt = sub * (discPct / 100)
    const taxable = sub - discAmt
    const taxAmt = taxable * (taxRate / 100)
    const total = taxable + taxAmt

    newLines[index].discount_amount = discAmt
    newLines[index].tax_amount = taxAmt
    newLines[index].line_total = total

    setLines(newLines)
  }

  const addLine = () => {
    setLines([
      ...lines,
      {
        item_id: '',
        item_description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        line_total: 0,
      },
    ])
  }

  const removeLine = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  const subtotal = lines.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.unit_price) || 0), 0)
  const discountTotal = lines.reduce((acc, curr) => acc + (Number(curr.discount_amount) || 0), 0)
  const taxTotal = lines.reduce((acc, curr) => acc + (Number(curr.tax_amount) || 0), 0)
  const grandTotal = (subtotal - discountTotal) + taxTotal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!supplierId) {
      setErrorMsg('Please select a supplier.')
      return
    }

    if (!lines.some((l) => l.item_description.trim() && l.quantity > 0 && l.unit_price >= 0)) {
      setErrorMsg('Please ensure all line items have descriptions, valid quantities, and unit prices.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload: any = {
        supplier_id: supplierId,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        currency_code: currencyCode,
        exchange_rate: Number(exchangeRate) || 1.0,
        payment_terms: paymentTerms,
        delivery_address: deliveryAddress || null,
        purchase_requisition_id: requisitionId || null,
        notes: notes || null,
        terms_and_conditions: terms || null,
        lines: lines.map((l) => ({
          purchase_requisition_line_id: l.purchase_requisition_line_id || null,
          item_id: l.item_id || null,
          item_description: l.item_description,
          quantity: Number(l.quantity),
          unit_of_measure_id: l.unit_of_measure_id || null,
          unit_price: Number(l.unit_price),
          discount_percent: Number(l.discount_percent),
          discount_amount: Number(l.discount_amount),
          tax_rate: Number(l.tax_rate),
          tax_amount: Number(l.tax_amount),
          line_total: Number(l.line_total),
        })),
      }

      const res = await procurementApi.createOrder(payload)
      navigate(`/procurement/orders/${res.data.id}`)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to create purchase order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/procurement/orders')}
          className="h-9 w-9 text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Purchase Order</h1>
          <p className="text-sm text-muted-foreground">
            {requisitionId ? `Converting from Requisition #${requisitionData?.data?.requisition_number || ''}` : 'Issue a new supplier purchase agreement.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 text-sm rounded-md bg-destructive/15 text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        {/* Order Header Card */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">Vendor & Order Settings</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="supplier">Supplier / Vendor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplier_code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedDeliveryDate">Expected Delivery</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currencyCode">Currency</Label>
              <div className="flex gap-2">
                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                  <SelectTrigger id="currencyCode" className="w-2/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="PKR">PKR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="any"
                  min="0.000001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                  placeholder="Rate"
                  className="w-1/3 text-xs font-mono"
                  title="Exchange Rate to Base Currency"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, Due on Receipt"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deliveryAddress">Delivery Warehouse / Address</Label>
              <Input
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Main Facility, Gate #2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Line Items */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-2.5 text-left w-1/4">Inventory Item</th>
                    <th className="p-2.5 text-left">Description</th>
                    <th className="p-2.5 text-right w-20">Qty</th>
                    <th className="p-2.5 text-right w-24">Price</th>
                    <th className="p-2.5 text-right w-20">Disc %</th>
                    <th className="p-2.5 text-right w-20">Tax %</th>
                    <th className="p-2.5 text-right w-28">Total</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-2">
                        <Select
                          value={line.item_id || '__none__'}
                          onValueChange={(val) => handleItemSelect(idx, val === '__none__' ? '' : val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Non-stock / custom" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Custom non-stock --</SelectItem>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.item_code} - {item.item_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={line.item_description}
                          onChange={(e) => handleLineChange(idx, 'item_description', e.target.value)}
                          placeholder="Item specifications..."
                          className="h-8 text-xs"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={line.unit_price}
                          onChange={(e) => handleLineChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={line.discount_percent}
                          onChange={(e) => handleLineChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={line.tax_rate}
                          onChange={(e) => handleLineChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-medium text-foreground">
                        {formatCurrency(line.line_total)}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length === 1}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Footer */}
            <div className="bg-muted/40 p-4 border-t flex flex-col items-end gap-1.5 text-xs">
              <div className="flex justify-between w-64 text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono text-foreground font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>Discount:</span>
                  <span className="font-mono text-emerald-600 font-medium">-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>Estimated Tax:</span>
                  <span className="font-mono text-foreground font-medium">+{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between w-64 pt-2 border-t text-sm font-bold text-foreground">
                <span>Grand Total:</span>
                <span className="font-mono text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">Special Instructions / Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shipping instructions, contact persons..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/procurement/orders')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <ShoppingCart className="h-4 w-4" /> {isSubmitting ? 'Saving Order...' : 'Generate Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}
