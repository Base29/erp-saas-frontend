import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPackingEntries,
  createPackingEntry,
  deletePackingEntry,
  fetchBoms,
  type PackingEntry,
  type BillOfMaterial,
} from '@/api/manufacturing'
import apiClient from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Package, Plus, Trash2, Box } from 'lucide-react'
import { toast } from 'sonner'

export default function PackingPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  const { data: boms } = useQuery({
    queryKey: ['boms-all'],
    queryFn: () => fetchBoms({ all: true }).then((r) => r.data.data),
  })

  const [form, setForm] = useState({
    packing_date: new Date().toISOString().split('T')[0],
    shift: 'morning' as 'morning' | 'evening' | 'night',
    batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
    item_id: '',
    packed_quantity: 120,
    packing_rejected_quantity: 0,
    units_per_carton: 12,
    notes: '',
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['packing-entries', filterDate],
    queryFn: () => fetchPackingEntries({ date: filterDate || undefined }).then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => createPackingEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-entries'] })
      setModalOpen(false)
      toast.success('Packing run recorded successfully')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record packing entry'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePackingEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-entries'] })
      toast.success('Packing entry deleted')
    },
  })

  // Live auto-calculation of master cartons and loose pieces
  const liveCartons = useMemo(() => {
    const qty = Number(form.packed_quantity) || 0
    const ratio = Number(form.units_per_carton) || 1
    const cartons = Math.floor(qty / ratio)
    const loose = qty % ratio
    return { cartons, loose }
  }, [form.packed_quantity, form.units_per_carton])

  const handleItemChange = (itemId: string) => {
    const bom = boms?.find((b: BillOfMaterial) => b.item_id === itemId && b.is_active)
    setForm({
      ...form,
      item_id: itemId,
      units_per_carton: bom?.units_per_carton || form.units_per_carton,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item_id) {
      toast.error('Please select the finished product being packed')
      return
    }
    createMutation.mutate(form)
  }

  const totals = useMemo(() => {
    if (!entries) return { pieces: 0, cartons: 0, loose: 0 }
    return {
      pieces: entries.reduce((acc, e) => acc + Number(e.packed_quantity), 0),
      cartons: entries.reduce((acc, e) => acc + Number(e.master_cartons_count), 0),
      loose: entries.reduce((acc, e) => acc + Number(e.loose_pieces_count), 0),
    }
  }, [entries])

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Packing & Master Carton Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dedicated packing station: auto-calculate master cartons vs. loose pieces and record packaging reject counts.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Log Packing Run
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Units Packed</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{totals.pieces.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Finished product units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Master Cartons</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-primary">{totals.cartons.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Full sealed cartons</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Loose Pieces</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totals.loose.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Partial carton remaining</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Packing Registry</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9 text-xs w-44"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Shift</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Packed Qty</TableHead>
                <TableHead className="text-right">Ratio (pcs/ctn)</TableHead>
                <TableHead className="text-right">Master Cartons</TableHead>
                <TableHead className="text-right">Loose Pieces</TableHead>
                <TableHead className="text-right">Packing Rejects</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    Loading packing records...
                  </TableCell>
                </TableRow>
              ) : entries && entries.length > 0 ? (
                entries.map((entry: PackingEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{entry.packing_date}</div>
                      <span className="text-muted-foreground capitalize">{entry.shift}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{entry.batch_number}</TableCell>
                    <TableCell className="text-xs font-medium">
                      {entry.item?.item_name}
                      <span className="block font-mono text-[10px] text-muted-foreground">{entry.item?.item_code}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-foreground">
                      {Number(entry.packed_quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {entry.units_per_carton} / ctn
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-primary">
                      {entry.master_cartons_count} ctns
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium text-amber-600 dark:text-amber-400">
                      {entry.loose_pieces_count} pcs
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-rose-500">
                      {Number(entry.packing_rejected_quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this packing entry?')) {
                            deleteMutation.mutate(entry.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    No packing entries recorded yet. Click &quot;Log Packing Run&quot; to begin.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log Packing Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              Log Finished Goods Packing Run
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Finished Product *</Label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                value={form.item_id}
                onChange={(e) => handleItemChange(e.target.value)}
              >
                <option value="">Select product...</option>
                {inventoryItems?.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.item_name} ({i.item_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Packing Date *</Label>
                <Input
                  type="date"
                  required
                  value={form.packing_date}
                  onChange={(e) => setForm({ ...form, packing_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shift *</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value as any })}
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Packed Quantity (Pieces) *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  className="font-bold text-foreground"
                  value={form.packed_quantity}
                  onChange={(e) => setForm({ ...form, packed_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Units / Master Carton *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.units_per_carton}
                  onChange={(e) => setForm({ ...form, units_per_carton: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Packing Rejected Pieces</Label>
                <Input
                  type="number"
                  min="0"
                  className="text-rose-500"
                  value={form.packing_rejected_quantity}
                  onChange={(e) => setForm({ ...form, packing_rejected_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Batch Number</Label>
                <Input
                  value={form.batch_number}
                  onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                />
              </div>
            </div>

            {/* Live Master Cartons Calculation Box */}
            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block">Master Cartons:</span>
                <span className="text-base font-bold text-primary">{liveCartons.cartons} Cartons</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Loose Pieces:</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">{liveCartons.loose} Pieces</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Recording...' : 'Record Packing'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
