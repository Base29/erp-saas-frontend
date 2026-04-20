import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchCustomerCategories, createCustomerCategory, updateCustomerCategory, deleteCustomerCategory, type CustomerCategory } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

type FormValues = z.infer<typeof schema>

export default function CustomerCategoriesTab() {
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'settings')
  
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerCategory | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['customer-categories', page],
    queryFn: () => fetchCustomerCategories({ page }).then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      return editing 
        ? updateCustomerCategory(editing.id, v) 
        : createCustomerCategory(v as Omit<CustomerCategory, 'id'>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-categories'] })
      setOpen(false)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCustomerCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-categories'] })
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '' })
    setOpen(true)
  }

  const openEdit = (c: CustomerCategory) => {
    setEditing(c)
    reset({
      name: c.name,
    })
    setOpen(true)
  }

  const columns: ColumnDef<CustomerCategory>[] = [
    { accessorKey: 'name', header: 'Name', enableSorting: true },
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
        <p className="text-sm text-muted-foreground">Manage customer categories for CRM organization.</p>
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
              <Input {...register('name')} placeholder="e.g. Corporate" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
