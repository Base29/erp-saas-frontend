import { useState, useMemo } from 'react'
import SettingsHeaderActions from './SettingsHeaderActions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, ChevronRight, ChevronDown, Folder, FileText, Trash2 } from 'lucide-react'
import {
  fetchAccountCategories,
  createAccountCategory,
  updateAccountCategory,
  deleteAccountCategory,
  type AccountCategory,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const categorySchema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Code is compulsory'),
  parent_id: z.string().nullable().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

export default function AccountCategoriesTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccountCategory | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['account-categories'],
    queryFn: () => fetchAccountCategories().then((r) => r.data.data),
  })

  const save = useMutation({
    mutationFn: (v: CategoryFormValues) => {
      return editing
        ? updateAccountCategory(editing.id, v)
        : createAccountCategory(v as any)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-categories'] })
      setOpen(false)
      toast.success('Category saved successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save category')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAccountCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-categories'] })
      toast.success('Category deleted')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete category')
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema) })

  const openCreate = (parentId: string | null = null) => {
    setEditing(null)
    reset({ name: '', code: '', parent_id: parentId })
    setOpen(true)
  }

  const openEdit = (cat: AccountCategory) => {
    setEditing(cat)
    reset({
      name: cat.name,
      code: cat.code || '',
      parent_id: cat.parent_id,
    })
    setOpen(true)
  }

  const flatCategories = useMemo(() => {
    const flattened: Array<{ id: string; label: string; depth: number }> = []
    const walk = (cats: AccountCategory[], prefix = '') => {
      cats.forEach((c) => {
        const label = prefix ? `${prefix} > ${c.name}` : c.name
        flattened.push({ id: c.id, label, depth: c.depth })
        if (c.children) walk(c.children, label)
      })
    }
    walk(categories)
    return flattened
  }, [categories])

  if (isLoading) return <div className="p-4">Loading hierarchy...</div>

  return (
    <div className="space-y-4">
      <SettingsHeaderActions>
        <Button size="sm" onClick={() => openCreate(null)}>
          <Plus className="h-4 w-4 mr-2" /> New Root Category
        </Button>
      </SettingsHeaderActions>

      <div className="border rounded-lg bg-card p-6">
        <div className="max-w-2xl">
          {categories.length === 0 && <p className="text-sm text-muted-foreground italic">No categories defined yet.</p>}
          <CategoryTree
            items={categories}
            onEdit={openEdit}
            onCreateSub={openCreate}
            onDelete={(id) => {
              if (confirm('Are you sure you want to delete this category?')) {
                remove.mutate(id)
              }
            }}
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Parent Category</Label>
              <Select
                value={watch('parent_id') || 'root'}
                onValueChange={(v) => setValue('parent_id', v === 'root' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Root" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">None (Root Level)</SelectItem>
                  {flatCategories
                    .filter(c => c.depth < 5 && (!editing || c.id !== editing.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="text-xs">{c.label}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cat-code">Category Code</Label>
              <Input id="cat-code" {...register('code')} placeholder="e.g. 1000" />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input id="cat-name" {...register('name')} placeholder="e.g. Assets" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {editing?.has_data && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive font-medium">
                  This category has transaction data and cannot be edited or moved.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || save.isPending || editing?.has_data}
              >
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryTree({ 
  items, 
  onEdit, 
  onCreateSub, 
  onDelete 
}: { 
  items: AccountCategory[], 
  onEdit: (c: AccountCategory) => void,
  onCreateSub: (parentId: string) => void,
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <CategoryItem 
          key={item.id} 
          item={item} 
          onEdit={onEdit} 
          onCreateSub={onCreateSub}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function CategoryItem({ 
  item, 
  onEdit, 
  onCreateSub, 
  onDelete 
}: { 
  item: AccountCategory, 
  onEdit: (c: AccountCategory) => void,
  onCreateSub: (parentId: string) => void,
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.children && item.children.length > 0

  return (
    <div className="select-none">
      <div className="flex items-center group py-1 border-b border-transparent hover:border-border">
        <div 
          className="p-1 cursor-pointer hover:bg-accent rounded mr-1"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="w-4" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 px-2 py-1 rounded hover:bg-accent cursor-default overflow-hidden">
          {hasChildren ? <Folder className="h-4 w-4 text-primary/70 shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
          <span className="text-xs font-mono text-muted-foreground">[{item.code}]</span>
          <span className="text-sm truncate font-medium">{item.name}</span>
          {item.has_data && (
            <Badge 
              variant="outline" 
              className="text-[10px] h-4 px-1 text-yellow-600 dark:text-yellow-400 border-yellow-600/20 bg-yellow-600/10"
            >
              Data
            </Badge>
          )}
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1">
          {item.depth < 5 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreateSub(item.id)} title="Add Sub-category">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => onEdit(item)}
            disabled={item.has_data}
            title="Edit Category"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive hover:text-destructive" 
            onClick={() => onDelete(item.id)}
            disabled={item.has_data || hasChildren || (item.accounts?.length || 0) > 0}
            title="Delete Category"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-6 border-l pl-2 mt-1">
          <CategoryTree 
            items={item.children!} 
            onEdit={onEdit} 
            onCreateSub={onCreateSub}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  )
}
