import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSupplierPayments } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

export default function SupplierPaymentsPage() {
  const navigate = useNavigate()
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

  const columns = useMemo<ColumnDef<any>[]>(() => [
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
  ], [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Payments</h1>
          <p className="text-muted-foreground">Record and manage payments made to vendors.</p>
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
