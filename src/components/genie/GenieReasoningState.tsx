import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface GenieReasoningStateProps {
  userPrompt?: string
}

export const GenieReasoningState: React.FC<GenieReasoningStateProps> = ({ userPrompt = '' }) => {
  const [seconds, setSeconds] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const hasInvoice = /inv[-_ ]?\d+/i.test(userPrompt)
  const hasCustomer = /customer|client/i.test(userPrompt)
  const hasStock = /stock|inventory|item/i.test(userPrompt)
  const isDrafting = /draft|write|compose|email|letter|reminder/i.test(userPrompt)

  const steps = [
    {
      title: 'Genie is analyzing your request',
      detail: 'Reviewing query context and business intent...',
    },
    {
      title: hasInvoice
        ? 'Genie is checking invoice ledger records'
        : hasCustomer
        ? 'Genie is inspecting customer account ledger'
        : hasStock
        ? 'Genie is checking inventory levels'
        : 'Genie is querying ERP database',
      detail: hasInvoice
        ? 'Fetching live balances, due dates, and payment history...'
        : hasCustomer
        ? 'Accessing customer ledger and credit terms...'
        : hasStock
        ? 'Checking warehouse stock counts and reorder points...'
        : 'Gathering verified system records...',
    },
    {
      title: isDrafting
        ? 'Genie is drafting the response'
        : 'Genie is reasoning & composing the response',
      detail: isDrafting
        ? 'Composing a clear, tailored email with verified ledger facts...'
        : 'Synthesizing verified figures and formulating clear business insights...',
    },
    {
      title: 'Genie is finalizing the response',
      detail: 'Reviewing calculations, formatting, and presentation...',
    },
  ]

  useEffect(() => {
    if (seconds < 3) {
      setStepIndex(0)
    } else if (seconds < 7) {
      setStepIndex(1)
    } else if (seconds < 22) {
      setStepIndex(2)
    } else {
      setStepIndex(3)
    }
  }, [seconds])

  const current = steps[stepIndex]

  return (
    <div className="w-full max-w-[92%] my-1.5 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-purple-600 dark:text-purple-400" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">{current.title}</span>
              <span className="text-[11px] text-muted-foreground/70 font-mono">({seconds}s)</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{current.detail}</p>
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground/60 shrink-0 font-medium">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Minimal subtle progress line */}
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-700 ease-out"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
