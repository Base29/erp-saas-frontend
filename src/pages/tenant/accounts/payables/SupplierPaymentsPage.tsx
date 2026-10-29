import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSupplierPayments, postSupplierPayment, type SupplierPayment } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Send } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import DataTable from '@/components/DataTable'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function SupplierPaymentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page }
    if (search.trim()) params.search = search.trim()
    return params
  }, [search, page])

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-payments', queryParams],
    queryFn: () => fetchSupplierPayments(queryParams).then((r) => r.data),
  })

  const payments = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const postMutation = useMutation({
    mutationFn: (id: string) => postSupplierPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-payments'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
  })

  const columns = useMemo<ColumnDef<SupplierPayment>[]>(() => [
    {
      accessorKey: 'payment_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.payment_date ? format(new Date(row.original.payment_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => <span className="font-medium">{row.original.supplier?.name ?? '—'}</span>,
    },
    {
      accessorKey: 'payment_reference',
      header: 'Reference',
      cell: ({ row }) => <span>{row.original.payment_reference || '—'}</span>,
    },
    {
      id: 'account',
      header: 'Bank / Cash Account',
      cell: ({ row }) => <span>{row.original.bank_account?.account_name ?? '—'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold text-foreground">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: 'posting_status',
      header: 'Posting',
      cell: ({ row }) => {
        const isPosted = row.original.posting_status === 'posted'
        return (
          <Badge variant={isPosted ? 'success' : 'warning'} className="uppercase text-[10px] font-bold tracking-wider">
            {isPosted ? 'Posted' : 'Unposted'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const pmt = row.original
        const isUnposted = pmt.posting_status !== 'posted'

        return (
          <div className="flex items-center justify-end">
            {canEdit && isUnposted && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/40 hover:bg-primary/10 text-primary"
                onClick={() => postMutation.mutate(pmt.id)}
                disabled={postMutation.isPending}
                title="Post payment to General Ledger"
              >
                <Send className="h-3 w-3" />
                Post
              </Button>
            )}
          </div>
        )
      },
    },
  ], [canEdit, postMutation])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Payments</h1>
          <p className="text-muted-foreground">Record, allocate, and post payments made to vendors.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/accounts/supplier-payments/new')}>
          <Plus size={16} />
          Record Payment
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search payments by reference or supplier…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(search)}
        onClearFilters={() => {
          setSearch('')
          setPage(1)
        }}
      />
    </div>
  )
}
