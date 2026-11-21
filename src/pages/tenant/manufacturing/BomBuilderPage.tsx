import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBoms,
  fetchBomTree,
  fetchBomExploded,
  createBom,
  updateBom,
  deleteBom,
  type BillOfMaterial,
  type BomItem,
  type BomTreeNode,
  type ComponentType,
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
import {
  Layers,
  Plus,
  Search,
  Trash2,
  Edit2,
  Network,
  Calculator,
  ChevronDown,
  ChevronRight,
  Boxes,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Recursive Tree Node Renderer for Multi-Level Indented Tree
function BomTreeNodeRow({
  node,
  simulationQty,
  parentMultiplier = 1,
}: {
  node: BomTreeNode
  simulationQty: number
  parentMultiplier?: number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  const effectiveMultiplier = parentMultiplier * node.quantity_per_parent * (1 + (node.scrap_percentage || 0) / 100)
  const calculatedTotal = simulationQty * effectiveMultiplier

  const typeColorMap: Record<ComponentType, { bg: string; text: string; border: string }> = {
    sub_assembly: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/30',
    },
    raw_material: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/30',
    },
    hardware: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
    },
    packaging: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
    },
  }

  const badgeStyle = typeColorMap[node.component_type] || typeColorMap.raw_material

  return (
    <div className="relative border-l-2 border-border/70 ml-2 sm:ml-4 pl-3 sm:pl-4 py-1.5 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-muted rounded text-muted-foreground transition-transform"
              title={isExpanded ? 'Collapse sub-assembly' : 'Expand sub-assembly'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-5 flex items-center justify-center text-muted-foreground/50">
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-xs text-foreground">{node.component_name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">({node.component_code})</span>

              <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-full border capitalize', badgeStyle.bg, badgeStyle.text, badgeStyle.border)}>
                Lvl {node.level} • {node.component_type.replace('_', ' ')}
              </span>

              {node.has_child_bom && (
                <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                  <Workflow className="h-2.5 w-2.5 mr-1" />
                  BOM: {node.child_bom_number}
                </Badge>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground mt-0.5">
              Usage ratio: <span className="font-semibold text-foreground">{node.quantity_per_parent}</span> {node.uom} per parent
              {node.scrap_percentage > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1.5 font-medium">
                  (+{node.scrap_percentage}% scrap allowance)
                </span>
              )}
              {node.notes && <span className="italic ml-2 text-muted-foreground/80">— {node.notes}</span>}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 pl-7 sm:pl-0">
          <div className="text-xs font-mono font-bold text-primary">
            {calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {node.uom}
          </div>
          <div className="text-[10px] text-muted-foreground">Calculated for {simulationQty} FG units</div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-1.5">
          {node.children.map((childNode, index) => (
            <BomTreeNodeRow
              key={childNode.bom_item_id || index}
              node={childNode}
              simulationQty={simulationQty}
              parentMultiplier={effectiveMultiplier}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BomBuilderPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBom, setEditingBom] = useState<BillOfMaterial | null>(null)

  // Multi-Level Tree Modal State
  const [treeModalOpen, setTreeModalOpen] = useState(false)
  const [selectedBomForTree, setSelectedBomForTree] = useState<BillOfMaterial | null>(null)
  const [treeSimulationQty, setTreeSimulationQty] = useState<number>(100)

  // Exploded Materials Simulator Modal State
  const [explodedModalOpen, setExplodedModalOpen] = useState(false)
  const [selectedBomForExplosion, setSelectedBomForExplosion] = useState<BillOfMaterial | null>(null)
  const [explosionSimulationQty, setExplosionSimulationQty] = useState<number>(500)

  // Items for dropdown
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  // All active BOMs for child_bom dropdown
  const { data: allBoms } = useQuery({
    queryKey: ['boms-all-list'],
    queryFn: () => fetchBoms({ all: true }).then((r) => r.data.data),
  })

  const [formData, setFormData] = useState({
    bom_number: '',
    item_id: '',
    batch_size: 1,
    cycle_time_sec: 60,
    units_per_carton: 12,
    is_active: true,
    notes: '',
    items: [
      {
        component_item_id: '',
        component_type: 'raw_material' as ComponentType,
        child_bom_id: null as string | null,
        level: 1,
        sequence: 1,
        quantity_per_parent: 1,
        scrap_percentage: 0,
        notes: '',
      },
    ],
  })

  const { data: boms, isLoading } = useQuery({
    queryKey: ['boms', search],
    queryFn: () => fetchBoms({ search, all: true }).then((r) => r.data.data),
  })

  // Query for Indented Tree
  const { data: treeData, isLoading: loadingTree } = useQuery({
    queryKey: ['bom-tree', selectedBomForTree?.id],
    queryFn: () => fetchBomTree(selectedBomForTree!.id).then((r) => r.data.data),
    enabled: Boolean(selectedBomForTree && treeModalOpen),
  })

  // Query for Exploded Materials
  const { data: explodedData, isLoading: loadingExplosion } = useQuery({
    queryKey: ['bom-exploded', selectedBomForExplosion?.id, explosionSimulationQty],
    queryFn: () => fetchBomExploded(selectedBomForExplosion!.id, explosionSimulationQty).then((r) => r.data.data),
    enabled: Boolean(selectedBomForExplosion && explodedModalOpen),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingBom ? updateBom(editingBom.id, payload) : createBom(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      queryClient.invalidateQueries({ queryKey: ['boms-all-list'] })
      setModalOpen(false)
      setEditingBom(null)
      toast.success(editingBom ? 'BOM updated successfully' : 'BOM created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save BOM')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      queryClient.invalidateQueries({ queryKey: ['boms-all-list'] })
      toast.success('BOM deleted')
    },
    onError: () => toast.error('Failed to delete BOM'),
  })

  const handleOpenModal = (bom?: BillOfMaterial) => {
    if (bom) {
      setEditingBom(bom)
      setFormData({
        bom_number: bom.bom_number,
        item_id: bom.item_id,
        batch_size: Number(bom.batch_size),
        cycle_time_sec: Number(bom.cycle_time_sec),
        units_per_carton: Number(bom.units_per_carton),
        is_active: bom.is_active,
        notes: bom.notes || '',
        items: bom.items.map((i: BomItem, index: number) => ({
          component_item_id: i.component_item_id,
          component_type: (i.component_type || 'raw_material') as ComponentType,
          child_bom_id: i.child_bom_id || null,
          level: Number(i.level || 1),
          sequence: Number(i.sequence || index + 1),
          quantity_per_parent: Number(i.quantity_per_parent),
          scrap_percentage: Number(i.scrap_percentage),
          notes: i.notes || '',
        })),
      })
    } else {
      setEditingBom(null)
      setFormData({
        bom_number: `BOM-${Date.now().toString().slice(-6)}`,
        item_id: '',
        batch_size: 1,
        cycle_time_sec: 60,
        units_per_carton: 12,
        is_active: true,
        notes: '',
        items: [
          {
            component_item_id: '',
            component_type: 'raw_material',
            child_bom_id: null,
            level: 1,
            sequence: 1,
            quantity_per_parent: 1,
            scrap_percentage: 0,
            notes: '',
          },
        ],
      })
    }
    setModalOpen(true)
  }

  const handleOpenTreeModal = (bom: BillOfMaterial) => {
    setSelectedBomForTree(bom)
    setTreeModalOpen(true)
  }

  const handleOpenExplodedModal = (bom: BillOfMaterial) => {
    setSelectedBomForExplosion(bom)
    setExplodedModalOpen(true)
  }

  const addComponentRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          component_item_id: '',
          component_type: 'raw_material',
          child_bom_id: null,
          level: 1,
          sequence: formData.items.length + 1,
          quantity_per_parent: 1,
          scrap_percentage: 0,
          notes: '',
        },
      ],
    })
  }

  const removeComponentRow = (index: number) => {
    if (formData.items.length <= 1) return
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const handleRowChange = (index: number, field: string, val: any) => {
    const updated = [...formData.items]
    updated[index] = { ...updated[index], [field]: val }

    // If changing to non-sub_assembly, clear child_bom_id
    if (field === 'component_type' && val !== 'sub_assembly') {
      updated[index].child_bom_id = null
    }

    setFormData({ ...formData, items: updated })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.item_id) {
      toast.error('Please select the parent finished item')
      return
    }
    if (formData.items.some((i) => !i.component_item_id)) {
      toast.error('Please select a component item for each row')
      return
    }
    saveMutation.mutate(formData)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Multi-Level Bills of Materials (BOM)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build hierarchical assembly recipes, link sub-assemblies (e.g. blade sprocket, molded base), track leaf raw materials, and explode gross requirements.
          </p>
        </div>

        <Button onClick={() => handleOpenModal()} size="sm" className="shadow-xs">
          <Plus className="h-4 w-4 mr-1.5" />
          Create New BOM
        </Button>
      </div>

      {/* Registry Table */}
      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">BOM Master Registry</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Explore finished assemblies, view indented trees, and simulate material rollups</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by BOM code, product name or code..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BOM Code</TableHead>
                <TableHead>Parent Product</TableHead>
                <TableHead>Direct Components</TableHead>
                <TableHead className="text-right">Cycle Time</TableHead>
                <TableHead className="text-right">Units / Carton</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hierarchical Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    Loading Bills of Materials...
                  </TableCell>
                </TableRow>
              ) : boms && boms.length > 0 ? (
                boms.map((bom) => {
                  const subAssemblyCount = bom.items?.filter((i) => i.component_type === 'sub_assembly' || i.child_bom_id).length || 0

                  return (
                    <TableRow key={bom.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-primary">{bom.bom_number}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {bom.item?.item_name}
                        <span className="block text-xs text-muted-foreground font-mono">{bom.item?.item_code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold">{bom.items?.length ?? 0} components</span>
                          {subAssemblyCount > 0 && (
                            <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10">
                              {subAssemblyCount} sub-assembly
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">{bom.cycle_time_sec}s</TableCell>
                      <TableCell className="text-right text-xs font-mono">{bom.units_per_carton} / carton</TableCell>
                      <TableCell>
                        <Badge variant={bom.is_active ? 'success' : 'secondary'}>
                          {bom.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Indented Tree Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            onClick={() => handleOpenTreeModal(bom)}
                            title="View Indented Multi-Level BOM Tree"
                          >
                            <Network className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Indented Tree</span>
                          </Button>

                          {/* Exploded Rollup Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => handleOpenExplodedModal(bom)}
                            title="Simulate Exploded Raw Materials Rollup"
                          >
                            <Calculator className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Exploded</span>
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenModal(bom)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete BOM ${bom.bom_number}?`)) {
                                deleteMutation.mutate(bom.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No BOMs created yet. Click &quot;Create New BOM&quot; to build an assembly recipe.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 1. Indented Multi-Level Tree Modal ─────────────────────────────── */}
      <Dialog open={treeModalOpen} onOpenChange={setTreeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Indented Multi-Level Tree — {selectedBomForTree?.bom_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Header info & Simulation Target Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-purple-700 dark:text-purple-300">
                  Level 0: Finished Product
                </span>
                <div className="text-sm font-semibold text-foreground">
                  {treeData?.item_name || selectedBomForTree?.item?.item_name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    ({treeData?.item_code || selectedBomForTree?.item?.item_code})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="tree_sim_qty" className="text-xs shrink-0 font-medium">
                  Simulation Target (FG Units):
                </Label>
                <Input
                  id="tree_sim_qty"
                  type="number"
                  min="1"
                  step="1"
                  value={treeSimulationQty}
                  onChange={(e) => setTreeSimulationQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 h-8 text-xs font-mono font-bold text-right"
                />
              </div>
            </div>

            {/* Tree Container */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              {loadingTree ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Exploding multi-level BOM hierarchy...
                </div>
              ) : treeData && treeData.children && treeData.children.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Boxes className="h-4 w-4" />
                    Hierarchical Sub-Assemblies & Materials Breakdown:
                  </div>

                  {treeData.children.map((childNode, index) => (
                    <BomTreeNodeRow
                      key={childNode.bom_item_id || index}
                      node={childNode}
                      simulationQty={treeSimulationQty}
                      parentMultiplier={1}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No components defined in this BOM.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTreeModalOpen(false)}>
                Close Indented Tree
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 2. Exploded Materials Simulator Modal ───────────────────────────── */}
      <Dialog open={explodedModalOpen} onOpenChange={setExplodedModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              Consolidated Exploded Raw Materials Rollup
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/20">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-cyan-700 dark:text-cyan-300">
                  Target Finished Assembly
                </span>
                <div className="text-sm font-semibold text-foreground">
                  {selectedBomForExplosion?.item?.item_name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground font-normal">
                    ({selectedBomForExplosion?.bom_number})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="expl_sim_qty" className="text-xs shrink-0 font-medium">
                  Planned Quantity (Units):
                </Label>
                <Input
                  id="expl_sim_qty"
                  type="number"
                  min="1"
                  step="1"
                  value={explosionSimulationQty}
                  onChange={(e) => setExplosionSimulationQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-28 h-8 text-xs font-mono font-bold text-right"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              This table traverses through all sub-assemblies (blades, molded bases, handles, etc.) and provides the single rolled-up gross quantity of raw materials and purchased components needed to fulfill the batch.
            </p>

            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material / Component</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="text-right">Net Req.</TableHead>
                    <TableHead className="text-right">Scrap Added</TableHead>
                    <TableHead className="text-right">Gross Required</TableHead>
                    <TableHead>Demanded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExplosion ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                        Calculating multi-level exploded material roll-up...
                      </TableCell>
                    </TableRow>
                  ) : explodedData?.materials && explodedData.materials.length > 0 ? (
                    explodedData.materials.map((mat) => (
                      <TableRow key={mat.item_id}>
                        <TableCell className="font-medium text-xs">
                          {mat.item_name}
                          <span className="block font-mono text-[10px] text-muted-foreground">{mat.item_code}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {mat.component_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {mat.net_required_quantity?.toLocaleString()} {mat.uom}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-amber-600 dark:text-amber-400">
                          +{mat.scrap_quantity?.toLocaleString()} {mat.uom}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-bold text-primary">
                          {mat.gross_required_quantity?.toLocaleString()} {mat.uom}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {mat.sources?.map((src, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px]">
                                {src.parent_item_name} ({src.quantity_demanded} {mat.uom})
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                        No materials rolled up.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setExplodedModalOpen(false)}>
                Close Rollup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 3. BOM Builder Form Modal ───────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBom ? 'Edit Multi-Level Bill of Materials' : 'Create Multi-Level Bill of Materials'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bom_number" className="text-xs">BOM Reference Code *</Label>
                <Input
                  id="bom_number"
                  required
                  value={formData.bom_number}
                  onChange={(e) => setFormData({ ...formData, bom_number: e.target.value })}
                  placeholder="e.g. BOM-BLENDER-JUG-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item_id" className="text-xs">Parent Finished / Assembly Item *</Label>
                <select
                  id="item_id"
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.item_id}
                  onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                >
                  <option value="">Select finished item or assembly...</option>
                  {inventoryItems?.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} ({item.item_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cycle" className="text-xs">Cycle Time (sec / unit)</Label>
                <Input
                  id="cycle"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.cycle_time_sec}
                  onChange={(e) => setFormData({ ...formData, cycle_time_sec: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carton" className="text-xs">Units / Master Carton</Label>
                <Input
                  id="carton"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.units_per_carton}
                  onChange={(e) => setFormData({ ...formData, units_per_carton: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch" className="text-xs">Standard Batch Size</Label>
                <Input
                  id="batch"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Component Line Items */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assembly Components, Sub-Assemblies & Materials
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Classify components as Raw Material, Sub-Assembly (with optional linked BOM), Hardware, or Packaging.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addComponentRow} className="h-7 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Component Line
                </Button>
              </div>

              <div className="space-y-2">
                {formData.items.map((row, idx) => {
                  const isSubAssembly = row.component_type === 'sub_assembly'

                  return (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        {/* Component Item Select */}
                        <div className="sm:col-span-5">
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Component Item *</Label>
                          <select
                            required
                            className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                            value={row.component_item_id}
                            onChange={(e) => handleRowChange(idx, 'component_item_id', e.target.value)}
                          >
                            <option value="">Select item...</option>
                            {inventoryItems?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.item_name} ({item.item_code})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Classification */}
                        <div className="sm:col-span-3">
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Classification</Label>
                          <select
                            className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                            value={row.component_type}
                            onChange={(e) => handleRowChange(idx, 'component_type', e.target.value)}
                          >
                            <option value="raw_material">Raw Material</option>
                            <option value="sub_assembly">Sub-Assembly</option>
                            <option value="hardware">Hardware / Bought-out</option>
                            <option value="packaging">Packaging Material</option>
                          </select>
                        </div>

                        {/* Qty per parent */}
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Qty / Parent *</Label>
                          <Input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            placeholder="Qty"
                            className="h-9 text-xs"
                            value={row.quantity_per_parent}
                            onChange={(e) => handleRowChange(idx, 'quantity_per_parent', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Scrap % */}
                        <div className="sm:col-span-1">
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Scrap %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            placeholder="%"
                            className="h-9 text-xs"
                            value={row.scrap_percentage}
                            onChange={(e) => handleRowChange(idx, 'scrap_percentage', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Delete action */}
                        <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeComponentRow(idx)}
                            disabled={formData.items.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* If Sub-Assembly: Linked Child BOM Selector */}
                      {isSubAssembly && (
                        <div className="pt-2 border-t border-dashed border-border flex flex-col sm:flex-row sm:items-center gap-2 bg-purple-500/5 p-2 rounded-md">
                          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 shrink-0 flex items-center gap-1">
                            <Workflow className="h-3.5 w-3.5" />
                            Linked Sub-BOM:
                          </span>
                          <select
                            className="flex-1 h-8 px-2 rounded-md border border-purple-500/30 bg-background text-xs"
                            value={row.child_bom_id || ''}
                            onChange={(e) => handleRowChange(idx, 'child_bom_id', e.target.value || null)}
                          >
                            <option value="">Auto-resolve active BOM for this item</option>
                            {allBoms
                              ?.filter((b) => b.id !== editingBom?.id) // Prevent self-linking
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bom_number} — {b.item?.item_name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="notes" className="text-xs">Manufacturing Engineering Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional assembly instructions, tolerances, or quality checkpoints..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save BOM'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
