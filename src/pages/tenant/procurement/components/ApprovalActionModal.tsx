import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ApprovalActionModalProps {
  open: boolean
  onClose: () => void
  actionType: 'approve' | 'reject' | 'submit' | 'cancel' | 'post'
  documentTitle: string
  onConfirm: (comments: string) => Promise<void>
}

export default function ApprovalActionModal({
  open,
  onClose,
  actionType,
  documentTitle,
  onConfirm,
}: ApprovalActionModalProps) {
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const titles = {
    submit: 'Submit for Approval',
    approve: 'Approve Document',
    reject: 'Reject Document',
    cancel: 'Cancel Document',
    post: 'Post to General Ledger',
  }

  const descriptions = {
    submit: `Are you sure you want to submit ${documentTitle} for approval? Reviewers will be notified.`,
    approve: `Are you sure you want to approve ${documentTitle}?`,
    reject: `Are you sure you want to reject ${documentTitle}? Please specify a reason.`,
    cancel: `Are you sure you want to cancel ${documentTitle}? This action cannot be undone.`,
    post: `Are you sure you want to post ${documentTitle}? This will finalize the document.`,
  }

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true)
      await onConfirm(comments)
      setComments('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{titles[actionType]}</DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            {descriptions[actionType]}
          </DialogDescription>
        </DialogHeader>

        {(actionType === 'approve' || actionType === 'reject') && (
          <div className="space-y-2 py-3">
            <Label htmlFor="comments">
              {actionType === 'reject' ? 'Rejection Reason (Required)' : 'Approval Comments (Optional)'}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={actionType === 'reject' ? 'State why this is rejected...' : 'Add any notes...'}
              rows={3}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button
            variant={actionType === 'reject' || actionType === 'cancel' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isSubmitting || (actionType === 'reject' && !comments.trim())}
          >
            {isSubmitting ? 'Processing...' : titles[actionType]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
