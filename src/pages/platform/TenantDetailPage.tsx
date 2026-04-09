import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
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
  })

  const suspendMutation = useMutation({
    mutationFn: () => suspendTenant(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', id] }),
  })

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateTenant(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', id] }),
  })

  if (tenantLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!tenant) return <div className="p-8 text-muted-foreground">Tenant not found</div>

  return (
    <div className="p-8 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" onClick={() => navigate('/platform/tenants')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tenants
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{tenant.subdomain}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              tenant.status === 'active'
                ? 'success'
                : tenant.status === 'suspended'
                ? 'warning'
                : tenant.status === 'provisioning_failed'
                ? 'destructive'
                : 'secondary'
            }
          >
            {tenant.status}
          </Badge>
          {tenant.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
            >
              Suspend
            </Button>
          )}
          {tenant.status === 'suspended' && (
            <Button
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              Reactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-medium">{tenant.plan_name ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Database</p>
            <p className="font-medium font-mono text-sm">{tenant.db_name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Provisioning Log Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provisioning Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : logs?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No provisioning events</p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {logs?.map((log) => (
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
