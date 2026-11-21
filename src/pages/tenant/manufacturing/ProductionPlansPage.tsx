import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPlans,
  createPlan,
  updatePlanStatus,
  deletePlan,
  checkMaterialSufficiency,
  type ProductionPlan,
} from '@/api/manufacturing'
import apiClient from '@/api/client'
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
import { ClipboardList, Plus, AlertTriangle, CheckCircle2, Search, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'

export default function ProductionPlansPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewPlan, setViewPlan] = useState<ProductionPlan | null>(null)

  // Sufficiency check modal state
  const [sufficiencyModalOpen, setSufficiencyModalOpen] = useState(false)
  const [sufficiencyItem, setSufficiencyItem] = useState('')
  const [sufficiencyTargetQty, setSufficiencyTargetQty] = useState(100)
  const [sufficiencyResult, setSufficiencyResult] = useState<any>(null)
  const [checkingSufficiency, setCheckingSufficiency] = useState(false)
  const [sufficiencyViewMode, setSufficiencyViewMode] = useState<'exploded' | 'direct'>('exploded')

  // Inventory items and work centers
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  const { data: workCenters } = useQuery({
    queryKey: ['work-centers-all'],
    queryFn: () => apiClient.get('/v1/manufacturing/work-centers?all=true').then((r) => r.data.data),
  })

  const [formData, setFormData] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
    items: [
      { item_id: '', work_center_id: '', target_quantity: 100, opening_stock: 0, available_capacity_hours: 40 },
    ],
  })

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans', search],
    queryFn: () => fetchPlans({ search }).then((r) => r.data.data),
  })

  const createPlanMutation = useMutation({
    mutationFn: (payload: any) => createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setModalOpen(false)
      toast.success('Production plan created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create production plan')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan deleted')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updatePlanStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan status updated')
    },
  })

  const handleRunSufficiencyCheck = async () => {
    if (!sufficiencyItem) {
      toast.error('Select a finished product first')
      return
    }
    setCheckingSufficiency(true)
    try {
      const res = await checkMaterialSufficiency(sufficiencyItem, sufficiencyTargetQty)
      setSufficiencyResult(res.data.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error running sufficiency check')
    } finally {
      setCheckingSufficiency(false)
    }
  }

  const addPlanLine = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_id: '', work_center_id: '', target_quantity: 100, opening_stock: 0, available_capacity_hours: 40 },
      ],
    })
  }

  const removePlanLine = (idx: number) => {
    if (formData.items.length <= 1) return
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })
  }

  const handlePlanLineChange = (idx: number, field: string, val: any) => {
    const updated = [...formData.items]
    updated[idx] = { ...updated[idx], [field]: val }
    setFormData({ ...formData, items: updated })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.items.some((i) => !i.item_id)) {
      toast.error('Please select an item for each plan line')
      return
    }
    createPlanMutation.mutate(formData)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Production Planning & Capacity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate net required outputs, check machine capacity, and verify raw material sufficiency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSufficiencyResult(null)
              setSufficiencyModalOpen(true)
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-500" />
            Check Material Sufficiency
          </Button>
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Production Plan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Production Plans</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plan code or notes..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Code</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Line Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    Loading production plans...
                  </TableCell>
                </TableRow>
              ) : plans && plans.length > 0 ? (
                plans.map((plan: ProductionPlan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono text-xs font-semibold">{plan.plan_code}</TableCell>
                    <TableCell className="text-xs">
                      {plan.start_date} &rarr; {plan.end_date}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {plan.items?.length ?? 0} item(s)
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          plan.status === 'completed'
                            ? 'success'
                            : plan.status === 'in_progress'
                            ? 'default'
                            : plan.status === 'approved'
                            ? 'outline'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {plan.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{plan.creator?.name ?? 'Admin'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setViewPlan(plan)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {plan.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => statusMutation.mutate({ id: plan.id, status: 'approved' })}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete plan ${plan.plan_code}?`)) {
                              deleteMutation.mutate(plan.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No production plans found. Click &quot;New Production Plan&quot; to begin.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Details Modal */}
      <Dialog open={!!viewPlan} onOpenChange={(open) => !open && setViewPlan(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Plan Details: {viewPlan?.plan_code}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
              <span>Date Range: {viewPlan?.start_date} to {viewPlan?.end_date}</span>
              <Badge variant="outline" className="capitalize">{viewPlan?.status}</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Net Req.</TableHead>
                  <TableHead className="text-right">Capacity Req.</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewPlan?.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">
                      {item.item?.item_name}
                      <span className="block font-mono text-[10px] text-muted-foreground">{item.item?.item_code}</span>
                    </TableCell>
                    <TableCell className="text-xs">{item.work_center?.name ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{Number(item.opening_stock).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium">{Number(item.target_quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-primary">
                      {Number(item.net_required_quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {item.required_capacity_hours}h / {item.available_capacity_hours}h
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.capacity_variance_status === 'deficit' ? 'outline' : 'success'}
                        className={item.capacity_variance_status === 'deficit' ? 'border-rose-500/40 text-rose-600 bg-rose-500/10' : ''}
                      >
                        {item.capacity_variance_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Sufficiency Checker Modal */}
      <Dialog open={sufficiencyModalOpen} onOpenChange={setSufficiencyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Real-Time Material Sufficiency Check
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Finished Product</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={sufficiencyItem}
                  onChange={(e) => setSufficiencyItem(e.target.value)}
                >
                  <option value="">Select finished item...</option>
                  {inventoryItems?.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.item_name} ({i.item_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={sufficiencyTargetQty}
                  onChange={(e) => setSufficiencyTargetQty(parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="sm"
              disabled={checkingSufficiency}
              onClick={handleRunSufficiencyCheck}
            >
              {checkingSufficiency ? 'Analyzing Inventory...' : 'Check Sufficiency Against Current Stock'}
            </Button>

            {sufficiencyResult && (
              <div className="space-y-3 pt-2">
                {/* View Mode Toggle */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex gap-1.5 p-1 bg-muted/60 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSufficiencyViewMode('exploded')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        sufficiencyViewMode === 'exploded'
                          ? 'bg-background shadow-xs text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Multi-Level Exploded Leaf Materials ({sufficiencyResult.exploded_count ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSufficiencyViewMode('direct')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        sufficiencyViewMode === 'direct'
                          ? 'bg-background shadow-xs text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Direct Components (Level 1) ({sufficiencyResult.components_count ?? 0})
                    </button>
                  </div>
                </div>

                {/* Status Alert Banner */}
                {sufficiencyViewMode === 'exploded' ? (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      sufficiencyResult.is_exploded_sufficient
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-rose-500/30 bg-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {sufficiencyResult.is_exploded_sufficient ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      )}
                      <div>
                        <span className="text-sm font-semibold">
                          {sufficiencyResult.is_exploded_sufficient
                            ? 'All multi-level leaf materials are SUFFICIENT in inventory.'
                            : 'MULTI-LEVEL RAW MATERIAL SHORTAGE! Some leaf materials lack required inventory.'}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Exploded across all sub-assemblies including scrap factors for {sufficiencyResult.target_quantity} planned units.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      sufficiencyResult.is_sufficient
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-rose-500/30 bg-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {sufficiencyResult.is_sufficient ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      )}
                      <div>
                        <span className="text-sm font-semibold">
                          {sufficiencyResult.is_sufficient
                            ? 'Direct Level-1 components are SUFFICIENT.'
                            : 'DIRECT COMPONENT SHORTAGE! Some direct components lack stock.'}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Direct components only. Switch to Multi-Level Exploded view to evaluate raw materials for sub-assemblies.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table for Exploded Leaf Materials */}
                {sufficiencyViewMode === 'exploded' && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Raw Material / Leaf Part</TableHead>
                          <TableHead>Used In / Assemblies</TableHead>
                          <TableHead className="text-right">Gross Req. (w/ scrap)</TableHead>
                          <TableHead className="text-right">On-Hand</TableHead>
                          <TableHead className="text-right">Shortage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sufficiencyResult.exploded_materials?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                              No raw materials or components found in exploded BOM.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sufficiencyResult.exploded_materials?.map((m: any) => (
                            <TableRow key={m.item_id} className={!m.is_sufficient ? 'bg-rose-500/5' : ''}>
                              <TableCell className="font-medium text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span>{m.item_name}</span>
                                  <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 font-mono">
                                    {m.component_type || 'raw_material'}
                                  </Badge>
                                </div>
                                <span className="block font-mono text-[10px] text-muted-foreground">
                                  {m.item_code} {m.uom ? `• ${m.uom}` : ''}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {m.sources?.map((s: string, sIdx: number) => (
                                    <span key={sIdx} className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono font-medium">
                                {Number(m.gross_required_quantity).toLocaleString()}{' '}
                                <span className="text-[10px] text-muted-foreground">
                                  (+{Number(m.scrap_quantity || 0).toLocaleString()} scrap)
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono">
                                {Number(m.available_stock).toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right text-xs font-mono font-bold ${
                                  m.shortage_qty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                                }`}
                              >
                                {m.shortage_qty > 0 ? `-${Number(m.shortage_qty).toLocaleString()}` : '0'}
                              </TableCell>
                              <TableCell>
                                {m.is_sufficient ? (
                                  <Badge variant="success">Sufficient</Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-rose-600">Shortage</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Table for Direct Components (Level 1) */}
                {sufficiencyViewMode === 'direct' && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead className="text-right">Required</TableHead>
                          <TableHead className="text-right">On-Hand</TableHead>
                          <TableHead className="text-right">Shortage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sufficiencyResult.components?.map((c: any) => (
                          <TableRow key={c.component_id} className={!c.is_sufficient ? 'bg-rose-500/5' : ''}>
                            <TableCell className="font-medium text-xs">
                              {c.component_name}
                              <span className="block font-mono text-[10px] text-muted-foreground">{c.component_code}</span>
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">{Number(c.required_qty).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs font-mono">{Number(c.available_stock).toLocaleString()}</TableCell>
                            <TableCell className={`text-right text-xs font-mono font-bold ${c.shortage_qty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                              {c.shortage_qty > 0 ? `-${Number(c.shortage_qty).toLocaleString()}` : '0'}
                            </TableCell>
                            <TableCell>
                              {c.is_sufficient ? (
                                <Badge variant="success">Sufficient</Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-rose-600">Shortage</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Production Plan Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Production Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Planned Finished Items
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addPlanLine} className="h-7 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                </Button>
              </div>

              {formData.items.map((line, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-muted/40 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        required
                        className="w-full h-9 px-2 rounded-md border text-xs bg-background"
                        value={line.item_id}
                        onChange={(e) => handlePlanLineChange(idx, 'item_id', e.target.value)}
                      >
                        <option value="">Select product...</option>
                        {inventoryItems?.map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.item_name} ({i.item_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        className="w-full h-9 px-2 rounded-md border text-xs bg-background"
                        value={line.work_center_id}
                        onChange={(e) => handlePlanLineChange(idx, 'work_center_id', e.target.value)}
                      >
                        <option value="">Select machine / work center...</option>
                        {workCenters?.map((wc: any) => (
                          <option key={wc.id} value={wc.id}>
                            {wc.name} ({wc.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Opening stock"
                        className="h-8 text-xs"
                        value={line.opening_stock}
                        onChange={(e) => handlePlanLineChange(idx, 'opening_stock', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Target qty"
                        className="h-8 text-xs font-semibold"
                        value={line.target_quantity}
                        onChange={(e) => handlePlanLineChange(idx, 'target_quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Available hrs"
                        className="h-8 text-xs"
                        value={line.available_capacity_hours}
                        onChange={(e) => handlePlanLineChange(idx, 'available_capacity_hours', parseFloat(e.target.value) || 0)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removePlanLine(idx)}
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createPlanMutation.isPending}>
                {createPlanMutation.isPending ? 'Calculating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
