import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] }),
  })

  const deactivate = useMutation({
    mutationFn: (moduleKey: string) => deactivateTenantModule(tenantId!, moduleKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] }),
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/platform/tenants/${tenantId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Module Management</h1>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading modules…</p>}

      {modules && (
        <div className="rounded-md border divide-y">
          {modules.map((mod) => (
            <div key={mod.module_key} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{mod.display_name}</span>
                  <span className="text-xs text-muted-foreground">v{mod.version}</span>
                  {mod.is_core && (
                    <Badge variant="secondary" className="text-xs">Core</Badge>
                  )}
                  {!mod.is_available && (
                    <Badge variant="outline" className="text-xs text-destructive border-destructive">
                      Unavailable
                    </Badge>
                  )}
                </div>
                {mod.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setHistoryModule(mod)}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  History
                </Button>
                <Button
                  size="sm"
                  variant={mod.is_active ? 'destructive' : 'default'}
                  disabled={!mod.is_available || isPending}
                  onClick={() => handleToggle(mod)}
                  className="h-7 px-3 text-xs"
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
