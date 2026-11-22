import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBom,
  fetchBoms,
  createBom,
  updateBom,
  fetchBomSections,
  type BomItem,
  type ComponentType,
} from '@/api/manufacturing'
import apiClient from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Layers,
  Plus,
  Trash2,
  Workflow,
  FolderTree,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { BomSectionManagerDialog } from '@/components/manufacturing/BomSectionManagerDialog'

export default function BomFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()

  const [sectionsDialogOpen, setSectionsDialogOpen] = useState(false)
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all')

  const [formData, setFormData] = useState({
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
        bom_section_id: null as string | null,
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

  // Finished & Component inventory items
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  // All active BOMs for child_bom dropdown
  const { data: allBoms } = useQuery({
    queryKey: ['boms-all-list'],
    queryFn: () => fetchBoms({ all: true }).then((r) => r.data.data),
  })

  // Pre-configured BOM Sections managed by tenant admin
  const { data: bomSections } = useQuery({
    queryKey: ['bom-sections-active'],
    queryFn: () => fetchBomSections({ is_active: true }).then((r) => r.data.data),
  })

  // Fetch BOM if in edit mode
  const { data: existingBom, isLoading: loadingExisting } = useQuery({
    queryKey: ['bom', id],
    queryFn: () => fetchBom(id!).then((r) => r.data.data),
    enabled: isEditing,
  })

  useEffect(() => {
    if (existingBom) {
      setFormData({
        bom_number: existingBom.bom_number,
        item_id: existingBom.item_id,
        batch_size: Number(existingBom.batch_size),
        cycle_time_sec: Number(existingBom.cycle_time_sec),
        units_per_carton: Number(existingBom.units_per_carton),
        is_active: existingBom.is_active,
        notes: existingBom.notes || '',
        items: existingBom.items.map((i: BomItem, index: number) => ({
          component_item_id: i.component_item_id,
          bom_section_id: i.bom_section_id || null,
          component_type: (i.component_type || 'raw_material') as ComponentType,
          child_bom_id: i.child_bom_id || null,
          level: Number(i.level || 1),
          sequence: Number(i.sequence || index + 1),
          quantity_per_parent: Number(i.quantity_per_parent),
          scrap_percentage: Number(i.scrap_percentage),
          notes: i.notes || '',
        })),
      })
    }
  }, [existingBom])

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEditing ? updateBom(id!, payload) : createBom(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      queryClient.invalidateQueries({ queryKey: ['boms-all-list'] })
      toast.success(isEditing ? 'BOM updated successfully' : 'BOM created successfully')
      navigate('/manufacturing/boms')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save Bill of Materials')
    },
  })

  const addComponentRow = (targetSectionId?: string | null) => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          component_item_id: '',
          bom_section_id: targetSectionId || (activeSectionFilter !== 'all' ? activeSectionFilter : null),
          component_type: 'raw_material',
          child_bom_id: null,
          level: 1,
          sequence: prev.items.length + 1,
          quantity_per_parent: 1,
          scrap_percentage: 0,
          notes: '',
        },
      ],
    }))
  }

  const removeComponentRow = (index: number) => {
    if (formData.items.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
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

  // Filter items for display if a specific section is selected
  const displayedItems = activeSectionFilter === 'all'
    ? formData.items
    : formData.items.filter((i) => (i.bom_section_id || 'unassigned') === activeSectionFilter)

  if (isEditing && loadingExisting) {
    return (
      <div className="p-8 w-full flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        Loading Bill of Materials details...
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full max-w-full">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/manufacturing/boms')}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground mb-1 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to BOM Registry
          </Button>

          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            {isEditing ? `Edit BOM — ${formData.bom_number}` : 'Create Bill of Materials (BOM)'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure parent product specifications, group components into manufacturing sections, and define multi-level assembly recipes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/manufacturing/boms')}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSectionsDialogOpen(true)}
            className="text-xs gap-1.5 border-border/80"
          >
            <FolderTree className="h-3.5 w-3.5 text-primary" />
            Manage Sections
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="text-xs gap-1.5"
          >
            <Check className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create BOM'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Parent Finished Product & Production Parameters */}
        <Card className="w-full bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-base font-semibold">1. Product & Production Parameters</CardTitle>
            <CardDescription className="text-xs">
              Basic product identity, rated engineering cycle time, and packaging metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* BOM Reference Code */}
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="bom_number" className="text-xs font-medium">BOM Reference Code *</Label>
                <Input
                  id="bom_number"
                  required
                  value={formData.bom_number}
                  onChange={(e) => setFormData({ ...formData, bom_number: e.target.value })}
                  placeholder="e.g. BOM-BLENDER-JUG-01"
                  className="h-9 text-xs font-mono font-medium"
                />
              </div>

              {/* Parent Product */}
              <div className="md:col-span-5 space-y-1.5">
                <Label htmlFor="item_id" className="text-xs font-medium">Parent Finished / Assembly Item *</Label>
                <select
                  id="item_id"
                  required
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
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

              {/* Status */}
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs font-medium">Lifecycle Status</Label>
                <div className="flex items-center h-9 px-3 rounded-md border border-input bg-background">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer w-full">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-input text-primary"
                    />
                    <span className="font-medium">{formData.is_active ? 'Active & Ready' : 'Inactive (Draft)'}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Cycle Time */}
              <div className="space-y-1.5">
                <Label htmlFor="cycle" className="text-xs font-medium">Cycle Time (sec / unit)</Label>
                <Input
                  id="cycle"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.cycle_time_sec}
                  onChange={(e) => setFormData({ ...formData, cycle_time_sec: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Machine cycle or assembly duration for 1 unit.
                </span>
              </div>

              {/* Units / Carton */}
              <div className="space-y-1.5">
                <Label htmlFor="carton" className="text-xs font-medium">Units / Master Carton</Label>
                <Input
                  id="carton"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.units_per_carton}
                  onChange={(e) => setFormData({ ...formData, units_per_carton: parseInt(e.target.value, 10) || 1 })}
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Standard packaging ratio for shipping containers.
                </span>
              </div>

              {/* Batch Size */}
              <div className="space-y-1.5">
                <Label htmlFor="batch" className="text-xs font-medium">Standard Batch Size</Label>
                <Input
                  id="batch"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: parseFloat(e.target.value) || 1 })}
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Multiplier for component quantity formulas.
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="notes" className="text-xs font-medium">Engineering & Process Instructions</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional tolerances, quality checkpoints, or tooling notes..."
                className="h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Manufacturing Sections, Components & Materials */}
        <Card className="w-full bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  2. Bill of Materials Recipe ({formData.items.length} items)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Organize materials by process section (e.g. Moulding, Assembly, Hardware, Packaging) for clean shop-floor routing.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponentRow()}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Component Line
                </Button>
              </div>
            </div>

            {/* Section Filter / Quick-Add Bar */}
            {bomSections && bomSections.length > 0 && (
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 mt-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">Filter View:</span>
                  <button
                    type="button"
                    onClick={() => setActiveSectionFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      activeSectionFilter === 'all'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Sections ({formData.items.length})
                  </button>
                  {bomSections.map((sec) => {
                    const count = formData.items.filter((i) => i.bom_section_id === sec.id).length
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveSectionFilter(sec.id)}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
                          activeSectionFilter === sec.id
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>{sec.name}</span>
                        <span className="px-1 py-0 text-[10px] rounded bg-background/20 font-mono">{count}</span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setActiveSectionFilter('unassigned')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      activeSectionFilter === 'unassigned'
                        ? 'bg-amber-600 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Unassigned ({formData.items.filter((i) => !i.bom_section_id).length})
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mr-1">
                    Quick-Add:
                  </span>
                  {bomSections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => addComponentRow(sec.id)}
                      className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium transition-colors"
                      title={`Add item to ${sec.name}`}
                    >
                      + {sec.code || sec.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-6 space-y-3">
            {displayedItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10 space-y-2">
                <p>No components in this filtered view.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addComponentRow(activeSectionFilter !== 'all' ? activeSectionFilter : null)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add item to this section
                </Button>
              </div>
            ) : (
              displayedItems.map((row) => {
                const originalIndex = formData.items.indexOf(row)
                const isSubAssembly = row.component_type === 'sub_assembly'

                return (
                  <div
                    key={originalIndex}
                    className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/30 transition-all space-y-3 shadow-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Component Item Select */}
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Component Item *</Label>
                        <select
                          required
                          className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                          value={row.component_item_id}
                          onChange={(e) => handleRowChange(originalIndex, 'component_item_id', e.target.value)}
                        >
                          <option value="">Select item or component...</option>
                          {inventoryItems?.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.item_name} ({item.item_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Process Section Select */}
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <FolderTree className="h-3 w-3 text-indigo-500" />
                          Process Section
                        </Label>
                        <select
                          className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                          value={row.bom_section_id || ''}
                          onChange={(e) => handleRowChange(originalIndex, 'bom_section_id', e.target.value || null)}
                        >
                          <option value="">(General / Direct Material)</option>
                          {bomSections?.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.name} {sec.code ? `[${sec.code}]` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Classification */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Classification</Label>
                        <select
                          className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                          value={row.component_type}
                          onChange={(e) => handleRowChange(originalIndex, 'component_type', e.target.value)}
                        >
                          <option value="raw_material">Raw Material</option>
                          <option value="sub_assembly">Sub-Assembly</option>
                          <option value="hardware">Hardware / Parts</option>
                          <option value="packaging">Packaging</option>
                        </select>
                      </div>

                      {/* Qty per parent */}
                      <div className="sm:col-span-1 space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Qty / Parent *</Label>
                        <Input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          placeholder="Qty"
                          className="h-9 text-xs font-mono font-medium"
                          value={row.quantity_per_parent}
                          onChange={(e) =>
                            handleRowChange(originalIndex, 'quantity_per_parent', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* Scrap % */}
                      <div className="sm:col-span-1 space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Scrap %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="%"
                          className="h-9 text-xs font-mono"
                          value={row.scrap_percentage}
                          onChange={(e) =>
                            handleRowChange(originalIndex, 'scrap_percentage', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* Delete action */}
                      <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeComponentRow(originalIndex)}
                          disabled={formData.items.length <= 1}
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Sub-Assembly Linked BOM selector */}
                    {isSubAssembly && (
                      <div className="pt-2.5 border-t border-dashed border-purple-500/20 flex flex-col sm:flex-row sm:items-center gap-2 bg-purple-500/5 p-2.5 rounded-lg">
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 shrink-0 flex items-center gap-1.5">
                          <Workflow className="h-3.5 w-3.5" />
                          Sub-BOM Definition:
                        </span>
                        <select
                          className="flex-1 h-8 px-2.5 rounded-md border border-purple-500/30 bg-background text-xs font-medium"
                          value={row.child_bom_id || ''}
                          onChange={(e) => handleRowChange(originalIndex, 'child_bom_id', e.target.value || null)}
                        >
                          <option value="">Auto-resolve active BOM for this item</option>
                          {allBoms
                            ?.filter((b) => b.id !== id)
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
              })
            )}

            <div className="pt-3 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addComponentRow(activeSectionFilter !== 'all' ? activeSectionFilter : null)}
                className="text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Component Line
              </Button>

              <span className="text-xs font-mono text-muted-foreground">
                Total Recipe Lines: {formData.items.length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/manufacturing/boms')}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="min-w-32"
          >
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Bill of Materials' : 'Save & Publish BOM'}
          </Button>
        </div>
      </form>

      {/* BOM Section Manager Dialog */}
      <BomSectionManagerDialog
        open={sectionsDialogOpen}
        onOpenChange={setSectionsDialogOpen}
      />
    </div>
  )
}
