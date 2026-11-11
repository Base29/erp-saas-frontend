import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Printer, Undo2, Loader2, ExternalLink } from 'lucide-react'
import {
  fetchJournalVoucher,
  fetchFiscalPeriods,
  submitJournalVoucherForApproval,
  approveJournalVoucher,
  rejectJournalVoucher,
  postJournalVoucher,
  reverseJournalVoucher,
  VOUCHER_TYPE_LABELS,
} from '@/api/tenant'
import ApprovalActions from '@/components/ApprovalActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/format'

const APPROVAL_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  draft: 'secondary',
  pending_approval: 'default',
  approved: 'success',
  rejected: 'destructive',
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function JournalVoucherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [reversalOpen, setReversalOpen] = useState(false)
  const [reversalDate, setReversalDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reversalPeriodId, setReversalPeriodId] = useState('')
  const [reversalReason, setReversalReason] = useState('')
  const [reversalError, setReversalError] = useState<string | null>(null)

  const { data: jv, isLoading } = useQuery({
    queryKey: ['journal-voucher', id],
    queryFn: () => fetchJournalVoucher(id!).then((r) => r.data.data),
    enabled: !!id,
  })

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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['journal-voucher', id] })
    qc.invalidateQueries({ queryKey: ['journal-vouchers'] })
  }

  const submitMut  = useMutation({ mutationFn: (comments?: string) => submitJournalVoucherForApproval(id!, comments), onSuccess: invalidate })
  const approveMut = useMutation({ mutationFn: (comments?: string) => approveJournalVoucher(id!, comments), onSuccess: invalidate })
  const rejectMut  = useMutation({ mutationFn: (comments?: string) => rejectJournalVoucher(id!, comments), onSuccess: invalidate })
  const postMut    = useMutation({ mutationFn: () => postJournalVoucher(id!), onSuccess: invalidate })

  const reverseMut = useMutation({
    mutationFn: (payload: { reversal_date: string; fiscal_period_id: string; reason: string }) =>
      reverseJournalVoucher(id!, payload),
    onSuccess: (res) => {
      invalidate()
      setReversalOpen(false)
      const reversalId = res.data?.data?.reversal_voucher?.id
      if (reversalId) {
        navigate(`/accounts/journal-vouchers/${reversalId}`)
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to reverse journal voucher.'
      setReversalError(msg)
    },
  })

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (!jv)       return <div className="p-6 text-destructive">Voucher not found</div>

  const totalDebit  = (jv.lines ?? []).reduce((s: number, l) => s + Number(l.debit_amount), 0)
  const totalCredit = (jv.lines ?? []).reduce((s: number, l) => s + Number(l.credit_amount), 0)

  const isApproved = jv.approval_status === 'approved'
  const isPosted   = jv.posting_status === 'posted'

  // Until the voucher is not Approved, it can be edited. Once approved it cannot be edited.
  // Once the voucher is posted, it cannot be deleted or edited. It can only be reversed.
  const canEditDoc =
    canEdit &&
    !jv.is_auto_generated &&
    !isApproved &&
    !isPosted

  // Once posted, it cannot be deleted or edited. It can only be reversed.
  const canReverseDoc =
    canEdit &&
    !jv.is_auto_generated &&
    isPosted &&
    !jv.is_reversed &&
    !jv.reversed_voucher_id

  const handleOpenReversal = () => {
    setReversalReason('')
    setReversalError(null)
    setReversalDate(new Date().toISOString().split('T')[0])
    setReversalOpen(true)
  }

  const handleConfirmReversal = () => {
    if (!reversalReason.trim()) {
      setReversalError('Reversal reason is required.')
      return
    }
    if (!reversalPeriodId) {
      setReversalError('An open fiscal period must be selected.')
      return
    }
    setReversalError(null)
    reverseMut.mutate({
      reversal_date: reversalDate,
      fiscal_period_id: reversalPeriodId,
      reason: reversalReason.trim(),
    })
  }

  return (
    <>
      {/* Print stylesheet — hides everything except voucher content */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #jv-print-area { display: block !important; }
          #jv-print-area {
            position: fixed; top: 0; left: 0; width: 100%;
            padding: 24px; font-family: sans-serif; font-size: 13px;
          }
          .print-hidden { display: none !important; }
        }
      `}</style>

      <div className="p-6 space-y-6 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 print-hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/journal-vouchers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <span>{jv.voucher_number}</span>
              {jv.is_reversed && (
                <Badge variant="destructive" className="text-xs font-normal">Reversed</Badge>
              )}
              {jv.reversed_voucher_id && (
                <Badge variant="outline" className="text-xs font-normal border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
                  Reversal Entry
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {VOUCHER_TYPE_LABELS[jv.voucher_type] ?? jv.voucher_type.replace(/_/g, ' ')} · {formatDate(jv.voucher_date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEditDoc && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/accounts/journal-vouchers/${id}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
            {canReverseDoc && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleOpenReversal}
              >
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Reverse Voucher
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap print-hidden">
          <Badge variant={APPROVAL_VARIANTS[jv.approval_status] ?? 'secondary'}>
            {jv.approval_status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant={jv.posting_status === 'posted' ? 'success' : 'secondary'}>
            {jv.posting_status}
          </Badge>
          {jv.is_auto_generated && (
            <Badge variant="secondary">Auto-generated</Badge>
          )}
        </div>

        {/* Reversal Banner notifications */}
        {jv.is_reversed && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center justify-between print-hidden">
            <div>
              <p className="font-semibold text-destructive">This voucher has been reversed</p>
              <p className="text-muted-foreground mt-0.5">
                Reversed on {formatDate(jv.reversed_at ?? '')}
                {jv.reversal_reason ? ` · Reason: ${jv.reversal_reason}` : ''}
              </p>
            </div>
            {jv.reversal_voucher_id && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => navigate(`/accounts/journal-vouchers/${jv.reversal_voucher_id}`)}
              >
                <span>View Reversal Entry</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {jv.reversed_voucher_id && (
          <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between print-hidden">
            <div>
              <p className="font-semibold">Contra / Reversal Entry</p>
              <p className="text-muted-foreground mt-0.5">
                This entry inverts all debits and credits of original voucher #{jv.reference?.replace(/^REV-/, '') ?? jv.reversed_voucher_id}.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs border-amber-300"
              onClick={() => navigate(`/accounts/journal-vouchers/${jv.reversed_voucher_id}`)}
            >
              <span>View Original Voucher</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Approval actions (Only visible when unposted) */}
        {!jv.is_auto_generated && !isPosted && (
          <div className="print-hidden">
            <ApprovalActions
              approvalStatus={jv.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
              postingStatus={jv.posting_status}
              onSubmit={(c) => submitMut.mutateAsync(c).then(() => {})}
              onApprove={(c) => approveMut.mutateAsync(c).then(() => {})}
              onReject={(c) => rejectMut.mutateAsync(c).then(() => {})}
              onPost={() => postMut.mutateAsync().then(() => {})}
              disabled={submitMut.isPending || approveMut.isPending || rejectMut.isPending || postMut.isPending}
            />
          </div>
        )}

        {/* Locked notification for approved & posted vouchers */}
        {isPosted && !jv.is_reversed && (
          <div className="rounded-md border border-muted bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between print-hidden">
            <span>
              <strong className="text-foreground">Approved &amp; Posted:</strong> This voucher is permanently posted to the General Ledger. It cannot be edited or deleted. It can only be reversed.
            </span>
          </div>
        )}

        {/* ── Printable area ── */}
        <div id="jv-print-area">
          {/* Print-only title */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h2 className="text-xl font-bold">Journal Voucher — {jv.voucher_number}</h2>
            <div className="flex gap-8 mt-2 text-sm text-gray-600">
              <span>Type: <strong className="text-black">{VOUCHER_TYPE_LABELS[jv.voucher_type] ?? jv.voucher_type.replace(/_/g, ' ')}</strong></span>
              <span>Date: <strong className="text-black">{formatDate(jv.voucher_date)}</strong></span>
              <span>Status: <strong className="text-black capitalize">{jv.approval_status.replace(/_/g, ' ')} / {jv.posting_status}</strong></span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fiscal Period</p>
              <p className="font-medium">{jv.fiscal_period?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reference</p>
              <p className="font-medium">{jv.reference ?? '—'}</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-muted-foreground">Narration</p>
              <p className="font-medium">{jv.narration ?? '—'}</p>
            </div>
            {jv.posted_at && (
              <div>
                <p className="text-muted-foreground">Posted At</p>
                <p className="font-medium">{formatDateTime(jv.posted_at)}</p>
              </div>
            )}
          </div>

          {/* Lines table */}
          <div className="space-y-2 mt-6">
            <h2 className="text-sm font-semibold">Journal Lines</h2>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Account</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Narration</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debit</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(jv.lines ?? []).map((line, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">
                        {line.account
                          ? `${line.account.account_code} — ${line.account.account_name}`
                          : `Account #${line.account_id}`}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{line.line_narration ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {Number(line.debit_amount) > 0 ? fmt(Number(line.debit_amount)) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {Number(line.credit_amount) > 0 ? fmt(Number(line.credit_amount)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-right font-semibold">Total</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(totalDebit)}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {Math.abs(totalDebit - totalCredit) > 0.01 && (
              <p className="text-xs text-destructive">
                Warning: Debits and credits are not balanced.
              </p>
            )}
          </div>

          {/* Print-only footer */}
          <div className="hidden print:block mt-8 pt-4 border-t text-xs text-gray-500">
            Printed on {new Date().toLocaleString('en-PK')}
          </div>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      <Dialog open={reversalOpen} onOpenChange={(open) => !open && setReversalOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reverse Journal Voucher</DialogTitle>
            <DialogDescription>
              This will create a new posted contra journal voucher with inverted debits and credits, neutralizing the financial effect of <strong>{jv.voucher_number}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reversal_date" className="text-xs font-medium">Reversal Date</Label>
              <Input
                id="reversal_date"
                type="date"
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fiscal_period" className="text-xs font-medium">Fiscal Period</Label>
              <Select value={reversalPeriodId} onValueChange={setReversalPeriodId}>
                <SelectTrigger id="fiscal_period">
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
              <Label htmlFor="reversal_reason" className="text-xs font-medium">Reason for Reversal *</Label>
              <Textarea
                id="reversal_reason"
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
              onClick={() => setReversalOpen(false)}
              disabled={reverseMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReversal}
              disabled={reverseMut.isPending || !reversalReason.trim()}
              className="gap-1.5"
            >
              {reverseMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              {reverseMut.isPending ? 'Reversing…' : 'Confirm Reversal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
