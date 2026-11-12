import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Activity,
  Plus,
  Zap,
  Terminal,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'
import { fetchPlatformDashboard } from '@/api/platform'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProvisioningTerminal } from '@/components/platform/ProvisioningTerminal'
import { CreateTenantDialog } from '@/components/platform/CreateTenantDialog'

export default function PlatformDashboardPage() {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => fetchPlatformDashboard().then((r) => r.data.data),
    refetchInterval: (query) => {
      // Refetch every 5s if any log is 'running', otherwise every 30s
      const dashboard = query.state.data as any
      return dashboard?.recent_provisioning_events?.some((l: any) => l.status === 'running') ? 5000 : 30000
    },
  })

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform overview and tenant infrastructure
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card
          className="bg-card/85 backdrop-blur-xl border-border/70 hover:border-primary/40 transition-colors cursor-pointer"
          onClick={() => navigate('/platform/tenants')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              {isLoading ? (
                <div className="h-9 w-16 bg-muted/60 animate-pulse rounded-md" />
              ) : (
                <p className="text-3xl font-bold">{data?.total_tenants ?? 0}</p>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                View all <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-card/85 backdrop-blur-xl border-border/70 hover:border-emerald-500/40 transition-colors cursor-pointer"
          onClick={() => navigate('/platform/tenants?status=active')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tenants
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              {isLoading ? (
                <div className="h-9 w-16 bg-muted/60 animate-pulse rounded-md" />
              ) : (
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data?.active_tenants ?? 0}
                </p>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                Filter active <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </h2>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Direct platform operations
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="p-4 flex flex-col gap-2.5 items-start rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl hover:border-primary/50 hover:bg-accent/40 text-left transition-all duration-200 group shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                Create Tenant
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Provision a new isolated organization
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/platform/tenants')}
            className="p-4 flex flex-col gap-2.5 items-start rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl hover:border-blue-500/50 hover:bg-accent/40 text-left transition-all duration-200 group shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-2xs">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                Manage Tenants
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                View all organizations & status
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/platform/tenants?status=active')}
            className="p-4 flex flex-col gap-2.5 items-start rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl hover:border-emerald-500/50 hover:bg-accent/40 text-left transition-all duration-200 group shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-2xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                Active Tenants
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Inspect healthy running instances
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('provisioning-terminal')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="p-4 flex flex-col gap-2.5 items-start rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl hover:border-amber-500/50 hover:bg-accent/40 text-left transition-all duration-200 group shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-2xs">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                System Console
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Monitor live provisioning events
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent provisioning events */}
      <div id="provisioning-terminal" className="mt-8">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Provisioning Activities
        </h2>
        {isLoading ? (
          <div className="rounded-2xl border border-border/70 p-8 text-center text-muted-foreground bg-card/50">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm">Connecting to provisioning console…</p>
          </div>
        ) : (
          <ProvisioningTerminal 
            logs={data?.recent_provisioning_events ?? []} 
            className="w-full"
          />
        )}
      </div>

      <CreateTenantDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
