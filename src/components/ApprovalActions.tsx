import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { canApprove, canSubmitForApproval } from '@/utils/permissions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'

interface ApprovalActionsProps {
  approvalStatus: ApprovalStatus
  postingStatus?: string
  onSubmit: (comments?: string) => Promise<void>
  onApprove: (comments?: string) => Promise<void>
  onReject: (comments?: string) => Promise<void>
  onPost?: () => Promise<void>
  disabled?: boolean
}

type ActionType = 'submit' | 'approve' | 'reject' | 'post'

const ACTION_CONFIG: Record<ActionType, { label: string; variant: 'default' | 'destructive' | 'outline'; title: string; description: string; requiresComments: boolean }> = {
  submit: {
    label: 'Submit for Approval',
    variant: 'default',
    title: 'Submit for Approval',
    description: 'This will send the document for approval. You can add optional comments.',
    requiresComments: false,
  },
  approve: {
    label: 'Approve',
    variant: 'default',
    title: 'Approve Document',
    description: 'Approving this document will allow it to be posted. Add optional comments.',
    requiresComments: false,
  },
  reject: {
    label: 'Reject',
    variant: 'destructive',
    title: 'Reject Document',
    description: 'Rejecting will return the document to draft status. Please provide a reason.',
    requiresComments: true,
  },
  post: {
    label: 'Post',
    variant: 'default',
    title: 'Post Document',
    description: 'Posting is irreversible. The document will be finalized and cannot be edited.',
    requiresComments: false,
  },
}

export default function ApprovalActions({
  approvalStatus,
  postingStatus,
  onSubmit,
  onApprove,
  onReject,
  onPost,
  disabled,
}: ApprovalActionsProps) {
  const role = useAuthStore((s) => s.role)
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPosted = postingStatus === 'posted'

  const handleConfirm = async () => {
    if (!activeAction) return
    setLoading(true)
    setError(null)
    try {
      if (activeAction === 'submit') await onSubmit(comments || undefined)
      else if (activeAction === 'approve') await onApprove(comments || undefined)
      else if (activeAction === 'reject') await onReject(comments || undefined)
      else if (activeAction === 'post' && onPost) await onPost()
      setActiveAction(null)
      setComments('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Action failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const open = (action: ActionType) => {
    setComments('')
    setError(null)
    setActiveAction(action)
  }

  const config = activeAction ? ACTION_CONFIG[activeAction] : null

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {approvalStatus === 'draft' && canSubmitForApproval(role) && !isPosted && (
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => open('submit')}
          >
            Submit for Approval
          </Button>
        )}
        {approvalStatus === 'pending_approval' && canApprove(role) && (
          <>
            <Button size="sm" disabled={disabled} onClick={() => open('approve')}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={disabled}
              onClick={() => open('reject')}
            >
              Reject
            </Button>
          </>
        )}
        {approvalStatus === 'approved' && postingStatus === 'unposted' && onPost && (
          <Button size="sm" disabled={disabled} onClick={() => open('post')}>
            Post
          </Button>
        )}
      </div>

      <Dialog open={!!activeAction} onOpenChange={(o) => !o && setActiveAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{config?.title}</DialogTitle>
            <DialogDescription>{config?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="comments">
                Comments{config?.requiresComments ? ' (required)' : ' (optional)'}
              </Label>
              <textarea
                id="comments"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add comments…"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant={config?.variant ?? 'default'}
              onClick={handleConfirm}
              disabled={loading || (config?.requiresComments && !comments.trim())}
            >
              {loading ? 'Processing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
