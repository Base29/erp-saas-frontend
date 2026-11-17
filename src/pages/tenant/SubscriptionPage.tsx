import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Receipt,
  Mail,
  Loader2,
} from 'lucide-react'
import { fetchSubscription } from '@/api/tenant'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SubscriptionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant', 'subscription'],
    queryFn: () => fetchSubscription().then((res) => res.data.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        Loading subscription overview...
      </div>
    )
  }

  const sub = data?.subscription
  const quota = data?.quota ?? { active_users: 1, max_users: 5, available: 4, percentage: 20 }
  const history = data?.history ?? []

  const statusVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'grace_period':
        return 'warning'
      case 'suspended':
      case 'expired':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const userPercent = Math.min(100, quota.percentage)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscription & Plan</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review your current enterprise subscription tier, seat limits, and renewal schedule.
        </p>
      </div>

      {/* Expiration or Warning Notice */}
      {sub?.is_expiring_soon && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Subscription Expiring Soon</p>
            <p className="opacity-90">
              Your subscription is scheduled to expire in <strong>{sub.days_remaining} days</strong>. Please coordinate with the platform administrator to extend your term.
            </p>
          </div>
        </div>
      )}

      {sub?.is_expired && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Subscription Term Expired</p>
            <p className="opacity-90">
              Your subscription period has ended. Certain operations like adding users may be restricted. Please contact support.
            </p>
          </div>
        </div>
      )}

      {/* Main Hero Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-card/95 via-card/85 to-primary/5 border border-border/70 backdrop-blur-2xl shadow-elevated">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {sub?.plan.name ?? 'Standard Plan'}
                </h2>
                <Badge variant={statusVariant(sub?.status)} className="capitalize text-xs font-semibold">
                  {sub?.status ?? 'Active'}
                </Badge>
                {sub?.tenure && (
                  <Badge variant="outline" className="capitalize text-xs font-mono">
                    {sub.tenure} Billing
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                {sub?.plan.description ?? 'Full-featured enterprise tier supporting core accounting, inventory management, and sales operations.'}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {sub?.current_period_ends_at ? (
                    <span>Renews on <strong>{new Date(sub.current_period_ends_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
                  ) : (
                    <span>Active Subscription</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <strong>{sub?.days_remaining ?? 0} days</strong> remaining in term
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-9 bg-background/50 border-border/80"
              onClick={() => {
                window.location.href = 'mailto:billing@geniecloud.dev?subject=Subscription%20Inquiry%20for%20Tenant'
              }}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      {/* Grid: Quota & Entitlements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Seats Quota */}
        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Seats Utilization
              </span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold mt-1">
              {quota.active_users} <span className="text-sm font-normal text-muted-foreground">/ {quota.max_users} seats active</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Your {sub?.plan.name ?? 'Standard'} plan allows a maximum of <strong>{quota.max_users} users</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="h-2.5 w-full rounded-full bg-secondary/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  userPercent >= 100
                    ? 'bg-destructive'
                    : userPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${userPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{userPercent}% consumed</span>
              {quota.available > 0 ? (
                <span className="text-foreground font-medium">{quota.available} seats remaining</span>
              ) : (
                <span className="text-destructive font-semibold">Seat limit reached</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Included Capabilities */}
        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plan Capabilities & Modules
              </span>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold mt-1">
              Activated Enterprise Modules
            </CardTitle>
            <CardDescription className="text-xs">
              All modules included in your subscription tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              {(sub?.plan.features ?? ['accounts', 'inventory', 'sales']).map((feat) => (
                <div key={feat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/60 text-xs font-medium capitalize">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Ledger & History */}
      <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-elevated">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Billing & Renewal History
          </CardTitle>
          <CardDescription className="text-xs">
            Past terms and subscription renewal acknowledgments.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No historical renewal events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Event</th>
                    <th className="py-2.5 px-4 font-semibold">Tenure</th>
                    <th className="py-2.5 px-4 font-semibold">Amount</th>
                    <th className="py-2.5 px-4 font-semibold">Reference</th>
                    <th className="py-2.5 px-4 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-tight">
                          {item.action.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 capitalize">{item.tenure}</td>
                      <td className="py-2.5 px-4 font-semibold">
                        ${Number(item.amount_paid).toFixed(2)} {item.currency}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {item.payment_reference ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate" title={item.notes ?? ''}>
                        {item.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
