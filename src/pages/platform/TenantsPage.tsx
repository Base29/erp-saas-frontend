import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, ExternalLink, Loader2 } from 'lucide-react'
import { fetchTenants, type Tenant } from '@/api/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateTenantDialog } from '@/components/platform/CreateTenantDialog'

function statusVariant(status: Tenant['status']) {
  switch (status) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'provisioning_failed': return 'destructive'
    default: return 'secondary'
  }
}

export default function TenantsPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => fetchTenants().then((r) => r.data.data),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Subdomain</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.map((tenant) => (
                <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tenant.subdomain}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
                      {tenant.status === 'pending' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tenant.plan_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No tenants yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
