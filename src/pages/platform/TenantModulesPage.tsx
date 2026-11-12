import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchTenantModules,
  fetchModuleHistory,
  activateTenantModule,
  deactivateTenantModule,
  type TenantModule,
  type ModuleActivationHistory,
} from '@/api/platform'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

function HistoryTimeline({ tenantId, moduleKey }: { tenantId: string; moduleKey: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['module-history', tenantId, moduleKey],
    queryFn: () => fetchModuleHistory(tenantId, moduleKey).then((r) => r.data.data),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading history…</p>
  if (!data?.length) return <p className="text-sm text-muted-foreground">No history yet.</p>

  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {data.map((entry: ModuleActivationHistory) => (
        <li key={entry.id} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
          <p className="text-sm font-medium capitalize">{entry.action}</p>
          <p className="text-xs text-muted-foreground">
            {entry.performed_by} &middot;{' '}
            {new Date(entry.performed_at).toLocaleString()}
          </p>
          {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
        </li>
      ))}
    </ol>
  )
}

export default function TenantModulesPage() {
  const { id: tenantId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [historyModule, setHistoryModule] = useState<TenantModule | null>(null)

  const { data: modules, isLoading } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: () => fetchTenantModules(tenantId!).then((r) => r.data.data),
    enabled: !!tenantId,
  })

  const activate = useMutation({
    mutationFn: (moduleKey: string) => activateTenantModule(tenantId!, moduleKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] })
      toast.success('Module activated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to activate module')
    },
  })

  const deactivate = useMutation({
    mutationFn: (moduleKey: string) => deactivateTenantModule(tenantId!, moduleKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] })
      toast.success('Module deactivated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to deactivate module')
    },
  })

  const handleToggle = (mod: TenantModule) => {
    if (mod.is_active) {
      deactivate.mutate(mod.module_key)
    } else {
      activate.mutate(mod.module_key)
    }
  }

  const isPending = activate.isPending || deactivate.isPending

  return (
    <div className="p-8 w-full space-y-6">
      <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to={`/platform/tenants/${tenantId}`}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Tenant
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Module Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Enable or disable modules and feature packages for this tenant</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading modules…</p>}

      {modules && (
        <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/85 backdrop-blur-xl shadow-elevated divide-y divide-border/60">
          {modules.map((mod) => (
            <div
              key={mod.module_key}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{mod.display_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                    v{mod.version}
                  </span>
                  {mod.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {mod.is_core && (
                    <Badge variant="outline" className="border-primary/40 text-primary">Core</Badge>
                  )}
                  {!mod.is_available && (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      Unavailable
                    </Badge>
                  )}
                </div>
                {mod.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">{mod.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setHistoryModule(mod)}
                >
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  History
                </Button>
                <Button
                  size="sm"
                  variant={mod.is_active ? 'outline' : 'default'}
                  disabled={!mod.is_available || isPending}
                  onClick={() => handleToggle(mod)}
                  className={cn(
                    'h-8 px-3 text-xs font-medium',
                    mod.is_active && 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                  )}
                >
                  {mod.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activation history modal */}
      <Dialog open={!!historyModule} onOpenChange={(open) => !open && setHistoryModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{historyModule?.display_name} — Activation History</DialogTitle>
          </DialogHeader>
          {historyModule && tenantId && (
            <HistoryTimeline tenantId={tenantId} moduleKey={historyModule.module_key} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
