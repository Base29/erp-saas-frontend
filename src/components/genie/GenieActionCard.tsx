import React, { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  FileCheck2,
  UserCheck,
  Receipt,
  ArrowRightLeft,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGenieStore } from '@/store/genieStore'
import { useNavigate } from 'react-router-dom'
import type { GenieAction } from '@/api/genie'

interface GenieActionCardProps {
  action: GenieAction
}

export const GenieActionCard: React.FC<GenieActionCardProps> = ({ action }) => {
  const { approveAction, rejectAction, setIsOpen } = useGenieStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const navigate = useNavigate()

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await approveAction(action.id)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await rejectAction(action.id)
    } finally {
      setIsProcessing(false)
    }
  }

  const getActionIcon = (type: string) => {
    if (type.includes('customer')) return <UserCheck className="h-4 w-4 text-blue-600" />
    if (type.includes('quotation') || type.includes('order')) return <Receipt className="h-4 w-4 text-amber-600" />
    if (type.includes('journal')) return <FileCheck2 className="h-4 w-4 text-emerald-600" />
    if (type.includes('stock')) return <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
    return <UploadCloud className="h-4 w-4 text-purple-600" />
  }

  const isPending = action.status === 'pending_approval'
  const isExecuted = action.status === 'executed'
  const isRejected = action.status === 'rejected'
  const isFailed = action.status === 'failed'

  const payload = action.payload || {}

  return (
    <div className="my-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            {getActionIcon(action.action_type)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>{action.title}</span>
              <span className="text-[11px] font-normal text-purple-600 dark:text-purple-400 font-sans">
                • Proposed by Genie
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {action.description || 'Human review required before committing changes.'}
            </p>
          </div>
        </div>

        <div>
          {isPending && (
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldAlert className="mr-1 h-3 w-3" />
              Pending Review
            </Badge>
          )}
          {isExecuted && (
            <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Executed
            </Badge>
          )}
          {isRejected && (
            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <XCircle className="mr-1 h-3 w-3" />
              Rejected
            </Badge>
          )}
          {isFailed && (
            <Badge variant="destructive">
              Failed
            </Badge>
          )}
        </div>
      </div>

      {/* Payload Parameters Breakdown */}
      <div className="my-3 space-y-2 text-xs">
        {payload.name && (
          <div className="flex justify-between py-0.5 border-b border-muted/50">
            <span className="text-muted-foreground font-medium">Customer Name:</span>
            <span className="font-semibold text-foreground">{payload.name}</span>
          </div>
        )}
        {payload.customer_code && (
          <div className="flex justify-between py-0.5 border-b border-muted/50">
            <span className="text-muted-foreground font-medium">Code:</span>
            <span className="font-mono text-foreground">{payload.customer_code}</span>
          </div>
        )}
        {payload.credit_limit !== undefined && (
          <div className="flex justify-between py-0.5 border-b border-muted/50">
            <span className="text-muted-foreground font-medium">Credit Limit:</span>
            <span className="text-foreground">${Number(payload.credit_limit).toLocaleString()}</span>
          </div>
        )}
        {payload.quotation_date && (
          <div className="flex justify-between py-0.5 border-b border-muted/50">
            <span className="text-muted-foreground font-medium">Quote Date:</span>
            <span className="text-foreground">{payload.quotation_date}</span>
          </div>
        )}
        {payload.voucher_date && (
          <div className="flex justify-between py-0.5 border-b border-muted/50">
            <span className="text-muted-foreground font-medium">Voucher Date:</span>
            <span className="text-foreground">{payload.voucher_date}</span>
          </div>
        )}
        {payload.narration && (
          <div className="py-0.5 border-b border-muted/50">
            <span className="text-muted-foreground font-medium">Narration:</span>
            <p className="mt-0.5 text-foreground italic">{payload.narration}</p>
          </div>
        )}

        {/* Lines Breakdown if present */}
        {Array.isArray(payload.lines) && payload.lines.length > 0 && (
          <div className="mt-2 rounded-lg bg-muted/40 p-2">
            <div className="font-medium text-foreground mb-1">Items / Lines ({payload.lines.length}):</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {payload.lines.map((ln: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[11px] py-0.5 border-b border-muted/30 last:border-0">
                  <span className="text-muted-foreground">
                    {ln.item_id ? `Item: ${ln.item_id.slice(0, 8)}...` : `Account: ${ln.account_id?.slice(0, 8)}...`}
                  </span>
                  <span className="font-mono text-foreground">
                    {ln.quantity ? `${ln.quantity} × $${ln.unit_price}` : `Dr: $${ln.debit || 0} / Cr: $${ln.credit || 0}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Import Details */}
        {payload.import_type && (
          <div className="rounded-lg bg-muted/40 p-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Target Entity:</span>
              <span className="font-semibold capitalize text-foreground">{payload.import_type}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground font-medium">Rows:</span>
              <span className="font-mono text-foreground">{payload.record_count || 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Execution Result Banner */}
      {isExecuted && action.execution_result && (
        <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div>
            <p className="font-medium">{action.execution_result.message || 'Action executed successfully.'}</p>
          </div>
          {action.execution_result.view_url && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              onClick={() => {
                navigate(action.execution_result!.view_url)
                setIsOpen(false)
              }}
            >
              <span>View</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {isFailed && action.error_message && (
        <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
          {action.error_message}
        </div>
      )}

      {/* Action Buttons for HITL Confirmation */}
      {isPending && (
        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleReject}
            disabled={isProcessing}
          >
            Reject
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Approve & Execute</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
