import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, Activity, Plus } from 'lucide-react'
import { fetchPlatformDashboard } from '@/api/platform'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProvisioningTerminal } from '@/components/platform/ProvisioningTerminal'
import { CreateTenantDialog } from '@/components/platform/CreateTenantDialog'

export default function PlatformDashboardPage() {
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tenants
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data?.total_tenants ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Tenants
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data?.active_tenants ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent provisioning events */}
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Provisioning Activities
            </h2>
            <ProvisioningTerminal 
              logs={data?.recent_provisioning_events ?? []} 
              className="max-w-4xl"
            />
          </div>
        </>
      )}

      <CreateTenantDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
