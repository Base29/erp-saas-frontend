import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatusType =
  | 'draft'
  | 'pending_approval'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'unposted'
  | 'paid'
  | 'unpaid'
  | 'partially_paid'
  | 'active'
  | 'inactive'
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'running'
  | 'success'
  | 'failed'
  | string

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType
  label?: string
  dot?: boolean
}

interface StatusConfig {
  label: string
  bg: string
  border: string
  text: string
  dotColor: string
  pulse?: boolean
}

const statusConfigs: Record<string, StatusConfig> = {
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    border: 'border-emerald-500/25 dark:border-emerald-800/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  posted: {
    label: 'Posted',
    bg: 'bg-blue-500/10 dark:bg-blue-950/40',
    border: 'border-blue-500/25 dark:border-blue-800/40',
    text: 'text-blue-700 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  active: {
    label: 'Active',
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    border: 'border-emerald-500/25 dark:border-emerald-800/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    border: 'border-emerald-500/25 dark:border-emerald-800/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    border: 'border-emerald-500/25 dark:border-emerald-800/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  pending_approval: {
    label: 'Pending Approval',
    bg: 'bg-amber-500/10 dark:bg-amber-950/40',
    border: 'border-amber-500/25 dark:border-amber-800/40',
    text: 'text-amber-700 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    pulse: true,
  },
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/10 dark:bg-amber-950/40',
    border: 'border-amber-500/25 dark:border-amber-800/40',
    text: 'text-amber-700 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    pulse: true,
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-500/10 dark:bg-blue-950/40',
    border: 'border-blue-500/25 dark:border-blue-800/40',
    text: 'text-blue-700 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    pulse: true,
  },
  running: {
    label: 'Running',
    bg: 'bg-blue-500/10 dark:bg-blue-950/40',
    border: 'border-blue-500/25 dark:border-blue-800/40',
    text: 'text-blue-700 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    pulse: true,
  },
  draft: {
    label: 'Draft',
    bg: 'bg-muted/70 dark:bg-muted/40',
    border: 'border-border/60',
    text: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground/60',
  },
  unposted: {
    label: 'Unposted',
    bg: 'bg-muted/70 dark:bg-muted/40',
    border: 'border-border/60',
    text: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground/60',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-500/10 dark:bg-rose-950/40',
    border: 'border-rose-500/25 dark:border-rose-800/40',
    text: 'text-rose-700 dark:text-rose-400',
    dotColor: 'bg-rose-500',
  },
  failed: {
    label: 'Failed',
    bg: 'bg-rose-500/10 dark:bg-rose-950/40',
    border: 'border-rose-500/25 dark:border-rose-800/40',
    text: 'text-rose-700 dark:text-rose-400',
    dotColor: 'bg-rose-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-500/10 dark:bg-rose-950/40',
    border: 'border-rose-500/25 dark:border-rose-800/40',
    text: 'text-rose-700 dark:text-rose-400',
    dotColor: 'bg-rose-500',
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-muted/60',
    border: 'border-border/50',
    text: 'text-muted-foreground/80',
    dotColor: 'bg-muted-foreground/40',
  },
  partially_paid: {
    label: 'Partially Paid',
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/40',
    border: 'border-indigo-500/25 dark:border-indigo-800/40',
    text: 'text-indigo-700 dark:text-indigo-400',
    dotColor: 'bg-indigo-500',
  },
}

export function StatusBadge({ status, label, dot = true, className, ...props }: StatusBadgeProps) {
  const normalizedKey = (status || '').toLowerCase().trim()
  const config = statusConfigs[normalizedKey] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    bg: 'bg-muted/60',
    border: 'border-border/60',
    text: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground',
  }

  const displayLabel = label || config.label

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight select-none transition-colors duration-150',
        config.bg,
        config.border,
        config.text,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            config.dotColor,
            config.pulse && 'animate-pulse'
          )}
        />
      )}
      <span className="capitalize">{displayLabel}</span>
    </span>
  )
}
