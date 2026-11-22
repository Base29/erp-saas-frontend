import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, FolderTree } from 'lucide-react'
import {
  fetchItemCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
  type ItemCategory,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { canManageItemCategories } from '@/utils/permissions'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parent_category_id: z.string().nullable().default(null),
  description: z.string().nullable().default(''),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ManageCategoriesModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canManageItemCategories(role)

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ItemCategory | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: categoryList = [], isLoading } = useQuery({
    queryKey: ['item-categories', { all: true, search }],
    queryFn: () =>
      fetchItemCategories({ all: true, ...(search.trim() ? { search: search.trim() } : {}) }).then(
        (r) => r.data.data ?? []
      ),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parent_category_id: null, description: '' },
  })

  const parentId = watch('parent_category_id')

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        parent_category_id: values.parent_category_id === 'none' ? null : values.parent_category_id,
        description: values.description || null,
      }
      return editing
        ? updateInventoryCategory(editing.id, payload)
        : createInventoryCategory(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-categories'] })
      qc.invalidateQueries({ queryKey: ['product-categories'] })
      setIsFormOpen(false)
      setEditing(null)
      reset()
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to save item category.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-categories'] })
      qc.invalidateQueries({ queryKey: ['product-categories'] })
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Cannot delete item category.')
    },
  })

  const startCreate = () => {
    setEditing(null)
    reset({ name: '', parent_category_id: null, description: '' })
    setActionError(null)
    setIsFormOpen(true)
  }

  const startEdit = (cat: ItemCategory) => {
    setEditing(cat)
    reset({
      name: cat.name,
      parent_category_id: cat.parent_category_id ? String(cat.parent_category_id) : null,
      description: cat.description ?? '',
    })
    setActionError(null)
    setIsFormOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-lg font-semibold">Inventory Item Categories</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize products into hierarchical categories for tracking, reports, and valuation.
                </p>
              </div>
              {canEdit && (
                <Button size="sm" onClick={startCreate} className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Category
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
              placeholder="Search categories by name or description…"
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-xl divide-y min-h-[240px] max-h-[440px]">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading categories…</div>
            ) : categoryList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No item categories found.
              </div>
            ) : (
              categoryList.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-primary shrink-0" />
                      <span>{cat.name}</span>
                      {cat.parent && (
                        <span className="text-xs text-muted-foreground font-normal">
                          (Sub of <span className="font-medium">{cat.parent.name}</span>)
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground pl-6 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => startEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete '${cat.name}'?`)) {
                            deleteMutation.mutate(cat.id)
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
            Total {categoryList.length} categories
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item Category' : 'New Item Category'}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="form-cat-name">Category Name</Label>
              <Input
                id="form-cat-name"
                placeholder="e.g. Raw Materials, Electronics"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select
                value={parentId ?? 'none'}
                onValueChange={(val) =>
                  setValue('parent_category_id', val === 'none' ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {categoryList
                    .filter((c) => !editing || String(c.id) !== String(editing.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-cat-desc">Description</Label>
              <Textarea
                id="form-cat-desc"
                rows={3}
                placeholder="Optional notes or classification details…"
                {...register('description')}
              />
            </div>

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
