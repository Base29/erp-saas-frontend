import { useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
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
import { ChevronLeft, Clock, Puzzle, Blocks } from 'lucide-react'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [historyModule, setHistoryModule] = useState<TenantModule | null>(null)
  const [cascadeConfirmModule, setCascadeConfirmModule] = useState<{ module: TenantModule; message: string } | null>(null)

  const activeTab = (searchParams.get('tab') as 'all' | 'modules' | 'extensions') || 'all'

  const handleTabChange = (tab: 'all' | 'modules' | 'extensions') => {
    if (tab === 'all') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', tab)
    }
    setSearchParams(searchParams, { replace: true })
  }

  const { data: modules, isLoading } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: () => fetchTenantModules(tenantId!).then((r) => r.data.data),
    enabled: !!tenantId,
  })

  const applicationModules = modules?.filter((m) => m.type !== 'extension') ?? []
  const extensionModules = modules?.filter((m) => m.type === 'extension') ?? []

  const activate = useMutation({
    mutationFn: (moduleKey: string) => activateTenantModule(tenantId!, moduleKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] })
      toast.success('Activated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to activate')
    },
  })

  const deactivate = useMutation({
    mutationFn: ({ moduleKey, cascade }: { moduleKey: string; cascade?: boolean }) =>
      deactivateTenantModule(tenantId!, moduleKey, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] })
      setCascadeConfirmModule(null)
      toast.success('Deactivated successfully')
    },
    onError: (err: any, variables) => {
      if (err?.response?.data?.code === 'DEPENDENT_EXTENSIONS_ACTIVE') {
        const mod = modules?.find((m) => m.module_key === variables.moduleKey)
        if (mod) {
          setCascadeConfirmModule({
            module: mod,
            message: err.response.data.message || 'Active dependent extensions exist.',
          })
          return
        }
      }
      toast.error(err?.response?.data?.message || 'Failed to deactivate')
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

  return (
    <div className="p-8 w-full space-y-6">
      <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to={`/platform/tenants/${tenantId}`}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Tenant
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modules & Extensions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage foundational business modules and specialized vertical extensions for this tenant.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              activeTab === 'all'
                ? 'bg-background shadow-xs text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All ({modules?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('modules')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5',
              activeTab === 'modules'
                ? 'bg-background shadow-xs text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Puzzle className="h-3.5 w-3.5 text-blue-500" />
            Modules ({applicationModules.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('extensions')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5',
              activeTab === 'extensions'
                ? 'bg-background shadow-xs text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Blocks className="h-3.5 w-3.5 text-purple-500" />
            Extensions ({extensionModules.length})
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading modules and extensions…</p>}

      {/* SECTION 1: APPLICATION MODULES */}
      {(activeTab === 'all' || activeTab === 'modules') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Puzzle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Application Modules</h2>
                <p className="text-xs text-muted-foreground">Core ERP modules and general business applications</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {applicationModules.filter((m) => m.is_active).length} of {applicationModules.length} Active
            </span>
          </div>

          <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/85 backdrop-blur-xl shadow-elevated divide-y divide-border/60">
            {applicationModules.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No application modules found.</div>
            ) : (
              applicationModules.map((mod) => (
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
                      {mod.is_core ? (
                        <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-semibold">
                          Core Module
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-500/10 font-medium">
                          Module
                        </Badge>
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
                      disabled={!mod.is_available || isPending || (!mod.is_active && mod.can_activate === false)}
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
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: INDUSTRY EXTENSIONS */}
      {(activeTab === 'all' || activeTab === 'extensions') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Blocks className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Industry Extensions</h2>
                <p className="text-xs text-muted-foreground">Specialized vertical modules extending core business logic</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {extensionModules.filter((m) => m.is_active).length} of {extensionModules.length} Active
            </span>
          </div>

          <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/85 backdrop-blur-xl shadow-elevated divide-y divide-border/60">
            {extensionModules.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No industry extensions found.</div>
            ) : (
              extensionModules.map((mod) => (
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
                      <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-semibold">
                        Extension
                      </Badge>
                      {mod.parent_display_name && (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
                          Extends: {mod.parent_display_name}
                        </Badge>
                      )}
                      {!mod.is_active && mod.requires_parent && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/40 bg-amber-500/10">
                          {mod.requires_parent}
                        </Badge>
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
                    {mod.parent_display_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Industry extension for <span className="font-medium text-foreground">{mod.parent_display_name}</span>.
                      </p>
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
                      disabled={!mod.is_available || isPending || (!mod.is_active && mod.can_activate === false)}
                      onClick={() => handleToggle(mod)}
                      title={!mod.is_active && mod.requires_parent ? mod.requires_parent : undefined}
                      className={cn(
                        'h-8 px-3 text-xs font-medium',
                        mod.is_active && 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                      )}
                    >
                      {mod.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
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
              Would you like to deactivate <span className="font-semibold text-primary">{cascadeConfirmModule?.module.display_name}</span> along with all its active dependent industry extensions?
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
              Cascade Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
