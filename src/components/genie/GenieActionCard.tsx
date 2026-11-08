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
  Building2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGenieStore } from '@/store/genieStore'
import { useNavigate } from 'react-router-dom'
import type { GenieAction } from '@/api/genie'
import { cn } from '@/lib/utils'

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
    if (type.includes('cost_center') || type.includes('cost-center')) return <Building2 className="h-4 w-4 text-emerald-500" />
    if (type.includes('customer')) return <UserCheck className="h-4 w-4 text-blue-500" />
    if (type.includes('quotation') || type.includes('order')) return <Receipt className="h-4 w-4 text-amber-500" />
    if (type.includes('journal')) return <FileCheck2 className="h-4 w-4 text-emerald-500" />
    if (type.includes('stock')) return <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
    return <UploadCloud className="h-4 w-4 text-primary" />
  }

  const isPending = action.status === 'pending_approval'
  const isExecuted = action.status === 'executed'
  const isRejected = action.status === 'rejected'
  const isFailed = action.status === 'failed'

  const payload = action.payload || {}

  const isCostCenter =
    action.action_type.includes('cost_center') ||
    action.action_type.includes('cost-center') ||
    action.title?.toLowerCase().includes('cost center') ||
    action.title?.includes('کاسٹ سینٹر') ||
    Boolean(payload.code && String(payload.code).toUpperCase().startsWith('CC-'))

  const isCustomer =
    !isCostCenter && (action.action_type.includes('customer') || action.title?.toLowerCase().includes('customer'))

  const getNameLabel = () => {
    if (isCostCenter) return 'Cost Center Name:'
    if (action.action_type.includes('supplier')) return 'Supplier Name:'
    if (action.action_type.includes('item')) return 'Item Name:'
    if (isCustomer) return 'Customer Name:'
    return 'Name:'
  }

  return (
    <div
      className={cn(
        "my-3 rounded-2xl border bg-card/90 backdrop-blur-xl p-4 shadow-elevated transition-all duration-300",
        isPending && "border-amber-500/40 shadow-[0_8px_24px_rgba(245,158,11,0.08)]",
        isExecuted && "border-emerald-500/40 shadow-[0_8px_24px_rgba(16,185,129,0.08)]",
        isRejected && "border-rose-500/30 opacity-80",
        isFailed && "border-destructive/40"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2.5 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shadow-2xs shrink-0">
            {getActionIcon(action.action_type)}
          </div>
          <div>
            <h4 dir="auto" className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
              <span>{action.title}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-normal text-primary font-sans bg-primary/10 px-1.5 py-0.2 rounded-md">
                <Sparkles className="h-2.5 w-2.5" /> Proposed by Genie
              </span>
            </h4>
            <p dir="auto" className="text-xs text-muted-foreground mt-0.5">
              {action.description || 'Human review required before committing changes.'}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isPending && (
            <Badge variant="outline" className="border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full font-medium shadow-2xs">
              <ShieldAlert className="mr-1 h-3 w-3" />
              Pending Review
            </Badge>
          )}
          {isExecuted && (
            <Badge variant="outline" className="border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full font-medium shadow-2xs">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Executed
            </Badge>
          )}
          {isRejected && (
            <Badge variant="outline" className="border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-full font-medium shadow-2xs">
              <XCircle className="mr-1 h-3 w-3" />
              Rejected
            </Badge>
          )}
          {isFailed && (
            <Badge variant="destructive" className="rounded-full">
              Failed
            </Badge>
          )}
        </div>
      </div>

      {/* Payload Parameters Breakdown */}
      <div className="my-3 space-y-2 text-xs">
        {payload.name && (
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium">
              {getNameLabel()}
            </span>
            <span className="font-semibold text-foreground">{payload.name}</span>
          </div>
        )}
        {(payload.code || payload.customer_code) && (
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium">
              {isCostCenter ? 'Cost Center Code:' : 'Code:'}
            </span>
            <span className="font-mono text-foreground font-medium">{payload.code || payload.customer_code}</span>
          </div>
        )}
        {payload.credit_limit !== undefined && (
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium">Credit Limit:</span>
            <span className="text-foreground font-semibold tabular-nums">${Number(payload.credit_limit).toLocaleString()}</span>
          </div>
        )}
        {payload.quotation_date && (
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium">Quote Date:</span>
            <span className="text-foreground">{payload.quotation_date}</span>
          </div>
        )}
        {payload.voucher_date && (
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium">Voucher Date:</span>
            <span className="text-foreground">{payload.voucher_date}</span>
          </div>
        )}
        {payload.narration && (
          <div className="py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium">Narration:</span>
            <p className="mt-0.5 text-foreground italic leading-relaxed">{payload.narration}</p>
          </div>
        )}

        {/* Lines Breakdown if present */}
        {Array.isArray(payload.lines) && payload.lines.length > 0 && (
          <div className="mt-2.5 rounded-xl bg-muted/40 border border-border/60 p-2.5">
            <div className="font-semibold text-foreground text-xs mb-1.5">Items / Lines ({payload.lines.length}):</div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {payload.lines.map((ln: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">
                    {ln.item_id ? `Item: ${ln.item_id.slice(0, 8)}...` : `Account: ${ln.account_id?.slice(0, 8)}...`}
                  </span>
                  <span className="font-mono text-foreground font-medium">
                    {ln.quantity ? `${ln.quantity} × $${ln.unit_price}` : `Dr: $${ln.debit || 0} / Cr: $${ln.credit || 0}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Import Details */}
        {payload.import_type && (
          <div className="rounded-xl bg-muted/40 border border-border/60 p-2.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Target Entity:</span>
              <span className="font-semibold capitalize text-foreground">{payload.import_type}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground font-medium">Rows:</span>
              <span className="font-mono text-foreground font-medium">{payload.record_count || 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Execution Result Banner */}
      {isExecuted && action.execution_result && (
        <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div>
            <p className="font-medium">{action.execution_result.message || 'Action executed successfully.'}</p>
          </div>
          {action.execution_result.view_url && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 active:scale-95"
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
        <div className="mt-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
          {action.error_message}
        </div>
      )}

      {/* Action Buttons for HITL Confirmation */}
      {isPending && (
        <div className="mt-3 flex items-center justify-end gap-2 pt-2.5 border-t border-border/60">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground hover:text-destructive rounded-lg active:scale-95"
            onClick={handleReject}
            disabled={isProcessing}
          >
            Reject
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-95"
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
