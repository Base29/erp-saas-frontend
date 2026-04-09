import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, Activity } from 'lucide-react'
import { fetchPlatformDashboard } from '@/api/platform'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => fetchPlatformDashboard().then((r) => r.data.data),
    refetchInterval: 30_000,
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

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
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Recent Provisioning Events</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recent_provisioning_events?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent events</p>
              ) : (
                <div className="space-y-3">
                  {data?.recent_provisioning_events?.map((event) => (
                    <div key={event.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            event.status === 'completed'
                              ? 'success'
                              : event.status === 'failed'
                              ? 'destructive'
                              : event.status === 'running'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {event.status}
                        </Badge>
                        <span className="font-medium">{event.step}</span>
                        {event.message && (
                          <span className="text-muted-foreground truncate max-w-xs">
                            {event.message}
                          </span>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground shrink-0 ml-4">
                        {new Date(event.created_at).toLocaleString()}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
