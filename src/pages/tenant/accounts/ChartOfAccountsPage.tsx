import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import {
  fetchAccounts,
  fetchAccountGroups,
  fetchAccountTypes,
  createAccount,
  updateAccount,
  type Account,
  type AccountGroup,
  type AccountType,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
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
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

const schema = z.object({
  account_code: z.string().min(1, 'Required'),
  account_name: z.string().min(1, 'Required'),
  account_type_id: z.string().min(1, 'Required'),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

export default function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', page],
    queryFn: () => fetchAccounts({ page }).then((r) => r.data),
  })

  const accounts = data?.data ?? []

  const { data: groups = [] } = useQuery({
    queryKey: ['account-groups'],
    queryFn: () => fetchAccountGroups({ per_page: 100 }).then((r) => r.data.data),
  })

  const { data: types = [] } = useQuery({
    queryKey: ['account-types'],
    queryFn: () => fetchAccountTypes({ per_page: 100 }).then((r) => r.data.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = { ...v, account_type_id: Number(v.account_type_id) }
      return editing
        ? updateAccount(editing.id, payload)
        : createAccount(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setOpen(false)
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    setEditing(null)
    reset({ account_code: '', account_name: '', account_type_id: '', is_active: true })
    setOpen(true)
  }

  const openEdit = (acc: Account) => {
    setEditing(acc)
    reset({
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type_id: String(acc.account_type_id),
      is_active: acc.is_active,
    })
    setOpen(true)
  }

  // Group types by group for the select
  const typesByGroup = groups.reduce<Record<number, { group: AccountGroup; types: AccountType[] }>>(
    (acc, g) => {
      acc[g.id] = { group: g, types: types.filter((t) => t.account_group_id === g.id) }
      return acc
    },
    {}
  )

  const columns: ColumnDef<Account>[] = [
    { accessorKey: 'account_code', header: 'Code', enableSorting: true },
    { accessorKey: 'account_name', header: 'Name', enableSorting: true },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => row.original.account_type?.name ?? '—',
    },
    {
      id: 'group',
      header: 'Group',
      cell: ({ row }) => row.original.account_type?.account_group?.name ?? '—',
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
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: Account } }) => (
              <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
          } as ColumnDef<Account>,
        ]
      : []),
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your ledger accounts</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Account
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={accounts}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="account_code"
        filterPlaceholder="Search by code…"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ac-code">Account Code</Label>
              <Input id="ac-code" {...register('account_code')} placeholder="e.g. 1001" />
              {errors.account_code && <p className="text-xs text-destructive">{errors.account_code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ac-name">Account Name</Label>
              <Input id="ac-name" {...register('account_name')} placeholder="e.g. Cash in Hand" />
              {errors.account_name && <p className="text-xs text-destructive">{errors.account_name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Account Type</Label>
              <Select
                value={watch('account_type_id')}
                onValueChange={(v) => setValue('account_type_id', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(typesByGroup).map(({ group, types: gTypes }) =>
                    gTypes.length > 0 ? (
                      <div key={group.id}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                          {group.name}
                        </div>
                        {gTypes.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </div>
                    ) : null
                  )}
                </SelectContent>
              </Select>
              {errors.account_type_id && <p className="text-xs text-destructive">{errors.account_type_id.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ac-active"
                type="checkbox"
                className="h-4 w-4 rounded border"
                {...register('is_active')}
              />
              <Label htmlFor="ac-active">Active</Label>
            </div>
            {save.isError && <p className="text-xs text-destructive">Failed to save account</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
