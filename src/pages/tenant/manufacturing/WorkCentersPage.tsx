import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchWorkCenters,
  createWorkCenter,
  updateWorkCenter,
  deleteWorkCenter,
  type WorkCenter,
} from '@/api/manufacturing'
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
import { Cpu, Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function WorkCentersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCenter, setEditingCenter] = useState<WorkCenter | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'assembly',
    hourly_capacity: 0,
    daily_capacity: 0,
    standard_availability_hours: 8,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['work-centers', search],
    queryFn: () => fetchWorkCenters({ search, all: true }).then((r) => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingCenter
        ? updateWorkCenter(editingCenter.id, payload)
        : createWorkCenter(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] })
      setModalOpen(false)
      setEditingCenter(null)
      toast.success(editingCenter ? 'Work center updated' : 'Work center created')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save work center')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] })
      toast.success('Work center deleted')
    },
    onError: () => toast.error('Failed to delete work center'),
  })

  const handleOpenModal = (center?: WorkCenter) => {
    if (center) {
      setEditingCenter(center)
      setFormData({
        code: center.code,
        name: center.name,
        type: center.type || 'assembly',
        hourly_capacity: Number(center.hourly_capacity),
        daily_capacity: Number(center.daily_capacity),
        standard_availability_hours: Number(center.standard_availability_hours),
        status: center.status,
        notes: center.notes || '',
      })
    } else {
      setEditingCenter(null)
      setFormData({
        code: '',
        name: '',
        type: 'assembly',
        hourly_capacity: 0,
        daily_capacity: 0,
        standard_availability_hours: 8,
        status: 'active',
        notes: '',
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Work Centers & Machines
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage factory equipment, production lines, hourly capacity, and availability schedules.
          </p>
        </div>

        <Button onClick={() => handleOpenModal()} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Work Center
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Registered Machines</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Hourly Cap.</TableHead>
                <TableHead className="text-right">Daily Cap.</TableHead>
                <TableHead className="text-right">Std. Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    Loading work centers...
                  </TableCell>
                </TableRow>
              ) : data && data.length > 0 ? (
                data.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-mono text-xs font-semibold">{center.code}</TableCell>
                    <TableCell className="font-medium text-sm">{center.name}</TableCell>
                    <TableCell className="capitalize text-xs text-muted-foreground">{(center.type || 'assembly').replace('_', ' ')}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{Number(center.hourly_capacity).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{Number(center.daily_capacity).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{center.standard_availability_hours} hrs</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          center.status === 'active'
                            ? 'success'
                            : center.status === 'maintenance'
                            ? 'outline'
                            : 'secondary'
                        }
                        className={center.status === 'maintenance' ? 'border-amber-500/40 text-amber-600 bg-amber-500/10' : ''}
                      >
                        {center.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenModal(center)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete work center ${center.name}?`)) {
                              deleteMutation.mutate(center.id)
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
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    No work centers found. Click &quot;Add Work Center&quot; to register equipment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCenter ? 'Edit Work Center' : 'Add Work Center'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs">Machine Code *</Label>
                <Input
                  id="code"
                  required
                  placeholder="e.g. INJ-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs">Machine Type *</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="injection_molding">Injection Molding</option>
                  <option value="assembly">Assembly</option>
                  <option value="cnc">CNC / Machining</option>
                  <option value="press">Press / Stamping</option>
                  <option value="packaging">Packaging</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Machine Name / Description *</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Engel 180T Injection Press"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hourly" className="text-xs">Hourly Cap.</Label>
                <Input
                  id="hourly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_capacity}
                  onChange={(e) => setFormData({ ...formData, hourly_capacity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="daily" className="text-xs">Daily Cap.</Label>
                <Input
                  id="daily"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.daily_capacity}
                  onChange={(e) => setFormData({ ...formData, daily_capacity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="avail" className="text-xs">Std. Hours/Day</Label>
                <Input
                  id="avail"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={formData.standard_availability_hours}
                  onChange={(e) => setFormData({ ...formData, standard_availability_hours: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <select
                id="status"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Work Center'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
