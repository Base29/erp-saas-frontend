import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import { fetchWarehouses, createWarehouse, updateWarehouse, type Warehouse } from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

const schema = z.object({
  warehouse_code: z.string().min(1, 'Required'),
  warehouse_name: z.string().min(1, 'Required'),
  location_description: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

export default function WarehousesPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'inventory')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchWarehouses().then((r) => r.data.data ?? r.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      editing ? updateWarehouse(editing.id, v) : createWarehouse(v as Omit<Warehouse, 'id'>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setOpen(false)
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    setEditing(null)
    reset({ warehouse_code: '', warehouse_name: '', location_description: null, is_active: true })
    setOpen(true)
  }

  const openEdit = (w: Warehouse) => {
    setEditing(w)
    reset({ warehouse_code: w.warehouse_code, warehouse_name: w.warehouse_name, location_description: w.location_description, is_active: w.is_active })
    setOpen(true)
  }

  const columns: ColumnDef<Warehouse>[] = [
    { accessorKey: 'warehouse_code', header: 'Code', enableSorting: true },
    { accessorKey: 'warehouse_name', header: 'Name', enableSorting: true },
    { accessorKey: 'location_description', header: 'Location', cell: ({ row }) => row.original.location_description ?? '—' },
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    ...(canEdit ? [{
      id: 'actions', header: '',
      cell: ({ row }: { row: { original: Warehouse } }) => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}><Pencil className="h-3.5 w-3.5" /></Button>
      ),
    } as ColumnDef<Warehouse>] : []),
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage storage locations</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Warehouse</Button>}
      </div>

      <DataTable columns={columns} data={warehouses as Warehouse[]} isLoading={isLoading} filterKey="warehouse_code" filterPlaceholder="Search by code…" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Warehouse Code</Label>
              <Input {...register('warehouse_code')} placeholder="e.g. WH-01" />
              {errors.warehouse_code && <p className="text-xs text-destructive">{errors.warehouse_code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Warehouse Name</Label>
              <Input {...register('warehouse_name')} placeholder="Main Warehouse" />
              {errors.warehouse_name && <p className="text-xs text-destructive">{errors.warehouse_name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input {...register('location_description')} placeholder="Optional location description" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border" {...register('is_active')} />
              Active
            </label>
            {save.isError && <p className="text-xs text-destructive">Failed to save warehouse</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
