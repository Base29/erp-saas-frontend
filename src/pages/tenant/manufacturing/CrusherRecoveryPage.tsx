import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCrusherLogs,
  createCrusherLog,
  deleteCrusherLog,
  fetchRegrindSummary,
  fetchOrders,
  type CrusherBatchLog,
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
import { RefreshCw, Plus, Trash2, Recycle, Layers } from 'lucide-react'
import { toast } from 'sonner'

export default function CrusherRecoveryPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  const { data: openOrders } = useQuery({
    queryKey: ['open-orders'],
    queryFn: () => fetchOrders({ all: true }).then((r) => r.data.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['regrind-summary'],
    queryFn: () => fetchRegrindSummary().then((r) => r.data.data),
  })

  const { data: logs, isLoading } = useQuery({
    queryKey: ['crusher-logs', filterDate],
    queryFn: () => fetchCrusherLogs({ date: filterDate || undefined }).then((r) => r.data.data),
  })

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'morning' as 'morning' | 'evening' | 'night',
    source_production_order_id: '',
    polymer_item_id: '',
    color_variant: 'Natural',
    scrap_received_kg: 50,
    crushed_output_kg: 48.5,
    recovered_reusable_kg: 46.0,
    remarks: '',
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => createCrusherLog(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crusher-logs'] })
      queryClient.invalidateQueries({ queryKey: ['regrind-summary'] })
      setModalOpen(false)
      toast.success('Crusher batch and regrind recovery recorded')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record crusher batch'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCrusherLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crusher-logs'] })
      queryClient.invalidateQueries({ queryKey: ['regrind-summary'] })
      toast.success('Batch log deleted')
    },
  })

  // Live auto-calculated net crushing loss
  const liveLoss = useMemo(() => {
    const scrap = Number(form.scrap_received_kg) || 0
    const rec = Number(form.recovered_reusable_kg) || 0
    const loss = Math.max(0, scrap - rec)
    const rate = scrap > 0 ? Math.round((rec / scrap) * 100) : 0
    return { loss, rate }
  }, [form.scrap_received_kg, form.recovered_reusable_kg])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.polymer_item_id) {
      toast.error('Select polymer item')
      return
    }
    createMutation.mutate(form)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Recycle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Plastic Scrap Crusher & Regrind Recovery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plastics industry extension: log runner/sprue scrap crushing, track recovered reusable regrind, and monitor closing inventory balances.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Log Crusher Run
        </Button>
      </div>

      {/* Regrind Stock Balance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary && summary.length > 0 ? (
          summary.map((row: any) => (
            <Card key={`${row.polymer_id}-${row.color_variant}`} className="border-purple-500/30 bg-purple-500/5">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center justify-between">
                  <span>{row.polymer_name} ({row.color_variant})</span>
                  <Layers className="h-4 w-4 text-purple-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Available Regrind:</span>
                  <span className="text-xl font-bold font-mono text-purple-700 dark:text-purple-300">
                    {Number(row.current_regrind_balance_kg).toLocaleString()} kg
                  </span>
                </div>
                <div className="grid grid-cols-2 text-[11px] text-muted-foreground pt-1 border-t border-purple-500/20">
                  <span>Scrap Sent: {row.total_scrap_received_kg} kg</span>
                  <span className="text-right">Recovery Rate: {row.recovery_rate_pct}%</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-3 border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No regrind inventory recorded yet. Run a crusher batch to initialize reusable balances.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Crusher Logs Registry */}
      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Crusher Batch Runs</CardTitle>
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
                <TableHead>Polymer & Color</TableHead>
                <TableHead>Source Order</TableHead>
                <TableHead className="text-right">Scrap Received</TableHead>
                <TableHead className="text-right">Crushed Output</TableHead>
                <TableHead className="text-right">Recovered Reusable</TableHead>
                <TableHead className="text-right">Net Crushing Loss</TableHead>
                <TableHead className="text-right">Reusable Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    Loading crusher batches...
                  </TableCell>
                </TableRow>
              ) : logs && logs.length > 0 ? (
                logs.map((log: CrusherBatchLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{log.date}</div>
                      <span className="text-muted-foreground capitalize">{log.shift}</span>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {log.polymer_item?.item_name}
                      <span className="block text-muted-foreground text-[10px]">{log.color_variant || 'Natural'}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.source_order?.order_number ?? 'General Scrap'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium">
                      {Number(log.scrap_received_kg).toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {Number(log.crushed_output_kg).toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{Number(log.recovered_reusable_kg).toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-rose-500">
                      -{Number(log.crusher_wastage_loss_kg).toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {Number(log.reusable_balance_kg).toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this crusher batch log?')) {
                            deleteMutation.mutate(log.id)
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
                    No crusher logs recorded. Click &quot;Log Crusher Run&quot; to track recycling.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log Crusher Run Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Log Scrap Crusher & Regrind Run
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
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
                <Label className="text-xs">Polymer Raw Material *</Label>
                <select
                  required
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                  value={form.polymer_item_id}
                  onChange={(e) => setForm({ ...form, polymer_item_id: e.target.value })}
                >
                  <option value="">Select polymer (PP, ABS, HDPE)...</option>
                  {inventoryItems?.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.item_name} ({i.item_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Color Variant</Label>
                <Input
                  placeholder="e.g. Natural, Blue, Black..."
                  value={form.color_variant}
                  onChange={(e) => setForm({ ...form, color_variant: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Source Production Order (optional)</Label>
              <select
                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                value={form.source_production_order_id}
                onChange={(e) => setForm({ ...form, source_production_order_id: e.target.value })}
              >
                <option value="">General Shop-Floor Scrap</option>
                {openOrders?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} ({o.item?.item_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scrap Sent (kg) *</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={form.scrap_received_kg}
                  onChange={(e) => setForm({ ...form, scrap_received_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Crushed Output (kg)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.crushed_output_kg}
                  onChange={(e) => setForm({ ...form, crushed_output_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recovered Regrind (kg) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  className="font-bold text-emerald-600 dark:text-emerald-400"
                  value={form.recovered_reusable_kg}
                  onChange={(e) => setForm({ ...form, recovered_reusable_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Live Net Crushing Loss & Recovery Calculation */}
            <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block">Net Crushing Loss:</span>
                <span className="text-base font-bold text-rose-500">{liveLoss.loss} kg</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Recovery Rate:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{liveLoss.rate}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Record Crusher Batch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
