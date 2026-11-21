import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchDailyEntries,
  createDailyEntry,
  deleteDailyEntry,
  fetchOrders,
  createDowntimeLog,
  restartMachine,
  fetchDowntimeLogs,
  fetchMoulds,
  createInjectionLog,
  type DailyProductionEntry,
  type ProductionDowntimeLog,
  type PlasticsMould,
} from '@/api/manufacturing'
import apiClient from '@/api/client'
import { isExtensionActive } from '@/utils/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Play, Plus, Clock, AlertTriangle, Sparkles, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function DailyProductionPage() {
  const queryClient = useQueryClient()
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [downtimeModalOpen, setDowntimeModalOpen] = useState(false)
  const [filterShift, setFilterShift] = useState('')

  const isPlasticsActive = isExtensionActive('plastics_molding')

  // Orders and Work Centers
  const { data: openOrders } = useQuery({
    queryKey: ['open-orders'],
    queryFn: () => fetchOrders({ all: true }).then((r) => r.data.data),
  })

  const { data: workCenters } = useQuery({
    queryKey: ['work-centers-all'],
    queryFn: () => apiClient.get('/v1/manufacturing/work-centers?all=true').then((r) => r.data.data),
  })

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  // Moulds for plastics extension
  const { data: moulds } = useQuery({
    queryKey: ['plastics-moulds-all'],
    queryFn: () => fetchMoulds({ all: true }).then((r) => r.data.data),
    enabled: isPlasticsActive,
  })

  // Production entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['daily-entries', filterShift],
    queryFn: () => fetchDailyEntries({ shift: filterShift || undefined }).then((r) => r.data.data),
  })

  // Downtimes
  const { data: downtimes } = useQuery({
    queryKey: ['downtimes-recent'],
    queryFn: () => fetchDowntimeLogs({ active_only: true }).then((r) => r.data.data),
  })

  // Entry Form state
  const [form, setForm] = useState({
    production_order_id: '',
    machine_id: '',
    production_date: new Date().toISOString().split('T')[0],
    shift: 'morning' as 'morning' | 'evening' | 'night',
    operator_name: '',
    batch_number: '',
    good_quantity: 0,
    rejected_quantity: 0,
    actual_running_minutes: 480, // 8 hours standard shift
    standard_cycle_time_sec: 60,
    notes: '',

    // Plastics injection specific
    include_injection: isPlasticsActive,
    mould_id: '',
    polymer_item_id: '',
    color_masterbatch_item_id: '',
    number_of_shots: 0,
    active_pieces_per_cycle: 1,
    actual_cycle_time_sec: 60,
    actual_material_kg: 0,
  })

  // Selected order details
  const selectedOrder = useMemo(() => {
    return openOrders?.find((o) => o.id === form.production_order_id)
  }, [openOrders, form.production_order_id])

  // Selected mould details
  const selectedMould = useMemo(() => {
    return moulds?.find((m: PlasticsMould) => m.id === form.mould_id)
  }, [moulds, form.mould_id])

  // Real-time calculated live values
  const liveCalculations = useMemo(() => {
    const cycleSec = form.include_injection && selectedMould
      ? Number(form.actual_cycle_time_sec || selectedMould.standard_cycle_time_sec)
      : Number(form.standard_cycle_time_sec)

    const runningMin = Number(form.actual_running_minutes)
    const goodQty = Number(form.good_quantity)

    let expectedQty = 0
    if (cycleSec > 0 && runningMin > 0) {
      expectedQty = Math.round((runningMin * 60) / cycleSec)
    } else {
      expectedQty = goodQty + Number(form.rejected_quantity)
    }

    const variance = goodQty - expectedQty
    const achievement = expectedQty > 0 ? Math.round((goodQty / expectedQty) * 100) : 100

    // Injection polymer standard
    let stdPolymerKg = 0
    if (form.include_injection && selectedMould && form.number_of_shots > 0) {
      stdPolymerKg = Math.round(((form.number_of_shots * Number(selectedMould.shot_weight_grams)) / 1000) * 100) / 100
    }

    let expectedFromShots = 0
    if (form.include_injection && form.number_of_shots > 0) {
      expectedFromShots = form.number_of_shots * form.active_pieces_per_cycle
    }

    return {
      expectedQty,
      variance,
      achievement,
      stdPolymerKg,
      expectedFromShots,
    }
  }, [form, selectedMould])

  // Downtime form state
  const [downtimeForm, setDowntimeForm] = useState({
    machine_id: '',
    reason: 'machine_breakdown' as any,
    stopped_at: new Date().toISOString().slice(0, 16),
    remarks: '',
  })

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await createDailyEntry({
        production_order_id: payload.production_order_id,
        machine_id: payload.machine_id,
        production_date: payload.production_date,
        shift: payload.shift,
        operator_name: payload.operator_name,
        batch_number: payload.batch_number || selectedOrder?.batch_number,
        good_quantity: payload.good_quantity,
        rejected_quantity: payload.rejected_quantity,
        actual_running_minutes: payload.actual_running_minutes,
        standard_cycle_time_sec: payload.standard_cycle_time_sec,
        notes: payload.notes,
      })

      const dailyEntryId = res.data.data.id

      // If injection extension details provided, attach injection log
      if (isPlasticsActive && payload.include_injection && payload.mould_id && payload.number_of_shots > 0) {
        await createInjectionLog({
          daily_production_entry_id: dailyEntryId,
          mould_id: payload.mould_id,
          polymer_item_id: payload.polymer_item_id || selectedOrder?.item_id,
          color_masterbatch_item_id: payload.color_masterbatch_item_id || null,
          number_of_shots: payload.number_of_shots,
          active_pieces_per_cycle: payload.active_pieces_per_cycle,
          actual_cycle_time_sec: payload.actual_cycle_time_sec,
          actual_material_kg: payload.actual_material_kg || liveCalculations.stdPolymerKg,
          notes: payload.notes,
        })
      }

      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-entries'] })
      queryClient.invalidateQueries({ queryKey: ['open-orders'] })
      setEntryModalOpen(false)
      toast.success('Daily production logged successfully')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record daily production'),
  })

  const createDowntimeMutation = useMutation({
    mutationFn: (payload: any) => createDowntimeLog(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtimes-recent'] })
      setDowntimeModalOpen(false)
      toast.success('Machine stoppage logged')
    },
    onError: () => toast.error('Failed to log downtime'),
  })

  const restartMutation = useMutation({
    mutationFn: (id: string) => restartMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtimes-recent'] })
      toast.success('Machine marked as restarted')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDailyEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-entries'] })
      toast.success('Production entry deleted')
    },
  })

  const handleOrderChange = (orderId: string) => {
    const o = openOrders?.find((item) => item.id === orderId)
    setForm({
      ...form,
      production_order_id: orderId,
      machine_id: o?.work_center_id || form.machine_id,
      batch_number: o?.batch_number || '',
    })
  }

  const handleMouldChange = (mouldId: string) => {
    const m = moulds?.find((item: PlasticsMould) => item.id === mouldId)
    setForm({
      ...form,
      mould_id: mouldId,
      active_pieces_per_cycle: m?.default_active_cavities || 1,
      standard_cycle_time_sec: Number(m?.standard_cycle_time_sec || 60),
      actual_cycle_time_sec: Number(m?.standard_cycle_time_sec || 60),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.production_order_id) {
      toast.error('Please select an active production order')
      return
    }
    if (!form.machine_id) {
      toast.error('Please select a machine')
      return
    }
    createEntryMutation.mutate(form)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Play className="h-6 w-6 text-primary" />
            Shop-Floor Daily Production
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fast supervisor log: track shift output, rejects, standard vs. actual cycle efficiency, and machine stoppages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDowntimeModalOpen(true)}
            className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
          >
            <Clock className="h-4 w-4 mr-1.5 text-amber-500" />
            Log Machine Stoppage
          </Button>
          <Button onClick={() => setEntryModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Shift Entry
          </Button>
        </div>
      </div>

      {/* Active Stoppages Banner (if any) */}
      {downtimes && downtimes.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{downtimes.length} Machine(s) Currently Stopped on Shop-Floor</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {downtimes.map((log: ProductionDowntimeLog) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-background/80 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold">{log.machine?.name}</span>
                  <span className="block text-muted-foreground capitalize">
                    Reason: {log.reason.replace('_', ' ')}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                  onClick={() => restartMutation.mutate(log.id)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Restart
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries Table */}
      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Production Log Registry</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="h-9 px-3 rounded-md border text-xs bg-background"
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
            >
              <option value="">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Shift</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Good Qty</TableHead>
                <TableHead className="text-right">Rejects</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Achievement</TableHead>
                {isPlasticsActive && <TableHead>Plastics Mould</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
                    Loading production records...
                  </TableCell>
                </TableRow>
              ) : entries && entries.length > 0 ? (
                entries.map((entry: DailyProductionEntry) => {
                  const ach = Number(entry.achievement_percentage)
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{entry.production_date}</div>
                        <span className="text-muted-foreground capitalize">{entry.shift}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.production_order?.order_number ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {entry.machine?.name} ({entry.machine?.code})
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.item?.item_name}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(entry.good_quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-rose-500">
                        {Number(entry.rejected_quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {Number(entry.expected_quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold">
                        <span className={ach >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {ach}%
                        </span>
                      </TableCell>
                      {isPlasticsActive && (
                        <TableCell className="text-xs">
                          {entry.injection_log ? (
                            <Badge variant="outline" className="border-purple-500/40 text-purple-600 bg-purple-500/10">
                              {entry.injection_log.mould?.name || 'Mould Run'} ({entry.injection_log.number_of_shots} shots)
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm('Delete this production entry?')) {
                              deleteMutation.mutate(entry.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
                    No daily production entries recorded. Click &quot;New Shift Entry&quot; to log shop-floor output.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Production Entry Modal with Live Calculations & Injection Extension */}
      <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Daily Shift Output</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Production Order *</Label>
                <select
                  required
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                  value={form.production_order_id}
                  onChange={(e) => handleOrderChange(e.target.value)}
                >
                  <option value="">Select active order...</option>
                  {openOrders?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.item?.item_name} (Planned: {o.planned_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Machine / Work Center *</Label>
                <select
                  required
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                  value={form.machine_id}
                  onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                >
                  <option value="">Select machine...</option>
                  {workCenters?.map((wc: any) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.name} ({wc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  required
                  value={form.production_date}
                  onChange={(e) => setForm({ ...form, production_date: e.target.value })}
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
              <div className="space-y-1.5">
                <Label className="text-xs">Operator</Label>
                <Input
                  placeholder="e.g. John Doe"
                  value={form.operator_name}
                  onChange={(e) => setForm({ ...form, operator_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Good Qty Output *</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  className="font-semibold text-emerald-600 dark:text-emerald-400"
                  value={form.good_quantity}
                  onChange={(e) => setForm({ ...form, good_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rejected Qty</Label>
                <Input
                  type="number"
                  min="0"
                  className="text-rose-500 font-semibold"
                  value={form.rejected_quantity}
                  onChange={(e) => setForm({ ...form, rejected_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Running Minutes *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.actual_running_minutes}
                  onChange={(e) => setForm({ ...form, actual_running_minutes: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Live Calculation Banner */}
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block">Expected Output:</span>
                <span className="font-bold text-sm text-foreground">{liveCalculations.expectedQty} units</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Variance:</span>
                <span className={`font-bold text-sm ${liveCalculations.variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {liveCalculations.variance > 0 ? `+${liveCalculations.variance}` : liveCalculations.variance}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Achievement %:</span>
                <span className={`font-bold text-sm ${liveCalculations.achievement >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {liveCalculations.achievement}%
                </span>
              </div>
            </div>

            {/* Plastics & Injection Molding Dynamic Section */}
            {isPlasticsActive && (
              <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Plastics Injection Machine Run
                  </span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.include_injection}
                      onChange={(e) => setForm({ ...form, include_injection: e.target.checked })}
                      className="rounded text-purple-600"
                    />
                    <span>Include Mould Shot Logs</span>
                  </label>
                </div>

                {form.include_injection && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Mould & Cavity Master</Label>
                        <select
                          className="w-full h-9 px-2.5 rounded-md border text-xs bg-background"
                          value={form.mould_id}
                          onChange={(e) => handleMouldChange(e.target.value)}
                        >
                          <option value="">Select injection mould...</option>
                          {moulds?.map((m: PlasticsMould) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.mould_code}) — {m.default_active_cavities} cav, {m.shot_weight_grams}g
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Polymer Raw Material</Label>
                        <select
                          className="w-full h-9 px-2.5 rounded-md border text-xs bg-background"
                          value={form.polymer_item_id}
                          onChange={(e) => setForm({ ...form, polymer_item_id: e.target.value })}
                        >
                          <option value="">Default from BOM / Order</option>
                          {inventoryItems?.map((i: any) => (
                            <option key={i.id} value={i.id}>
                              {i.item_name} ({i.item_code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Number of Shots</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-xs font-semibold"
                          value={form.number_of_shots}
                          onChange={(e) => setForm({ ...form, number_of_shots: parseInt(e.target.value, 10) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Active Cavities</Label>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs"
                          value={form.active_pieces_per_cycle}
                          onChange={(e) => setForm({ ...form, active_pieces_per_cycle: parseInt(e.target.value, 10) || 1 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Actual Cycle (sec)</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.5"
                          className="h-8 text-xs"
                          value={form.actual_cycle_time_sec}
                          onChange={(e) => setForm({ ...form, actual_cycle_time_sec: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Actual Polymer (kg)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder={liveCalculations.stdPolymerKg.toString()}
                          className="h-8 text-xs"
                          value={form.actual_material_kg || ''}
                          onChange={(e) => setForm({ ...form, actual_material_kg: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between pt-1">
                      <span>Expected Output from Shots: <strong>{liveCalculations.expectedFromShots} pcs</strong></span>
                      <span>Standard Polymer Consumption: <strong>{liveCalculations.stdPolymerKg} kg</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setEntryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createEntryMutation.isPending}>
                {createEntryMutation.isPending ? 'Logging Entry...' : 'Save Shift Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Machine Stoppage Modal */}
      <Dialog open={downtimeModalOpen} onOpenChange={setDowntimeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              Log Machine Stoppage
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createDowntimeMutation.mutate(downtimeForm)
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Machine / Work Center *</Label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                value={downtimeForm.machine_id}
                onChange={(e) => setDowntimeForm({ ...downtimeForm, machine_id: e.target.value })}
              >
                <option value="">Select stopped machine...</option>
                {workCenters?.map((wc: any) => (
                  <option key={wc.id} value={wc.id}>
                    {wc.name} ({wc.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Stoppage Reason *</Label>
              <select
                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                value={downtimeForm.reason}
                onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value as any })}
              >
                <option value="electricity_shutdown">Electricity / Power Shutdown</option>
                <option value="machine_breakdown">Machine Mechanical Breakdown</option>
                <option value="tooling_damage">Tooling / Mould Damage</option>
                <option value="material_shortage">Material Shortage</option>
                <option value="production_hold">Supervisor Production Hold</option>
                <option value="other">Other / Stoppage</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Stopped At *</Label>
              <Input
                type="datetime-local"
                required
                value={downtimeForm.stopped_at}
                onChange={(e) => setDowntimeForm({ ...downtimeForm, stopped_at: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Remarks / Observations</Label>
              <Input
                placeholder="e.g. Hydraulic pump overheat, power tripped..."
                value={downtimeForm.remarks}
                onChange={(e) => setDowntimeForm({ ...downtimeForm, remarks: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setDowntimeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={createDowntimeMutation.isPending}>
                Log Stoppage
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
