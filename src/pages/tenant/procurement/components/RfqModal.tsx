import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchSuppliers, fetchItems } from '@/api/tenant'
import { procurementApi, type Rfq } from '@/api/procurement'

interface RfqModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  rfq?: Rfq | null
}

interface RfqLineItem {
  id?: string
  item_id: string
  item_description: string
  quantity: number
  target_price?: number | string
  notes?: string
}

export default function RfqModal({
  open,
  onClose,
  onSuccess,
  rfq,
}: RfqModalProps) {
  const [title, setTitle] = useState('')
  const [rfqDate, setRfqDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bidDeadline, setBidDeadline] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [lines, setLines] = useState<RfqLineItem[]>([
    { item_id: '', item_description: '', quantity: 1, target_price: '' },
  ])
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => fetchSuppliers({ per_page: 100 }).then((r) => r.data.data),
    enabled: open,
  })

  const { data: itemsData } = useQuery({
    queryKey: ['items-list'],
    queryFn: () => fetchItems({ per_page: 200 }).then((r) => r.data.data),
    enabled: open,
  })

  const suppliers = suppliersData ?? []
  const items = itemsData ?? []

  useEffect(() => {
    if (!open) return
    setErrorMsg('')

    if (rfq) {
      setTitle(rfq.title)
      setRfqDate(rfq.rfq_date?.slice(0, 10) || new Date().toISOString().slice(0, 10))
      setBidDeadline(rfq.bid_deadline?.slice(0, 10) || '')
      setTerms(rfq.terms_and_conditions || '')
      setNotes(rfq.notes || '')
      setSelectedSuppliers((rfq.invited_suppliers || rfq.invitedSuppliers || []).map((s: any) => s.supplier_id))
      setLines(
        (rfq.lines || []).map((l) => ({
          id: l.id,
          item_id: l.item_id || '',
          item_description: l.item_description,
          quantity: Number(l.quantity) || 1,
          target_price: l.target_price ?? '',
          notes: l.notes || '',
        }))
      )
    } else {
      setTitle('')
      setRfqDate(new Date().toISOString().slice(0, 10))
      const d = new Date()
      d.setDate(d.getDate() + 14)
      setBidDeadline(d.toISOString().slice(0, 10))
      setSelectedSuppliers([])
      setLines([{ item_id: '', item_description: '', quantity: 1, target_price: '' }])
      setTerms('')
      setNotes('')
    }
  }, [open, rfq])

  const handleAddLine = () => {
    setLines([...lines, { item_id: '', item_description: '', quantity: 1, target_price: '' }])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: keyof RfqLineItem, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'item_id') {
      const selected = items.find((it) => it.id === value)
      if (selected) {
        updated[index].item_description = selected.item_name
      }
    }

    setLines(updated)
  }

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId]
    )
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter an RFQ title.')
      return
    }

    if (lines.some((l) => !l.item_description.trim() || l.quantity <= 0)) {
      setErrorMsg('All line items must have a valid description and quantity > 0.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const payload: any = {
        title: title.trim(),
        rfq_date: rfqDate,
        bid_deadline: bidDeadline || null,
        supplier_ids: selectedSuppliers,
        terms_and_conditions: terms.trim() || null,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          item_id: l.item_id || null,
          item_description: l.item_description,
          quantity: l.quantity,
          target_price: l.target_price ? Number(l.target_price) : null,
          notes: l.notes || null,
        })),
      }

      if (rfq?.id) {
        await procurementApi.updateRfq(rfq.id, payload)
      } else {
        await procurementApi.createRfq(payload)
      }

      onSuccess()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save RFQ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rfq ? 'Edit Request for Quotation (RFQ)' : 'Create Request for Quotation (RFQ)'}</DialogTitle>
          <DialogDescription>
            Invite multiple vendors to submit quotes for required goods and compare prices side-by-side.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/15 text-destructive border border-destructive/30 px-3.5 py-2 rounded-md text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs">RFQ Title / Tender Subject *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Structural Steel & Fasteners"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bid Submission Deadline</Label>
            <Input
              type="date"
              value={bidDeadline}
              onChange={(e) => setBidDeadline(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Invited Suppliers Selector */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Invited Vendors ({selectedSuppliers.length} selected)</Label>
            <span className="text-[11px] text-muted-foreground">Suppliers will be invited to quote</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md bg-muted/20">
            {suppliers.map((s) => {
              const selected = selectedSuppliers.includes(s.id)
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSupplier(s.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {s.name} ({s.supplier_code})
                </button>
              )
            })}
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2 pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Requested Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="p-2.5 text-left w-1/3">Item Catalog</th>
                  <th className="p-2.5 text-left">Description *</th>
                  <th className="p-2.5 text-right w-24">Qty *</th>
                  <th className="p-2.5 text-right w-28">Target Price</th>
                  <th className="p-2.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="p-2">
                      <Select
                        value={line.item_id || 'manual'}
                        onValueChange={(val) => handleLineChange(idx, 'item_id', val === 'manual' ? '' : val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select inventory item..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Custom / Non-Inventory</SelectItem>
                          {items.map((it) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.item_name} ({it.item_code})
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
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Optional"
                        value={line.target_price ?? ''}
                        onChange={(e) => handleLineChange(idx, 'target_price', e.target.value)}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 1}
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
        </div>

        {/* Terms & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Terms & Conditions</Label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Delivery requirements, warranty, packaging standards..."
              className="text-xs min-h-[70px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Internal Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Budget constraints, department notes..."
              className="text-xs min-h-[70px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : rfq ? 'Update RFQ' : 'Create RFQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
