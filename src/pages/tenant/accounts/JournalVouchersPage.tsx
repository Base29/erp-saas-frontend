import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Search, X } from 'lucide-react'
import { fetchJournalVouchers, type JournalVoucher } from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import { formatDate } from '@/utils/format'
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

type VoucherTab = 'all' | 'cash_receipt' | 'cash_payment' | 'bank_receipt' | 'bank_payment' | 'general'

const TABS: { id: VoucherTab; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'cash_receipt', label: 'Cash Receipts' },
  { id: 'cash_payment', label: 'Cash Payments' },
  { id: 'bank_receipt', label: 'Bank Receipts' },
  { id: 'bank_payment', label: 'Bank Payments' },
  { id: 'general',      label: 'General' },
]

export default function JournalVouchersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [activeTab, setActiveTab]           = useState<VoucherTab>('all')
  const [page, setPage]                     = useState(1)
  const [search, setSearch]                 = useState(searchParams.get('search') ?? '')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [postingFilter, setPostingFilter]   = useState('')

  // Build query params
  const queryParams: Record<string, string | number> = { page }
  if (activeTab !== 'all') queryParams.voucher_type = activeTab
  if (search)              queryParams.search        = search
  if (dateFrom)            queryParams.date_from     = dateFrom
  if (dateTo)              queryParams.date_to       = dateTo
  if (approvalFilter)      queryParams.approval_status = approvalFilter
  if (postingFilter)       queryParams.posting_status  = postingFilter

  const { data, isLoading } = useQuery({
    queryKey: ['journal-vouchers', queryParams],
    queryFn: () => fetchJournalVouchers(queryParams).then((r) => r.data),
  })

  const vouchers = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const handleTabChange = (tab: VoucherTab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleNewVoucher = () => {
    const type = activeTab !== 'all' ? activeTab : undefined
    navigate('/accounts/journal-vouchers/new', type ? { state: { voucherType: type } } : undefined)
  }

  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setApprovalFilter('')
    setPostingFilter('')
    setPage(1)
  }

  const hasFilters = search || dateFrom || dateTo || approvalFilter || postingFilter

  const columns: ColumnDef<JournalVoucher>[] = [
    { accessorKey: 'voucher_number', header: 'Voucher #', enableSorting: true },
    {
      accessorKey: 'voucher_date',
      header: 'Date',
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.voucher_date),
    },
    {
      accessorKey: 'voucher_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize text-sm">{row.original.voucher_type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      accessorKey: 'narration',
      header: 'Narration',
      cell: ({ row }) => (
        <span className="max-w-xs truncate block text-muted-foreground text-sm">
          {row.original.narration ?? '—'}
        </span>
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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Journal Vouchers</h1>
          <p className="text-sm text-muted-foreground">Double-entry accounting records</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={handleNewVoucher}>
            <Plus className="h-4 w-4 mr-1" />
            {activeTab === 'all' ? 'New Voucher' : `New ${TABS.find((t) => t.id === activeTab)?.label.slice(0, -1)}`}
          </Button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-0.5 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end p-3 rounded-lg border bg-muted/20">
        {/* Search */}
        <div className="space-y-1 flex-1 min-w-44">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Voucher # or narration…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Date from */}
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="h-8 text-sm w-36"
          />
        </div>

        {/* Date to */}
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="h-8 text-sm w-36"
          />
        </div>

        {/* Approval status */}
        <div className="space-y-1">
          <Label className="text-xs">Approval</Label>
          <Select value={approvalFilter} onValueChange={(v) => { setApprovalFilter(v === '__all__' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Any</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Posting status */}
        <div className="space-y-1">
          <Label className="text-xs">Posting</Label>
          <Select value={postingFilter} onValueChange={(v) => { setPostingFilter(v === '__all__' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Any</SelectItem>
              <SelectItem value="unposted">Unposted</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
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
