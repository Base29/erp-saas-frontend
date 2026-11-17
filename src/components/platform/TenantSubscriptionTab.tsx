import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Users,
  CheckCircle2,
  Ban,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Receipt,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchTenantSubscription,
  renewTenantSubscription,
  suspendTenantSubscription,
  reactivateTenantSubscription,
  type RenewSubscriptionPayload,
} from '@/api/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'

interface TenantSubscriptionTabProps {
  tenantId: string
  tenantName: string
  tenantStatus?: string
}

export function TenantSubscriptionTab({ tenantId, tenantName }: TenantSubscriptionTabProps) {
  const queryClient = useQueryClient()
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  // Form states for manual renewal
  const [renewTenure, setRenewTenure] = useState<'monthly' | 'annually' | 'custom'>('annually')
  const [customEndsAt, setCustomEndsAt] = useState('')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [paymentReference, setPaymentReference] = useState('')
  const [renewNotes, setRenewNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'tenants', tenantId, 'subscription'],
    queryFn: () => fetchTenantSubscription(tenantId).then((res) => res.data.data),
    enabled: !!tenantId,
  })

  const renewMutation = useMutation({
    mutationFn: (payload: RenewSubscriptionPayload) => renewTenantSubscription(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'subscription'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      toast.success('Subscription renewed successfully')
      setRenewDialogOpen(false)
      resetRenewForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to renew subscription')
    },
  })

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => suspendTenantSubscription(tenantId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'subscription'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      toast.success('Tenant subscription suspended')
      setSuspendDialogOpen(false)
      setSuspendReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to suspend subscription')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateTenantSubscription(tenantId, 'Reactivated by superadmin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'subscription'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      toast.success('Tenant subscription reactivated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reactivate subscription')
    },
  })

  const resetRenewForm = () => {
    setRenewTenure('annually')
    setCustomEndsAt('')
    setAmountPaid('')
    setPaymentReference('')
    setRenewNotes('')
  }

  const handleOpenRenew = () => {
    const defaultAmount = renewTenure === 'annually'
      ? data?.subscription?.plan?.price_annually ?? 490
      : data?.subscription?.plan?.price_monthly ?? 49
    setAmountPaid(String(defaultAmount))
    setRenewDialogOpen(true)
  }

  const handleTenureChange = (val: 'monthly' | 'annually' | 'custom') => {
    setRenewTenure(val)
    if (val === 'annually') {
      setAmountPaid(String(data?.subscription?.plan?.price_annually ?? 490))
    } else if (val === 'monthly') {
      setAmountPaid(String(data?.subscription?.plan?.price_monthly ?? 49))
    }
  }

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    renewMutation.mutate({
      tenure: renewTenure,
      custom_ends_at: renewTenure === 'custom' ? customEndsAt : undefined,
      amount_paid: amountPaid ? parseFloat(amountPaid) : 0,
      payment_reference: paymentReference || undefined,
      notes: renewNotes || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
        Loading subscription details...
      </div>
    )
  }

  const sub = data?.subscription
  const usage = data?.usage ?? { active_users: 0, max_users: 5, available: 5 }
  const history = data?.history ?? []

  const statusVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'grace_period':
        return 'warning'
      case 'suspended':
        return 'destructive'
      case 'expired':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const userPercent = usage.max_users > 0 ? Math.min(100, Math.round((usage.active_users / usage.max_users) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-card/90 via-card/80 to-primary/5 border border-border/70 backdrop-blur-xl shadow-elevated">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {sub?.plan?.name ?? 'Standard Plan'}
              </h2>
              <Badge variant={statusVariant(sub?.status)} className="capitalize">
                {sub?.status ?? 'No Subscription'}
              </Badge>
              {sub?.tenure && (
                <Badge variant="outline" className="capitalize text-xs font-mono">
                  {sub.tenure}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sub?.current_period_ends_at ? (
                <span>
                  Current period expires on <strong className="text-foreground">{new Date(sub.current_period_ends_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong> ({sub.days_remaining} days left)
                </span>
              ) : (
                'Subscription pending initial tenant activation.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            onClick={handleOpenRenew}
            className="rounded-xl text-xs h-9 shadow-glow-primary active:scale-[0.98]"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" />
            Manual Renew
          </Button>

          {sub?.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuspendDialogOpen(true)}
              className="rounded-xl text-xs h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" />
              Suspend
            </Button>
          )}

          {sub?.status === 'suspended' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="rounded-xl text-xs h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User Quota Card */}
        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">User Seat Limit</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold mt-1">
              {usage.active_users} <span className="text-sm font-normal text-muted-foreground">/ {usage.max_users} seats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
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
            <p className="text-[11px] text-muted-foreground">
              {usage.available > 0 ? (
                <span><strong>{usage.available}</strong> additional seats available to create.</span>
              ) : (
                <span className="text-destructive font-medium">Plan user ceiling reached. User creation locked.</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Tenure & Period Card */}
        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Billing Tenure</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold mt-1 capitalize">
              {sub?.tenure ?? 'Monthly'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Activated On:</span>
              <span className="font-medium text-foreground">
                {sub?.activated_at ? new Date(sub.activated_at).toLocaleDateString() : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Days Remaining:</span>
              <span className="font-semibold text-foreground">
                {sub?.days_remaining ?? 0} days
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Feature Modules Card */}
        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Included Modules</span>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold mt-1">
              Core Enterprise Suite
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {(sub?.plan?.features ?? ['accounts', 'inventory', 'sales']).map((feat) => (
                <Badge key={feat} variant="secondary" className="text-[11px] font-mono capitalize">
                  {feat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription History Ledger */}
      <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-elevated">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Renewal & Audit Ledger
          </CardTitle>
          <CardDescription className="text-xs">
            Historical manual renewals, tenure changes, and payment records.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No historical renewal records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Action</th>
                    <th className="py-2.5 px-4 font-semibold">Tenure</th>
                    <th className="py-2.5 px-4 font-semibold">Amount</th>
                    <th className="py-2.5 px-4 font-semibold">Payment Ref</th>
                    <th className="py-2.5 px-4 font-semibold">Operator</th>
                    <th className="py-2.5 px-4 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-normal">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-tight">
                          {item.action.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 capitalize font-medium">{item.tenure}</td>
                      <td className="py-2.5 px-4 font-semibold">
                        ${Number(item.amount_paid).toFixed(2)} {item.currency}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {item.payment_reference ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 capitalize text-muted-foreground">{item.performed_by_type}</td>
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

      {/* Manual Renewal Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/80 bg-card/95 backdrop-blur-2xl shadow-elevated">
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <RotateCw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Manual Subscription Renewal</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Extend tenant subscription for <strong>{tenantName}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleRenewSubmit} className="space-y-4 pt-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tenure_select" className="text-xs font-semibold">Renewal Duration / Tenure</Label>
                <Select value={renewTenure} onValueChange={(val: any) => handleTenureChange(val)}>
                  <SelectTrigger id="tenure_select" className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70">
                    <SelectValue placeholder="Select tenure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly" className="text-xs">
                      + 1 Month (Monthly Cycle)
                    </SelectItem>
                    <SelectItem value="annually" className="text-xs">
                      + 1 Year (Annual Cycle)
                    </SelectItem>
                    <SelectItem value="custom" className="text-xs">
                      Custom Expiration Date
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renewTenure === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom_ends_at" className="text-xs font-semibold">Custom Expiration Date</Label>
                  <Input
                    id="custom_ends_at"
                    type="date"
                    required
                    value={customEndsAt}
                    onChange={(e) => setCustomEndsAt(e.target.value)}
                    className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount_paid" className="text-xs font-semibold">Amount Paid ($)</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment_reference" className="text-xs font-semibold">Payment / Slip Ref</Label>
                  <Input
                    id="payment_reference"
                    placeholder="e.g. WIRE-98124"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="renew_notes" className="text-xs font-semibold">Internal Notes</Label>
                <Textarea
                  id="renew_notes"
                  placeholder="e.g., Annual renewal payment confirmed via wire transfer."
                  rows={2}
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  className="rounded-xl text-xs bg-background/50 border-border/70"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/50 gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenewDialogOpen(false)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renewMutation.isPending}
                className="rounded-xl text-xs h-9 shadow-glow-primary"
              >
                {renewMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Renewing...
                  </span>
                ) : (
                  'Confirm Renewal'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border-border/80 bg-card/95 backdrop-blur-2xl shadow-elevated">
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Suspend Subscription</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Lock tenant access for <strong>{tenantName}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Suspending the subscription will restrict user access across this tenant instance immediately.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="suspend_reason" className="text-xs font-semibold">Reason for Suspension</Label>
              <Input
                id="suspend_reason"
                placeholder="e.g., Non-payment of invoice or policy violation"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/50 gap-2">
            <Button type="button" variant="ghost" onClick={() => setSuspendDialogOpen(false)} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => suspendMutation.mutate(suspendReason || 'Suspended by superadmin')}
              disabled={suspendMutation.isPending}
              className="rounded-xl text-xs h-9"
            >
              {suspendMutation.isPending ? 'Suspending...' : 'Confirm Suspension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
