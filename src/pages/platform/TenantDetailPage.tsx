import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Puzzle,
  Ban,
  Activity,
  CreditCard,
  Globe,
  Database,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchTenant,
  fetchProvisioningLogs,
  suspendTenant,
  reactivateTenant,
  type ProvisioningLog,
} from '@/api/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function statusVariant(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'provisioning_failed': return 'destructive'
    default: return 'secondary'
  }
}

function stepIcon(status: ProvisioningLog['status']) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
    case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    default: return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['platform', 'tenants', id],
    queryFn: () => fetchTenant(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['platform', 'tenants', id, 'logs'],
    queryFn: () => fetchProvisioningLogs(id!).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch more frequently if any log is 'running'
      const logs = query.state.data as any
      return logs?.some((l: any) => l.status === 'running') ? 5000 : 30000
    }
  })

  const refinedLogs = useMemo(() => {
    if (!logs) return []
    // Group by step and keep only the latest log for each step
    const latestMap = new Map<string, ProvisioningLog>()
    
    // Sort oldest first to ensure latest overwrites
    const sorted = [...logs].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (timeDiff !== 0) return timeDiff
      return (a.id || "").localeCompare(b.id || "") // Oldest ID first
    })

    sorted.forEach(log => {
      latestMap.set(log.step, log)
    })

    // Return newest first for the timeline
    return Array.from(latestMap.values()).sort((a, b) => {
      const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (timeDiff !== 0) return timeDiff
      return (b.id || "").localeCompare(a.id || "")
    })
  }, [logs])

  const suspendMutation = useMutation({
    mutationFn: () => suspendTenant(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', id] })
      toast.success('Tenant suspended successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to suspend tenant')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateTenant(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', id] })
      toast.success('Tenant reactivated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reactivate tenant')
    },
  })

  if (tenantLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!tenant) return <div className="p-8 text-muted-foreground">Tenant not found</div>

  return (
    <div className="p-8 w-full space-y-6">
      <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/platform/tenants')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tenants
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <Badge variant={statusVariant(tenant.status)}>
              {tenant.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm font-mono mt-1">{tenant.subdomain}</p>
        </div>
        <div className="flex items-center gap-2">
          {tenant.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
            >
              <Ban className="h-4 w-4 mr-2 text-amber-600" />
              Suspend
            </Button>
          )}
          {tenant.status === 'suspended' && (
            <Button
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Reactivate
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/platform/tenants/${id}/modules`}>
              <Puzzle className="h-4 w-4 mr-2" />
              Modules
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
              {tenant.status === 'pending' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Plan</p>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-semibold text-base mt-1.5">{tenant.plan_name ?? '—'}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Subdomain</p>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-semibold font-mono text-sm mt-1.5 text-foreground">{tenant.subdomain}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Database</p>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-semibold font-mono text-sm mt-1.5 truncate text-foreground" title={tenant.db_name}>
              {tenant.db_name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provisioning Log Timeline */}
      <Card className="w-full bg-card/85 backdrop-blur-xl border-border/70 shadow-elevated">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Provisioning Log
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {logsLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : logs?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No provisioning events</p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {refinedLogs.map((log) => (
                <li key={log.id} className="ml-6">
                  <span className="absolute -left-[11px] flex items-center justify-center w-5 h-5 bg-background rounded-full ring-2 ring-border">
                    {stepIcon(log.status)}
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{log.step}</p>
                    <time className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </time>
                  </div>
                  {log.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{log.message}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
