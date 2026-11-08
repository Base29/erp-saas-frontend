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
import { Textarea } from '@/components/ui/textarea'
import { Check, X, Send, Lock, Loader2 } from 'lucide-react'

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

const ACTION_CONFIG: Record<
  ActionType,
  {
    label: string
    variant: 'default' | 'destructive' | 'outline'
    title: string
    description: string
    requiresComments: boolean
  }
> = {
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
            className="gap-1.5 shadow-xs hover:border-primary/40 text-xs"
          >
            <Send className="h-3.5 w-3.5 text-primary" />
            <span>Submit for Approval</span>
          </Button>
        )}
        {approvalStatus === 'pending_approval' && canApprove(role) && (
          <>
            <Button
              size="sm"
              disabled={disabled}
              onClick={() => open('approve')}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.3)] text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Approve</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={disabled}
              onClick={() => open('reject')}
              className="gap-1.5 shadow-[0_4px_14px_0_rgba(239,68,68,0.3)] text-xs"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reject</span>
            </Button>
          </>
        )}
        {approvalStatus === 'approved' && postingStatus === 'unposted' && onPost && (
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => open('post')}
            className="gap-1.5 shadow-[0_4px_14px_0_rgba(79,70,229,0.3)] text-xs"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Post</span>
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
            <div className="space-y-1.5">
              <Label htmlFor="comments" className="text-xs font-medium text-foreground/80">
                Comments{config?.requiresComments ? ' (required)' : ' (optional)'}
              </Label>
              <Textarea
                id="comments"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add comments…"
              />
            </div>
            {error && (
              <p className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setActiveAction(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant={config?.variant ?? 'default'}
              size="sm"
              onClick={handleConfirm}
              disabled={loading || (config?.requiresComments && !comments.trim())}
              className="gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? 'Processing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
