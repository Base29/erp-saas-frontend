import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  fetchAccountTypes, 
  fetchAccountGroups, 
  createAccountType, 
  updateAccountType, 
  deleteAccountType, 
  type AccountType
} from '@/api/tenant'
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
  account_group_id: z.string().min(1, 'Parent Group is required'),
})

type FormValues = z.infer<typeof schema>

export default function AccountTypesTab() {
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'settings')
  
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccountType | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['account-types', page],
    queryFn: () => fetchAccountTypes({ page }).then((r) => r.data),
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['account-groups'],
    queryFn: () => fetchAccountGroups({ per_page: 100 }).then((r) => r.data.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      return editing 
        ? updateAccountType(editing.id, v) 
        : createAccountType(v)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-types'] })
      queryClient.invalidateQueries({ queryKey: ['account-groups'] })
      setOpen(false)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAccountType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-types'] })
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', account_group_id: '' })
    setOpen(true)
  }

  const openEdit = (t: AccountType) => {
    setEditing(t)
    reset({
      name: t.name,
      account_group_id: String(t.account_group_id),
    })
    setOpen(true)
  }

  const columns: ColumnDef<AccountType>[] = [
    { accessorKey: 'name', header: 'Type Name', enableSorting: true },
    { 
      id: 'group', 
      header: 'Parent Group', 
      cell: ({ row }) => row.original.account_group?.name ?? '—' 
    },
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
                  if (confirm('Are you sure you want to delete this account type?')) {
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
        <p className="text-sm text-muted-foreground">Manage chart of account types and their parent groups.</p>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Account Type
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
            <DialogTitle>{editing ? 'Edit Account Type' : 'Add Account Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Type Name</Label>
              <Input {...register('name')} placeholder="e.g. Current Assets" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Parent Group</Label>
              <Select 
                value={watch('account_group_id')} 
                onValueChange={(v) => setValue('account_group_id', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_group_id && <p className="text-xs text-destructive">{errors.account_group_id.message}</p>}
            </div>

            {save.isError && <p className="text-xs text-destructive">Failed to save account type</p>}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>
                {editing ? 'Save Changes' : 'Create Account Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
