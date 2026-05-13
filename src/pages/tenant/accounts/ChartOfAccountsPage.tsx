import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import {
  fetchAccounts,
  fetchAccountCategories,
  createAccount,
  updateAccount,
  type Account,
  type AccountCategory,
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
import { toast } from 'sonner'

const accountSchema = z.object({
  account_code: z.string().min(1, 'Required'),
  account_name: z.string().min(1, 'Required'),
  account_category_id: z.string().min(1, 'Required'),
  is_active: z.boolean().default(true),
})

type AccountFormValues = z.infer<typeof accountSchema>

export default function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [page, setPage] = useState(1)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', page, selectedCategoryId],
    queryFn: () => fetchAccounts({ page, ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}) }).then((r) => r.data),
  })

  const accounts = data?.data ?? []

  const { data: categories = [] } = useQuery({
    queryKey: ['account-categories'],
    queryFn: () => fetchAccountCategories().then((r) => r.data.data),
  })

  const saveAccount = useMutation({
    mutationFn: (v: AccountFormValues) => {
      return editing
        ? updateAccount(editing.id, v)
        : createAccount(v)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setOpen(false)
      toast.success('Account saved successfully')
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<AccountFormValues>({ resolver: zodResolver(accountSchema) })

  const openCreate = () => {
    setEditing(null)
    reset({ account_code: '', account_name: '', account_category_id: selectedCategoryId || '', is_active: true })
    setOpen(true)
  }

  const openEdit = (acc: Account) => {
    setEditing(acc)
    reset({
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_category_id: acc.account_category_id,
      is_active: acc.is_active,
    })
    setOpen(true)
  }

  const flatCategories = useMemo(() => {
    const flattened: Array<{ id: string; label: string; depth: number }> = []
    const walk = (cats: AccountCategory[], prefix = '') => {
      cats.forEach((c) => {
        const label = prefix ? `${prefix} > ${c.name} [${c.code}]` : `${c.name} [${c.code}]`
        flattened.push({ id: c.id, label, depth: c.depth })
        if (c.children) walk(c.children, label)
      })
    }
    walk(categories)
    return flattened
  }, [categories])

  const columns: ColumnDef<Account>[] = [
    { accessorKey: 'account_code', header: 'Code', enableSorting: true },
    { accessorKey: 'account_name', header: 'Name', enableSorting: true },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const cat = row.original.account_category
        return cat ? `${cat.name} [${cat.code}]` : '—'
      },
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
        <div className="flex gap-2">
          <Select
            value={selectedCategoryId || 'all'}
            onValueChange={(v) => setSelectedCategoryId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {flatCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Account
            </Button>
          )}
        </div>
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

      {/* Account Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveAccount.mutate(v))} className="space-y-4 py-2">
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
              <Label>Category</Label>
              <Select
                value={watch('account_category_id')}
                onValueChange={(v) => setValue('account_category_id', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {flatCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="text-xs">{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_category_id && <p className="text-xs text-destructive">{errors.account_category_id.message}</p>}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || saveAccount.isPending}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
