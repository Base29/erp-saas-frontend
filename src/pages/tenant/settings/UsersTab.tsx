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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => fetchUsers().then((r) => r.data.data),
  })

  const create = useMutation({
    mutationFn: (v: CreateValues) => createUser(v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-users'] }); setCreateOpen(false) },
  })

  const edit = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TenantUser> }) => updateUser(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-users'] }); setEditUser(null) },
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-users'] }),
  })

  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  const openCreate = () => {
    createForm.reset()
    setRoleValue('')
    setCreateOpen(true)
  }

  const openEdit = (u: TenantUser) => {
    editForm.reset({ name: u.name, role: u.role })
    setEditRoleValue(u.role)
    setEditUser(u)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage tenant users and roles</p>
        <Button size="sm" onClick={openCreate}>Add User</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{ROLE_LABELS[u.role as UserRole] ?? u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? 'success' : 'secondary'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
                      {u.is_active && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deactivate.mutate(u.id)}
                          disabled={deactivate.isPending}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((v) => create.mutate({ ...v, role: roleValue }))}
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
              <Select value={roleValue} onValueChange={setRoleValue}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
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
            onSubmit={editForm.handleSubmit((v) => editUser && edit.mutate({ id: editUser.id, payload: { ...v, role: editRoleValue } }))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editRoleValue} onValueChange={setEditRoleValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
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
