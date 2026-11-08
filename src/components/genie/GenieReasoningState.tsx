import React, { useState, useEffect } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

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
    <div className="w-full max-w-[94%] my-2 rounded-2xl border border-primary/20 bg-card/85 backdrop-blur-xl px-4 py-3 shadow-elevated transition-all duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            <Sparkles className="absolute -bottom-1 -right-1 h-3 w-3 text-primary animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground tracking-tight">{current.title}</span>
              <span className="text-[11px] text-muted-foreground/70 font-mono">({seconds}s)</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{current.detail}</p>
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground/70 shrink-0 font-medium bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Sleek Gradient Progress Indicator */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full bg-gradient-to-r from-primary via-indigo-500 to-purple-400 transition-all duration-700 ease-out shadow-glow-primary"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
