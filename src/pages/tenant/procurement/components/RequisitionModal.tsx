import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { fetchItems } from '@/api/tenant'
import { procurementApi, type PurchaseRequisition } from '@/api/procurement'
import { formatCurrency } from '@/utils/format'

interface RequisitionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  requisition?: PurchaseRequisition | null
}

interface DraftLine {
  item_id: string
  item_description: string
  quantity: number
  estimated_unit_cost: number
  estimated_total_cost: number
  unit_of_measure_id?: string
  notes?: string
}

export default function RequisitionModal({
  open,
  onClose,
  onSuccess,
  requisition,
}: RequisitionModalProps) {
  const [purpose, setPurpose] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [requiredByDate, setRequiredByDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([
    {
      item_id: '',
      item_description: '',
      quantity: 1,
      estimated_unit_cost: 0,
      estimated_total_cost: 0,
    },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: itemsData } = useQuery({
    queryKey: ['procurement-items'],
    queryFn: () => fetchItems({ per_page: 200 }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const availableItems = itemsData ?? []

  useEffect(() => {
    if (requisition) {
      setPurpose(requisition.purpose || '')
      setPriority(requisition.priority || 'medium')
      setRequiredByDate(requisition.required_by_date ? requisition.required_by_date.slice(0, 10) : '')
      setNotes(requisition.notes || '')
      if (requisition.lines && requisition.lines.length > 0) {
        setLines(
          requisition.lines.map((l) => ({
            item_id: l.item_id || '',
            item_description: l.item_description,
            quantity: Number(l.quantity),
            estimated_unit_cost: Number(l.estimated_unit_cost),
            estimated_total_cost: Number(l.estimated_total_cost),
            unit_of_measure_id: l.unit_of_measure_id || undefined,
            notes: l.notes || '',
          }))
        )
      }
    } else {
      setPurpose('')
      setPriority('medium')
      setRequiredByDate('')
      setNotes('')
      setLines([
        {
          item_id: '',
          item_description: '',
          quantity: 1,
          estimated_unit_cost: 0,
          estimated_total_cost: 0,
        },
      ])
    }
    setErrorMsg('')
  }, [requisition, open])

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = availableItems.find((i) => i.id === itemId)
    const newLines = [...lines]
    newLines[index].item_id = itemId
    if (selected) {
      newLines[index].item_description = selected.item_name
      newLines[index].unit_of_measure_id = selected.base_unit_of_measure_id
    }
    setLines(newLines)
  }

  const handleLineChange = (index: number, field: keyof DraftLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    if (field === 'quantity' || field === 'estimated_unit_cost') {
      const q = Number(newLines[index].quantity) || 0
      const c = Number(newLines[index].estimated_unit_cost) || 0
      newLines[index].estimated_total_cost = q * c
    }
    setLines(newLines)
  }

  const addLine = () => {
    setLines([
      ...lines,
      {
        item_id: '',
        item_description: '',
        quantity: 1,
        estimated_unit_cost: 0,
        estimated_total_cost: 0,
      },
    ])
  }

  const removeLine = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  const grandTotal = lines.reduce((acc, curr) => acc + (Number(curr.estimated_total_cost) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!lines.some((l) => l.item_description.trim() && l.quantity > 0)) {
      setErrorMsg('Please add at least one line item with a description and quantity.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload: any = {
        purpose,
        priority,
        required_by_date: requiredByDate || null,
        notes,
        lines: lines.map((l) => ({
          item_id: l.item_id || null,
          item_description: l.item_description,
          quantity: Number(l.quantity),
          unit_of_measure_id: l.unit_of_measure_id || null,
          estimated_unit_cost: Number(l.estimated_unit_cost),
          estimated_total_cost: Number(l.estimated_total_cost),
          notes: l.notes || null,
        })),
      }

      if (requisition) {
        await procurementApi.updateRequisition(requisition.id, payload)
      } else {
        await procurementApi.createRequisition(payload)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to save requisition.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {requisition ? `Edit Requisition ${requisition.requisition_number}` : 'New Purchase Requisition'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="purpose">Purpose / Request Details</Label>
              <Input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Office supplies replenishment, Raw material for batch #104"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requiredByDate">Required By Date</Label>
              <Input
                id="requiredByDate"
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Requested Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Item Line
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-2 text-left w-1/4">Inventory Item</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right w-20">Qty</th>
                    <th className="p-2 text-right w-28">Est. Unit Cost</th>
                    <th className="p-2 text-right w-28">Est. Total</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="p-2">
                        <Select
                          value={line.item_id || '__none__'}
                          onValueChange={(val) => handleItemSelect(idx, val === '__none__' ? '' : val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Custom / Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Custom non-stock --</SelectItem>
                            {availableItems.map((item) => (
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
                          className="h-8 text-xs text-right"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={line.estimated_unit_cost}
                          onChange={(e) => handleLineChange(idx, 'estimated_unit_cost', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-medium text-foreground">
                        {formatCurrency(line.estimated_total_cost)}
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

            <div className="flex justify-end pr-2 pt-2 text-sm font-semibold text-foreground">
              <span>Total Estimated:</span>
              <span className="ml-4 font-mono text-primary">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="notes">Additional Justifications & Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vendor recommendations, budget code, or urgency reasons..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : requisition ? 'Update Requisition' : 'Create Requisition'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
