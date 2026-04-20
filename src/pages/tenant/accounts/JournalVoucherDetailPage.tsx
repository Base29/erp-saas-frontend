import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil } from 'lucide-react'
import {
  fetchJournalVoucher,
  submitJournalVoucherForApproval,
  approveJournalVoucher,
  rejectJournalVoucher,
  postJournalVoucher,
} from '@/api/tenant'
import ApprovalActions from '@/components/ApprovalActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/format'

const APPROVAL_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  draft: 'secondary',
  pending_approval: 'default',
  approved: 'success',
  rejected: 'destructive',
}

export default function JournalVoucherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const { data: jv, isLoading } = useQuery({
    queryKey: ['journal-voucher', id],
    queryFn: () => fetchJournalVoucher(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['journal-voucher', id] })
    qc.invalidateQueries({ queryKey: ['journal-vouchers'] })
  }

  const submitMut = useMutation({
    mutationFn: (comments?: string) => submitJournalVoucherForApproval(id!, comments),
    onSuccess: invalidate,
  })
  const approveMut = useMutation({
    mutationFn: (comments?: string) => approveJournalVoucher(id!, comments),
    onSuccess: invalidate,
  })
  const rejectMut = useMutation({
    mutationFn: (comments?: string) => rejectJournalVoucher(id!, comments),
    onSuccess: invalidate,
  })
  const postMut = useMutation({
    mutationFn: () => postJournalVoucher(id!),
    onSuccess: invalidate,
  })

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>
  }

  if (!jv) {
    return <div className="p-6 text-destructive">Voucher not found</div>
  }

  const totalDebit = (jv.lines ?? []).reduce((s, l) => s + Number(l.debit_amount), 0)
  const totalCredit = (jv.lines ?? []).reduce((s, l) => s + Number(l.credit_amount), 0)

  const canEditDoc =
    canEdit &&
    !jv.is_auto_generated &&
    jv.posting_status !== 'posted' &&
    jv.approval_status === 'draft'

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/journal-vouchers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{jv.voucher_number}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {jv.voucher_type.replace(/_/g, ' ')} · {formatDate(jv.voucher_date)}
          </p>
        </div>
        {canEditDoc && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/accounts/journal-vouchers/${id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
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

      {/* Approval actions */}
      {!jv.is_auto_generated && jv.posting_status !== 'posted' && (
        <ApprovalActions
          approvalStatus={jv.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
          postingStatus={jv.posting_status}
          onSubmit={(c) => submitMut.mutateAsync(c).then(() => {})}
          onApprove={(c) => approveMut.mutateAsync(c).then(() => {})}
          onReject={(c) => rejectMut.mutateAsync(c).then(() => {})}
          onPost={() => postMut.mutateAsync().then(() => {})}
          disabled={submitMut.isPending || approveMut.isPending || rejectMut.isPending || postMut.isPending}
        />
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Fiscal Period</p>
          <p className="font-medium">{jv.fiscal_period?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Reference</p>
          <p className="font-medium">{jv.reference ?? '—'}</p>
        </div>
        <div className="col-span-2">
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
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Journal Lines</h2>
        <div className="rounded-md border overflow-hidden">
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
                    {Number(line.debit_amount) > 0
                      ? Number(line.debit_amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {Number(line.credit_amount) > 0
                      ? Number(line.credit_amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t">
              <tr>
                <td colSpan={2} className="px-4 py-2 text-right font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">
                  {totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold">
                  {totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                </td>
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
    </div>
  )
}
