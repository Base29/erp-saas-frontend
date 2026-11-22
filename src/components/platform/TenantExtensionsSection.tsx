import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Blocks,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react'
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

interface TenantExtensionsSectionProps {
  tenantId: string
  tenantName: string
  compact?: boolean
}

export function TenantExtensionsSection({ tenantId, tenantName, compact = false }: TenantExtensionsSectionProps) {
  const queryClient = useQueryClient()
  const [historyModule, setHistoryModule] = useState<TenantModule | null>(null)
  const [cascadeConfirmModule, setCascadeConfirmModule] = useState<{ module: TenantModule; message: string } | null>(null)

  const { data: allModules, isLoading } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: () => fetchTenantModules(tenantId).then((r) => r.data.data),
    enabled: !!tenantId,
  })

  // Filter only extensions
  const extensions = allModules?.filter((m) => m.type === 'extension') ?? []

  const activate = useMutation({
    mutationFn: (moduleKey: string) => activateTenantModule(tenantId, moduleKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] })
      toast.success('Extension activated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to activate extension')
    },
  })

  const deactivate = useMutation({
    mutationFn: ({ moduleKey, cascade }: { moduleKey: string; cascade?: boolean }) =>
      deactivateTenantModule(tenantId, moduleKey, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] })
      setCascadeConfirmModule(null)
      toast.success('Extension deactivated successfully')
    },
    onError: (err: any, variables) => {
      if (err?.response?.data?.code === 'DEPENDENT_EXTENSIONS_ACTIVE') {
        const mod = extensions.find((m) => m.module_key === variables.moduleKey)
        if (mod) {
          setCascadeConfirmModule({
            module: mod,
            message: err.response.data.message || 'Active dependent extensions exist.',
          })
          return
        }
      }
      toast.error(err?.response?.data?.message || 'Failed to deactivate extension')
    },
  })

  const handleToggle = (mod: TenantModule) => {
    if (mod.is_active) {
      deactivate.mutate({ moduleKey: mod.module_key, cascade: false })
    } else {
      activate.mutate(mod.module_key)
    }
  }

  const isPending = activate.isPending || deactivate.isPending

  if (isLoading) {
    return (
      <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-3.5 w-72 rounded mt-1" />
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 space-y-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Compact summary mode for Overview Tab
  if (compact) {
    const activeCount = extensions.filter((e) => e.is_active).length

    return (
      <Card className="w-full bg-card/85 backdrop-blur-xl border-border/70 shadow-elevated">
        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Blocks className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Industry Extensions
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Specialized plug-ins extending core business logic ({activeCount} of {extensions.length} active)
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" asChild>
            <Link to={`/platform/tenants/${tenantId}/modules?tab=extensions`}>
              Manage Extensions
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {extensions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No specialized extensions installed in this environment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {extensions.map((ext) => (
                <div
                  key={ext.module_key}
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between gap-3 hover:border-purple-500/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{ext.display_name}</span>
                        <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 text-[10px] px-1.5 py-0">
                          Extension
                        </Badge>
                      </div>
                      <Badge variant={ext.is_active ? 'success' : 'secondary'} className="text-[10px]">
                        {ext.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {ext.parent_display_name && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground/70" />
                        Extends: <span className="font-medium text-foreground">{ext.parent_display_name}</span>
                      </p>
                    )}
                    {ext.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                        {ext.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                    <span className="font-mono text-muted-foreground text-[10px]">v{ext.version}</span>
                    <Button
                      size="sm"
                      variant={ext.is_active ? 'outline' : 'default'}
                      disabled={!ext.is_available || isPending || (!ext.is_active && ext.can_activate === false)}
                      onClick={() => handleToggle(ext)}
                      className={cn(
                        'h-7 px-2.5 text-[11px] font-medium',
                        ext.is_active && 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                      )}
                    >
                      {ext.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full Tab Mode
  return (
    <div className="space-y-6">
      <Card className="bg-card/85 backdrop-blur-xl border-border/70 shadow-elevated">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Blocks className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Industry & Specialized Extensions
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Manage industry-specific extensions for {tenantName}. Extensions depend on their parent modules and provide dedicated domain logic.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
              <Link to={`/platform/tenants/${tenantId}/modules`}>
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                View All Modules
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {extensions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Blocks className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium">No specialized extensions registered</p>
              <p className="text-xs mt-1">Industry extensions registered in the system will appear here for tenant activation.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60">
              {extensions.map((ext) => (
                <div
                  key={ext.module_key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-5 gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-base text-foreground">{ext.display_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                        v{ext.version}
                      </span>
                      {ext.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                        Extension
                      </Badge>
                      {ext.parent_display_name && (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
                          Extends: {ext.parent_display_name}
                        </Badge>
                      )}
                      {!ext.is_active && ext.requires_parent && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/40 bg-amber-500/10">
                          {ext.requires_parent}
                        </Badge>
                      )}
                      {!ext.is_available && (
                        <Badge variant="outline" className="text-destructive border-destructive">
                          Unavailable
                        </Badge>
                      )}
                    </div>

                    {ext.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
                        {ext.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground/80">Key: {ext.module_key}</span>
                      {ext.activated_at && (
                        <span>Activated: {new Date(ext.activated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setHistoryModule(ext)}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      History
                    </Button>
                    <Button
                      size="sm"
                      variant={ext.is_active ? 'outline' : 'default'}
                      disabled={!ext.is_available || isPending || (!ext.is_active && ext.can_activate === false)}
                      onClick={() => handleToggle(ext)}
                      title={!ext.is_active && ext.requires_parent ? ext.requires_parent : undefined}
                      className={cn(
                        'h-8 px-3 text-xs font-medium',
                        ext.is_active && 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                      )}
                    >
                      {ext.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Cascade Deactivation Confirmation Dialog */}
      <Dialog open={!!cascadeConfirmModule} onOpenChange={(open) => !open && setCascadeConfirmModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Dependent Extensions Active
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground space-y-3">
            <p>
              {cascadeConfirmModule?.message}
            </p>
            <p className="text-foreground font-medium">
              Would you like to deactivate <span className="font-semibold text-primary">{cascadeConfirmModule?.module.display_name}</span>?
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setCascadeConfirmModule(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (cascadeConfirmModule) {
                  deactivate.mutate({ moduleKey: cascadeConfirmModule.module.module_key, cascade: true })
                }
              }}
            >
              Confirm Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
