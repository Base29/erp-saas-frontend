import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Search, X, Upload, Pencil, Undo2, Loader2 } from 'lucide-react'
import BulkImportModal from '@/components/import/BulkImportModal'
import {
  fetchJournalVouchers,
  fetchFiscalPeriods,
  reverseJournalVoucher,
  type JournalVoucher,
  VOUCHER_TYPE_LABELS,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  { id: 'general',      label: 'General Journal' },
]

export default function JournalVouchersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')
  const [importOpen, setImportOpen] = useState(false)

  const [activeTab, setActiveTab]           = useState<VoucherTab>('all')
  const [page, setPage]                     = useState(1)
  const [search, setSearch]                 = useState(searchParams.get('search') ?? '')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [postingFilter, setPostingFilter]   = useState('')

  const [reversalJv, setReversalJv] = useState<JournalVoucher | null>(null)
  const [reversalDate, setReversalDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reversalPeriodId, setReversalPeriodId] = useState('')
  const [reversalReason, setReversalReason] = useState('')
  const [reversalError, setReversalError] = useState<string | null>(null)

  const { data: openPeriods = [] } = useQuery({
    queryKey: ['fiscal-periods', 'open'],
    queryFn: () =>
      fetchFiscalPeriods({ per_page: -1 }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? []
        return list.filter((p: any) => p.status === 'open')
      }),
  })

  useEffect(() => {
    if (openPeriods.length > 0 && !reversalPeriodId) {
      const today = reversalDate
      const match = openPeriods.find(
        (p: any) => p.start_date <= today && p.end_date >= today
      ) ?? openPeriods[0]
      if (match) setReversalPeriodId(String(match.id))
    }
  }, [openPeriods, reversalDate, reversalPeriodId])

  const reverseMutation = useMutation({
    mutationFn: (payload: { id: string; reversal_date: string; fiscal_period_id: string; reason: string }) =>
      reverseJournalVoucher(payload.id, {
        reversal_date: payload.reversal_date,
        fiscal_period_id: payload.fiscal_period_id,
        reason: payload.reason,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['journal-vouchers'] })
      qc.invalidateQueries({ queryKey: ['general-ledger'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
      setReversalJv(null)
      const newId = res.data?.data?.reversal_voucher?.id
      if (newId) {
        navigate(`/accounts/journal-vouchers/${newId}`)
      }
    },
    onError: (err: any) => {
      setReversalError(err?.response?.data?.message ?? 'Failed to reverse voucher')
    },
  })

  // Build query params
  const queryParams: Record<string, string | number> = { page }
  if (activeTab !== 'all') queryParams.voucher_type = activeTab
  if (search.trim())       queryParams.search        = search.trim()
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
    setSearchParams({})
    setPage(1)
  }

  const hasFilters = search || dateFrom || dateTo || approvalFilter || postingFilter

  const columns: ColumnDef<JournalVoucher>[] = [
    {
      accessorKey: 'voucher_number',
      header: 'Voucher #',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-medium">
          <span>{row.original.voucher_number}</span>
          {row.original.is_reversed && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1 font-normal">Reversed</Badge>
          )}
          {row.original.reversed_voucher_id && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
              Reversal
            </Badge>
          )}
        </div>
      ),
    },
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
        <span className="capitalize text-sm">
          {VOUCHER_TYPE_LABELS[row.original.voucher_type] ?? row.original.voucher_type.replace(/_/g, ' ')}
        </span>
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
      cell: ({ row }) => {
        const jv = row.original
        const isPosted = jv.posting_status === 'posted'
        const isApproved = jv.approval_status === 'approved'
        const canModify = !jv.is_auto_generated

        // Until the voucher is not Approved, it can be edited. Once approved it cannot be edited.
        // Once the voucher is posted, it cannot be deleted or edited. It can only be reversed.
        const canEditVoucher = canEdit && canModify && !isApproved && !isPosted
        const canReverseVoucher = canEdit && canModify && isPosted && !jv.is_reversed && !jv.reversed_voucher_id

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="View Voucher"
              onClick={() => navigate(`/accounts/journal-vouchers/${jv.id}`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {canEditVoucher && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Edit Voucher"
                onClick={() => navigate(`/accounts/journal-vouchers/${jv.id}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canReverseVoucher && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                title="Reverse Voucher"
                onClick={() => {
                  setReversalReason('')
                  setReversalError(null)
                  setReversalDate(new Date().toISOString().split('T')[0])
                  setReversalJv(jv)
                }}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {jv.is_reversed && (
              <span className="text-[10px] text-muted-foreground italic px-1.5 py-0.5 rounded bg-muted/40 border">
                Reversed
              </span>
            )}
          </div>
        )
      },
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Upload Journals
            </Button>
            <Button size="sm" onClick={handleNewVoucher}>
              <Plus className="h-4 w-4 mr-1" />
              {activeTab === 'all' ? 'New Voucher' : `New ${TABS.find((t) => t.id === activeTab)?.label.slice(0, -1)}`}
            </Button>
          </div>
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
              className="pl-8 pr-8 h-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); setSearchParams({}) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
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
          <Select value={approvalFilter || '__all__'} onValueChange={(v) => { setApprovalFilter(v === '__all__' ? '' : v); setPage(1) }}>
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
          <Select value={postingFilter || '__all__'} onValueChange={(v) => { setPostingFilter(v === '__all__' ? '' : v); setPage(1) }}>
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
        hasActiveFilters={Boolean(hasFilters)}
        onClearFilters={clearFilters}
      />

      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        type="manual_journal"
        title="Import Manual Journals"
        description="Upload CSV containing balanced journal vouchers. Total debits and credits must equal zero."
        onSuccess={() => qc.invalidateQueries({ queryKey: ['journal-vouchers'] })}
      />

      {/* Reversal Confirmation Modal */}
      <Dialog open={!!reversalJv} onOpenChange={(open) => !open && setReversalJv(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reverse Journal Voucher</DialogTitle>
            <DialogDescription>
              This will create a new posted contra journal voucher with inverted debits and credits, neutralizing the financial effect of <strong>{reversalJv?.voucher_number}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="page_reversal_date" className="text-xs font-medium">Reversal Date</Label>
              <Input
                id="page_reversal_date"
                type="date"
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="page_fiscal_period" className="text-xs font-medium">Fiscal Period</Label>
              <Select value={reversalPeriodId} onValueChange={setReversalPeriodId}>
                <SelectTrigger id="page_fiscal_period">
                  <SelectValue placeholder="Select open fiscal period…" />
                </SelectTrigger>
                <SelectContent>
                  {openPeriods.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({formatDate(p.start_date)} - {formatDate(p.end_date)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="page_reversal_reason" className="text-xs font-medium">Reason for Reversal *</Label>
              <Textarea
                id="page_reversal_reason"
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Explain why this journal voucher is being reversed (required for audit trail)…"
              />
            </div>

            {reversalError && (
              <p className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {reversalError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReversalJv(null)}
              disabled={reverseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!reversalReason.trim()) {
                  setReversalError('Reversal reason is required.')
                  return
                }
                if (!reversalPeriodId) {
                  setReversalError('An open fiscal period must be selected.')
                  return
                }
                setReversalError(null)
                if (reversalJv) {
                  reverseMutation.mutate({
                    id: reversalJv.id,
                    reversal_date: reversalDate,
                    fiscal_period_id: reversalPeriodId,
                    reason: reversalReason.trim(),
                  })
                }
              }}
              disabled={reverseMutation.isPending || !reversalReason.trim()}
              className="gap-1.5"
            >
              {reverseMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              {reverseMutation.isPending ? 'Reversing…' : 'Confirm Reversal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
