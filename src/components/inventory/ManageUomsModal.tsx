import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import {
  fetchUoms,
  createUom,
  updateUom,
  deleteUom,
  type UnitOfMeasure,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/authStore'
import { canManageUoms } from '@/utils/permissions'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(20),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ManageUomsModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canManageUoms(role)

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: uomList = [], isLoading } = useQuery({
    queryKey: ['uoms', { all: true, search }],
    queryFn: () =>
      fetchUoms({ all: true, ...(search.trim() ? { search: search.trim() } : {}) }).then(
        (r) => r.data.data ?? []
      ),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', abbreviation: '', is_active: true },
  })

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? updateUom(editing.id, values) : createUom(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uoms'] })
      setIsFormOpen(false)
      setEditing(null)
      reset()
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to save unit of measure.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uoms'] })
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Cannot delete unit of measure.')
    },
  })

  const startCreate = () => {
    setEditing(null)
    reset({ name: '', abbreviation: '', is_active: true })
    setActionError(null)
    setIsFormOpen(true)
  }

  const startEdit = (uom: UnitOfMeasure) => {
    setEditing(uom)
    reset({
      name: uom.name,
      abbreviation: uom.abbreviation,
      is_active: uom.is_active,
    })
    setActionError(null)
    setIsFormOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-lg font-semibold">Units of Measure (UOM)</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage standard measuring units for catalog stock and conversions.
                </p>
              </div>
              {canEdit && (
                <Button size="sm" onClick={startCreate} className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add UOM
                </Button>
              )}
            </div>
          </DialogHeader>

          {actionError && (
            <div className="p-2.5 rounded-lg text-xs bg-destructive/10 text-destructive border border-destructive/20 my-1">
              {actionError}
            </div>
          )}

          <div className="relative my-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or abbreviation…"
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-xl divide-y min-h-[220px] max-h-[420px]">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading UOMs…</div>
            ) : uomList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No units of measure found.
              </div>
            ) : (
              uomList.map((uom) => (
                <div
                  key={uom.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm px-2 py-1 bg-primary/10 text-primary rounded-md min-w-[36px] text-center font-mono">
                      {uom.abbreviation}
                    </span>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {uom.name}
                        {!uom.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => startEdit(uom)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete '${uom.name}'?`)) {
                            deleteMutation.mutate(uom.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-xs text-muted-foreground text-right">
            Total {uomList.length} units
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Unit of Measure' : 'New Unit of Measure'}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="form-uom-name">Name</Label>
              <Input
                id="form-uom-name"
                placeholder="e.g. Kilogram, Meter, Liter"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-uom-abbr">Abbreviation</Label>
              <Input
                id="form-uom-abbr"
                placeholder="e.g. kg, m, ltr"
                {...register('abbreviation')}
              />
              {errors.abbreviation && (
                <p className="text-xs text-destructive">{errors.abbreviation.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
              <input type="checkbox" className="h-4 w-4 rounded border" {...register('is_active')} />
              Active
            </label>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
