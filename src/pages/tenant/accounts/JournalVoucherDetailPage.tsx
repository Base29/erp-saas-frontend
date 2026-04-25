import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Printer } from 'lucide-react'
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

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  const submitMut  = useMutation({ mutationFn: (comments?: string) => submitJournalVoucherForApproval(id!, comments), onSuccess: invalidate })
  const approveMut = useMutation({ mutationFn: (comments?: string) => approveJournalVoucher(id!, comments), onSuccess: invalidate })
  const rejectMut  = useMutation({ mutationFn: (comments?: string) => rejectJournalVoucher(id!, comments), onSuccess: invalidate })
  const postMut    = useMutation({ mutationFn: () => postJournalVoucher(id!), onSuccess: invalidate })

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (!jv)       return <div className="p-6 text-destructive">Voucher not found</div>

  const totalDebit  = (jv.lines ?? []).reduce((s: number, l) => s + Number(l.debit_amount), 0)
  const totalCredit = (jv.lines ?? []).reduce((s: number, l) => s + Number(l.credit_amount), 0)

  const canEditDoc =
    canEdit &&
    !jv.is_auto_generated &&
    jv.posting_status !== 'posted' &&
    jv.approval_status === 'draft'

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

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 print-hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/journal-vouchers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{jv.voucher_number}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {jv.voucher_type.replace(/_/g, ' ')} · {formatDate(jv.voucher_date)}
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

        {/* Approval actions */}
        {!jv.is_auto_generated && jv.posting_status !== 'posted' && (
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

        {/* ── Printable area ── */}
        <div id="jv-print-area">
          {/* Print-only title */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h2 className="text-xl font-bold">Journal Voucher — {jv.voucher_number}</h2>
            <div className="flex gap-8 mt-2 text-sm text-gray-600">
              <span>Type: <strong className="text-black capitalize">{jv.voucher_type.replace(/_/g, ' ')}</strong></span>
              <span>Date: <strong className="text-black">{formatDate(jv.voucher_date)}</strong></span>
              <span>Status: <strong className="text-black capitalize">{jv.approval_status.replace(/_/g, ' ')} / {jv.posting_status}</strong></span>
            </div>
          </div>

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
          <div className="space-y-2 mt-6">
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
    </>
  )
}
