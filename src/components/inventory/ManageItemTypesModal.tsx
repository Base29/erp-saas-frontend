import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, Boxes } from 'lucide-react'
import {
  fetchItemTypes,
  createItemType,
  updateItemType,
  deleteItemType,
  type ItemType,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/authStore'
import { canManageItemTypes } from '@/utils/permissions'

export const DEFAULT_SYSTEM_ITEM_TYPES: ItemType[] = [
  {
    id: 'system-stock',
    name: 'Stock Item',
    code: 'stock',
    nature: 'stock',
    description: 'Physical goods tracked in inventory with warehouse stock levels.',
    is_active: true,
    is_system: true,
  },
  {
    id: 'system-service',
    name: 'Service',
    code: 'service',
    nature: 'service',
    description: 'Non-physical services or labor with no inventory stock tracking.',
    is_active: true,
    is_system: true,
  },
  {
    id: 'system-bundle',
    name: 'Bundle / Kit',
    code: 'bundle',
    nature: 'bundle',
    description: 'Composite item made up of multiple component items.',
    is_active: true,
    is_system: true,
  },
]

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().max(50).optional().default(''),
  nature: z.enum(['stock', 'service', 'bundle']),
  description: z.string().nullable().default(''),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ManageItemTypesModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canManageItemTypes(role)

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ItemType | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: typeList = [], isLoading } = useQuery({
    queryKey: ['item-types', { all: true, search }],
    queryFn: () =>
      fetchItemTypes({ all: true, ...(search.trim() ? { search: search.trim() } : {}) }).then(
        (r) => r.data.data ?? []
      ),
    enabled: open,
  })

  // Ensure default system types (Stock, Service, Bundle) are always present and visible
  const effectiveTypes = useMemo(() => {
    const list = [...typeList]
    for (const def of DEFAULT_SYSTEM_ITEM_TYPES) {
      if (!list.some((t) => t.code === def.code)) {
        list.push(def)
      }
    }
    let filtered = list
    if (search.trim()) {
      const term = search.toLowerCase().trim()
      filtered = list.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.code.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term))
      )
    }
    return filtered.sort((a, b) => {
      if (a.is_system && !b.is_system) return -1
      if (!a.is_system && b.is_system) return 1
      return a.name.localeCompare(b.name)
    })
  }, [typeList, search])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', nature: 'stock', description: '', is_active: true },
  })

  const nature = watch('nature')

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        code: values.code?.trim() || undefined,
        nature: values.nature,
        description: values.description || null,
        is_active: values.is_active,
      }
      return editing ? updateItemType(editing.id, payload) : createItemType(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-types'] })
      setIsFormOpen(false)
      setEditing(null)
      reset()
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to save item type.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItemType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-types'] })
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Cannot delete item type.')
    },
  })

  const startCreate = () => {
    setEditing(null)
    reset({ name: '', code: '', nature: 'stock', description: '', is_active: true })
    setActionError(null)
    setIsFormOpen(true)
  }

  const startEdit = (itemType: ItemType) => {
    setEditing(itemType)
    reset({
      name: itemType.name,
      code: itemType.code,
      nature: itemType.nature,
      description: itemType.description ?? '',
      is_active: itemType.is_active,
    })
    setActionError(null)
    setIsFormOpen(true)
  }

  const getNatureBadge = (nat: 'stock' | 'service' | 'bundle') => {
    switch (nat) {
      case 'stock':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">Stock</Badge>
      case 'service':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200">Service</Badge>
      case 'bundle':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200">Bundle</Badge>
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-lg font-semibold">Inventory Item Types</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define types such as Raw Materials, Finished Goods, Consumables, and Services.
                </p>
              </div>
              {canEdit && (
                <Button size="sm" onClick={startCreate} className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Type
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
              placeholder="Search types by name or code…"
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-xl divide-y min-h-[240px] max-h-[440px]">
            {isLoading && typeList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading item types…</div>
            ) : effectiveTypes.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No item types found.
              </div>
            ) : (
              effectiveTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm">{type.name}</span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {type.code}
                      </span>
                      {getNatureBadge(type.nature)}
                      {type.is_system && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                          System
                        </Badge>
                      )}
                      {!type.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {type.description && (
                      <p className="text-xs text-muted-foreground pl-6 line-clamp-1">
                        {type.description}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => startEdit(type)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!type.is_system ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete '${type.name}'?`)) {
                              deleteMutation.mutate(type.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-xs text-muted-foreground text-right">
            Total {effectiveTypes.length} types
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item Type' : 'New Item Type'}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="form-type-name">Name</Label>
              <Input
                id="form-type-name"
                placeholder="e.g. Raw Material, Finished Goods"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="form-type-code">Code / Identifier</Label>
                {editing?.is_system && (
                  <span className="text-[10px] text-muted-foreground">System code locked</span>
                )}
              </div>
              <Input
                id="form-type-code"
                disabled={Boolean(editing?.is_system)}
                placeholder="e.g. raw_material"
                {...register('code')}
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Inventory Behavior (Nature)</Label>
              <Select
                disabled={Boolean(editing?.is_system)}
                value={nature}
                onValueChange={(val: 'stock' | 'service' | 'bundle') => setValue('nature', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock Item (Tracks inventory & stock movements)</SelectItem>
                  <SelectItem value="service">Service (Non-stock / labor services)</SelectItem>
                  <SelectItem value="bundle">Bundle / Kit (Composite component bundle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-type-desc">Description</Label>
              <Textarea
                id="form-type-desc"
                rows={2}
                placeholder="Optional notes or classification details…"
                {...register('description')}
              />
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
