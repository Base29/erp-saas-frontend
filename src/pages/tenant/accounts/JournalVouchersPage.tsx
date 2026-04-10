import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye } from 'lucide-react'
import { fetchJournalVouchers, type JournalVoucher } from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

const APPROVAL_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  draft: 'secondary',
  pending_approval: 'default',
  approved: 'success',
  rejected: 'destructive',
}

const POSTING_VARIANTS: Record<string, 'secondary' | 'success'> = {
  unposted: 'secondary',
  posted: 'success',
}

export default function JournalVouchersPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['journal-vouchers', page],
    queryFn: () => fetchJournalVouchers({ page }).then((r) => r.data),
  })

  const vouchers = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const columns: ColumnDef<JournalVoucher>[] = [
    { accessorKey: 'voucher_number', header: 'Voucher #', enableSorting: true },
    { accessorKey: 'voucher_date', header: 'Date', enableSorting: true },
    {
      accessorKey: 'voucher_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.voucher_type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      accessorKey: 'narration',
      header: 'Narration',
      cell: ({ row }) => (
        <span className="max-w-xs truncate block">{row.original.narration ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'approval_status',
      header: 'Approval',
      cell: ({ row }) => (
        <Badge variant={APPROVAL_VARIANTS[row.original.approval_status] ?? 'secondary'}>
          {row.original.approval_status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'posting_status',
      header: 'Posting',
      cell: ({ row }) => (
        <Badge variant={POSTING_VARIANTS[row.original.posting_status] ?? 'secondary'}>
          {row.original.posting_status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/accounts/journal-vouchers/${row.original.id}`)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Journal Vouchers</h1>
          <p className="text-sm text-muted-foreground">Double-entry accounting records</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => navigate('/accounts/journal-vouchers/new')}>
            <Plus className="h-4 w-4 mr-1" /> New Voucher
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={vouchers}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  )
}
