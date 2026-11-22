import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBomSections,
  createBomSection,
  updateBomSection,
  deleteBomSection,
  type BomSection,
} from '@/api/manufacturing'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { FolderTree, Plus, Trash2, Edit2, Search } from 'lucide-react'
import { toast } from 'sonner'

interface BomSectionManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSectionCreated?: (section: BomSection) => void
}

export function BomSectionManagerDialog({
  open,
  onOpenChange,
  onSectionCreated,
}: BomSectionManagerDialogProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingSection, setEditingSection] = useState<BomSection | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    sequence: 1,
    is_active: true,
  })

  const { data: sections, isLoading } = useQuery({
    queryKey: ['bom-sections', search],
    queryFn: () => fetchBomSections({ search }).then((r) => r.data.data),
    enabled: open,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingSection
        ? updateBomSection(editingSection.id, payload)
        : createBomSection(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bom-sections'] })
      toast.success(editingSection ? 'Section updated' : 'Section created')
      setFormOpen(false)
      setEditingSection(null)
      if (onSectionCreated && res?.data?.data) {
        onSectionCreated(res.data.data)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save section')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBomSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-sections'] })
      toast.success('Section deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete section')
    },
  })

  const handleOpenAdd = () => {
    setEditingSection(null)
    const nextSeq = (sections?.length ?? 0) + 1
    setFormData({
      name: '',
      code: `SEC-${String(nextSeq).padStart(2, '0')}`,
      description: '',
      sequence: nextSeq,
      is_active: true,
    })
    setFormOpen(true)
  }

  const handleOpenEdit = (section: BomSection) => {
    setEditingSection(section)
    setFormData({
      name: section.name,
      code: section.code || '',
      description: section.description || '',
      sequence: section.sequence,
      is_active: section.is_active,
    })
    setFormOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Section name is required')
      return
    }
    saveMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderTree className="h-5 w-5 text-primary" />
            Manage BOM Manufacturing Sections
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Configure standard manufacturing, processing, or assembly sections (e.g. Moulding, Sub-Assembly, Hardware, Packaging). When creating BOMs, components can be assigned to these sections to keep production recipes organized and clear on the shop floor.
          </p>

          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sections by name or code..."
                className="pl-9 h-8 text-xs"
              />
            </div>

            <Button size="sm" onClick={handleOpenAdd} className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Section
            </Button>
          </div>

          {/* Form for Add/Edit Inline */}
          {formOpen && (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-primary/30 bg-muted/30 space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>{editingSection ? 'Edit BOM Section' : 'New BOM Manufacturing Section'}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1">
                  <Label className="text-[11px]">Section Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Moulding & Forming, Final Assembly"
                    className="h-8 text-xs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[11px]">Section Code</Label>
                  <Input
                    placeholder="e.g. MOLD, ASSY"
                    className="h-8 text-xs font-mono uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[11px]">Sequence / Order</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-xs"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Description / Shop-Floor Stage Notes</Label>
                <Input
                  placeholder="Optional process notes for materials used in this operation..."
                  className="h-8 text-xs"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <span>Active (available in BOM Builder)</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Sections Table */}
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Seq</TableHead>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Items Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      Loading sections...
                    </TableCell>
                  </TableRow>
                ) : sections && sections.length > 0 ? (
                  sections.map((sec) => (
                    <TableRow key={sec.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold">{sec.sequence}</TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {sec.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sec.code ? (
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {sec.code}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {sec.description || '—'}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono">
                        {sec.bom_items_count ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sec.is_active ? 'success' : 'secondary'} className="text-[10px]">
                          {sec.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(sec)}
                            title="Edit Section"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete section "${sec.name}"?`)) {
                                deleteMutation.mutate(sec.id)
                              }
                            }}
                            title="Delete Section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No BOM sections configured. Click &quot;Add Section&quot; to define your factory processes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
