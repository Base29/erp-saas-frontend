import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchUsers, createUser, updateUser, deactivateUser, type TenantUser } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { ROLE_LABELS } from '@/utils/permissions'
import type { UserRole } from '@/store/authStore'

const ROLES: UserRole[] = ['tenant_admin', 'accountant', 'sales_manager', 'sales_person', 'inventory_manager', 'viewer']
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'tenant_admin')

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.string().min(1, 'Role is required'),
})

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

export default function UsersTab() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<TenantUser | null>(null)
  const [roleValue, setRoleValue] = useState<string>('')
  const [editRoleValue, setEditRoleValue] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-users', page],
    queryFn: () => fetchUsers({ page }).then((r) => r.data),
  })

  const users = data?.data ?? []

  const create = useMutation({
    mutationFn: (v: CreateValues) => createUser(v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-users'] }); setCreateOpen(false) },
  })

  const edit = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TenantUser> }) => updateUser(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-users'] }); setEditUser(null) },
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-users'] }),
  })

  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  const openCreate = () => {
    createForm.reset({ name: '', email: '', password: '', role: '' })
    setRoleValue('')
    setCreateOpen(true)
  }

  const openEdit = (u: TenantUser) => {
    editForm.reset({ name: u.name, role: u.role })
    setEditRoleValue(u.role)
    setEditUser(u)
  }

  const columns: ColumnDef<TenantUser>[] = [
    { accessorKey: 'name', header: 'Name', enableSorting: true },
    { accessorKey: 'email', header: 'Email', enableSorting: true },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">{ROLE_LABELS[row.original.role as UserRole] ?? row.original.role}</Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>Edit</Button>
          {row.original.is_active && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deactivate.mutate(row.original.id)}
              disabled={deactivate.isPending}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage tenant users and roles</p>
        <Button size="sm" onClick={openCreate}>Add User</Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="name"
        filterPlaceholder="Search by name…"
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((v) => create.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...createForm.register('name')} />
              {createForm.formState.errors.name && <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...createForm.register('email')} />
              {createForm.formState.errors.email && <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" {...createForm.register('password')} />
              {createForm.formState.errors.password && <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={roleValue} onValueChange={(v) => { setRoleValue(v); createForm.setValue('role', v) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              {createForm.formState.errors.role && <p className="text-xs text-destructive">{createForm.formState.errors.role.message}</p>}
            </div>
            {create.isError && <p className="text-xs text-destructive">Failed to create user</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting || !roleValue}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((v) => editUser && edit.mutate({ id: editUser.id, payload: v }))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editRoleValue} onValueChange={(v) => { setEditRoleValue(v); editForm.setValue('role', v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              {editForm.formState.errors.role && <p className="text-xs text-destructive">{editForm.formState.errors.role.message}</p>}
            </div>
            {edit.isError && <p className="text-xs text-destructive">Failed to update user</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
