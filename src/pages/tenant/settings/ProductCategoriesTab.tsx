import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchProductCategories, createItemCategory, updateItemCategory, deleteItemCategory, type ItemCategory } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parent_category_id: z.string().nullable().default(null),
  description: z.string().nullable().default(''),
})

type FormValues = z.infer<typeof schema>

export default function ProductCategoriesTab() {
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'settings')
  
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ItemCategory | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['product-categories', page],
    queryFn: () => fetchProductCategories({ page }).then((r) => r.data),
  })

  // Fetch all categories for the parent selector (flat list is fine for now)
  const { data: allCategories = [] } = useQuery({
    queryKey: ['product-categories-all'],
    queryFn: () => fetchProductCategories({ per_page: 500 }).then((r) => r.data.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        parent_category_id: v.parent_category_id === 'none' ? null : v.parent_category_id,
      }
      return editing 
        ? updateItemCategory(editing.id, payload) 
        : createItemCategory(payload as Omit<ItemCategory, 'id'>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories-all'] })
      setOpen(false)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteItemCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories-all'] })
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', parent_category_id: null, description: '' })
    setOpen(true)
  }

  const openEdit = (c: ItemCategory) => {
    setEditing(c)
    reset({
      name: c.name,
      parent_category_id: c.parent_category_id ? String(c.parent_category_id) : null,
      description: c.description ?? '',
    })
    setOpen(true)
  }

  const columns: ColumnDef<ItemCategory>[] = [
    { accessorKey: 'name', header: 'Name', enableSorting: true },
    { 
      id: 'parent', 
      header: 'Parent Category', 
      cell: ({ row }) => (row.original as any).parent?.name ?? '—' 
    },
    { accessorKey: 'description', header: 'Description' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this category?')) {
                    remove.mutate(row.original.id)
                  }
                }}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage product categories for inventory organization.</p>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="name"
        filterPlaceholder="Search by name…"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Category Name</Label>
              <Input {...register('name')} placeholder="e.g. Electronics" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Parent Category</Label>
              <Select 
                value={watch('parent_category_id') ?? 'none'} 
                onValueChange={(v) => setValue('parent_category_id', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {allCategories
                    .filter((c) => editing ? c.id !== editing.id : true)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Optional description..." />
            </div>

            {save.isError && <p className="text-xs text-destructive">Failed to save category</p>}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>
                {editing ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
