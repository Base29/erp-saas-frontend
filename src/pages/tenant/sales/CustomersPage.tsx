import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import {
  fetchCustomersFull, fetchCustomerCategories, fetchCustomerGroups, fetchUsers,
  createCustomer, updateCustomer,
  type CustomerFull, type CustomerCategory, type CustomerGroup, type TenantUser,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

const schema = z.object({
  customer_code: z.string().min(1, 'Required'),
  name: z.string().min(1, 'Required'),
  customer_category_id: z.string().nullable().default(null),
  customer_group_id: z.string().nullable().default(null),
  tax_number: z.string().nullable().default(null),
  credit_limit: z.coerce.number().min(0).default(0),
  payment_terms_days: z.coerce.number().int().min(0).default(30),
  assigned_salesperson_id: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

export default function CustomersPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerFull | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page],
    queryFn: () => fetchCustomersFull({ page }).then((r) => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => fetchCustomerCategories().then((r) => r.data.data ?? r.data),
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => fetchCustomerGroups().then((r) => r.data.data ?? r.data),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => fetchUsers().then((r) => r.data.data ?? r.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        customer_category_id: v.customer_category_id ? Number(v.customer_category_id) : null,
        customer_group_id: v.customer_group_id ? Number(v.customer_group_id) : null,
        assigned_salesperson_id: v.assigned_salesperson_id ? Number(v.assigned_salesperson_id) : null,
      }
      return editing ? updateCustomer(editing.id, payload) : createCustomer(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setOpen(false) },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    setEditing(null)
    reset({ customer_code: '', name: '', customer_category_id: null, customer_group_id: null, tax_number: null, credit_limit: 0, payment_terms_days: 30, assigned_salesperson_id: null, is_active: true })
    setOpen(true)
  }

  const openEdit = (c: CustomerFull) => {
    setEditing(c)
    reset({
      customer_code: c.customer_code, name: c.name,
      customer_category_id: c.customer_category_id ? String(c.customer_category_id) : null,
      customer_group_id: c.customer_group_id ? String(c.customer_group_id) : null,
      tax_number: c.tax_number, credit_limit: c.credit_limit,
      payment_terms_days: c.payment_terms_days,
      assigned_salesperson_id: c.assigned_salesperson_id ? String(c.assigned_salesperson_id) : null,
      is_active: c.is_active,
    })
    setOpen(true)
  }

  const columns: ColumnDef<CustomerFull>[] = [
    { accessorKey: 'customer_code', header: 'Code', enableSorting: true },
    { accessorKey: 'name', header: 'Name', enableSorting: true },
    { id: 'category', header: 'Category', cell: ({ row }) => row.original.customer_category?.name ?? '—' },
    { id: 'group', header: 'Group', cell: ({ row }) => row.original.customer_group?.name ?? '—' },
    { accessorKey: 'credit_limit', header: 'Credit Limit', cell: ({ row }) => `PKR ${Number(row.original.credit_limit).toLocaleString()}` },
    { accessorKey: 'payment_terms_days', header: 'Terms (days)' },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    ...(canEdit ? [{ id: 'actions', header: '', cell: ({ row }: { row: { original: CustomerFull } }) => <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}><Pencil className="h-3.5 w-3.5" /></Button> } as ColumnDef<CustomerFull>] : []),
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customer master data</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Customer</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} filterKey="name" filterPlaceholder="Search by name…" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'New Customer'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Customer Code</Label>
                <Input {...register('customer_code')} placeholder="CUST-001" />
                {errors.customer_code && <p className="text-xs text-destructive">{errors.customer_code.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input {...register('name')} placeholder="Customer name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={watch('customer_category_id') ?? ''} onValueChange={(v) => setValue('customer_category_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {(categories as CustomerCategory[]).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Group</Label>
                <Select value={watch('customer_group_id') ?? ''} onValueChange={(v) => setValue('customer_group_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {(groups as CustomerGroup[]).map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tax Number</Label>
                <Input {...register('tax_number')} placeholder="NTN / STRN" />
              </div>
              <div className="space-y-1">
                <Label>Credit Limit (PKR)</Label>
                <Input type="number" step="0.01" {...register('credit_limit')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Payment Terms (days)</Label>
                <Input type="number" {...register('payment_terms_days')} />
              </div>
              <div className="space-y-1">
                <Label>Assigned Salesperson</Label>
                <Select value={watch('assigned_salesperson_id') ?? ''} onValueChange={(v) => setValue('assigned_salesperson_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {(users as TenantUser[]).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border" {...register('is_active')} />
              Active
            </label>

            {save.isError && <p className="text-xs text-destructive">Failed to save customer</p>}
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
