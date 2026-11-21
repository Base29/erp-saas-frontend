import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMoulds,
  createMould,
  updateMould,
  deleteMould,
  type PlasticsMould,
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
import { Sparkles, Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function MouldsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMould, setEditingMould] = useState<PlasticsMould | null>(null)

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  const [form, setForm] = useState({
    mould_code: '',
    name: '',
    item_id: '',
    total_cavities: 4,
    default_active_cavities: 4,
    standard_cycle_time_sec: 25,
    shot_weight_grams: 48,
    status: 'active' as 'active' | 'damaged' | 'under_repair' | 'retired',
    notes: '',
  })

  const { data: moulds, isLoading } = useQuery({
    queryKey: ['moulds', search],
    queryFn: () => fetchMoulds({ search, all: true }).then((r) => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingMould ? updateMould(editingMould.id, payload) : createMould(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moulds'] })
      setModalOpen(false)
      setEditingMould(null)
      toast.success(editingMould ? 'Mould updated successfully' : 'Mould created successfully')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save mould'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMould(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moulds'] })
      toast.success('Mould deleted')
    },
  })

  const handleOpenModal = (mould?: PlasticsMould) => {
    if (mould) {
      setEditingMould(mould)
      setForm({
        mould_code: mould.mould_code,
        name: mould.name,
        item_id: mould.item_id,
        total_cavities: mould.total_cavities,
        default_active_cavities: mould.default_active_cavities,
        standard_cycle_time_sec: Number(mould.standard_cycle_time_sec),
        shot_weight_grams: Number(mould.shot_weight_grams),
        status: mould.status,
        notes: mould.notes || '',
      })
    } else {
      setEditingMould(null)
      setForm({
        mould_code: `MLD-${Date.now().toString().slice(-5)}`,
        name: '',
        item_id: '',
        total_cavities: 4,
        default_active_cavities: 4,
        standard_cycle_time_sec: 25,
        shot_weight_grams: 48,
        status: 'active',
        notes: '',
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item_id) {
      toast.error('Select the molded part or product')
      return
    }
    saveMutation.mutate(form)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Mould & Cavity Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plastics industry extension: manage injection moulds, cavity configurations, shot weights, and lifetime shot counters.
          </p>
        </div>

        <Button onClick={() => handleOpenModal()} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Mould
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Registered Injection Moulds</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mould code or name..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mould Code</TableHead>
                <TableHead>Mould Name</TableHead>
                <TableHead>Part Produced</TableHead>
                <TableHead className="text-right">Cavities (Act/Tot)</TableHead>
                <TableHead className="text-right">Shot Weight</TableHead>
                <TableHead className="text-right">Cycle (sec)</TableHead>
                <TableHead className="text-right">Lifetime Shots</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    Loading injection moulds...
                  </TableCell>
                </TableRow>
              ) : moulds && moulds.length > 0 ? (
                moulds.map((mould) => (
                  <TableRow key={mould.id}>
                    <TableCell className="font-mono text-xs font-semibold">{mould.mould_code}</TableCell>
                    <TableCell className="font-medium text-sm">{mould.name}</TableCell>
                    <TableCell className="text-xs">
                      {mould.item?.item_name}
                      <span className="block font-mono text-[10px] text-muted-foreground">{mould.item?.item_code}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium">
                      {mould.default_active_cavities} / {mould.total_cavities} cav
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-semibold text-foreground">
                      {mould.shot_weight_grams} g
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">{mould.standard_cycle_time_sec}s</TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {Number(mould.total_shots_lifetime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={mould.status === 'active' ? 'success' : mould.status === 'under_repair' ? 'outline' : 'secondary'}
                        className={mould.status === 'under_repair' ? 'border-amber-500/40 text-amber-600 bg-amber-500/10' : mould.status === 'damaged' ? 'bg-rose-500 text-white' : ''}
                      >
                        {mould.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenModal(mould)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete mould ${mould.name}?`)) {
                              deleteMutation.mutate(mould.id)
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
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    No injection moulds registered. Click &quot;Add Mould&quot; to configure toolings.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Mould Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMould ? 'Edit Injection Mould' : 'Add Injection Mould'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mould Code *</Label>
                <Input
                  required
                  placeholder="e.g. MLD-001"
                  value={form.mould_code}
                  onChange={(e) => setForm({ ...form, mould_code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mould Name *</Label>
                <Input
                  required
                  placeholder="e.g. Bottle Cap 28mm 8-Cav"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Component or Finished Product Produced *</Label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                value={form.item_id}
                onChange={(e) => setForm({ ...form, item_id: e.target.value })}
              >
                <option value="">Select molded part...</option>
                {inventoryItems?.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.item_name} ({i.item_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Cavities *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.total_cavities}
                  onChange={(e) => setForm({ ...form, total_cavities: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Active Cavities *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.default_active_cavities}
                  onChange={(e) => setForm({ ...form, default_active_cavities: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Standard Shot Weight (grams) *</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={form.shot_weight_grams}
                  onChange={(e) => setForm({ ...form, shot_weight_grams: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Standard Cycle Time (sec) *</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={form.standard_cycle_time_sec}
                  onChange={(e) => setForm({ ...form, standard_cycle_time_sec: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mould Status</Label>
              <select
                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="damaged">Damaged</option>
                <option value="under_repair">Under Repair</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Mould'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
