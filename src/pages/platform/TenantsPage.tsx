import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, ExternalLink, Loader2 } from 'lucide-react'
import { fetchTenants, type Tenant } from '@/api/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateTenantDialog } from '@/components/platform/CreateTenantDialog'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'tenants', page, search],
    queryFn: () => fetchTenants({ page, search }).then((r) => r.data),
  })

  const columns: ColumnDef<Tenant>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'subdomain', header: 'Subdomain', cell: ({ row }) => <span className="text-muted-foreground">{row.original.subdomain}</span> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
          {row.original.status === 'pending' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
        </div>
      ),
    },
    { accessorKey: 'plan_name', header: 'Plan', cell: ({ row }) => <span className="text-muted-foreground">{row.original.plan_name ?? '—'}</span> },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/platform/tenants/${row.original.id}`)}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">Manage SaaS platform tenants</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={data ? { page: data.current_page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterPlaceholder="Search by name or subdomain…"
        filterKey="search"
        onFilterChange={(filters) => {
          setSearch(filters.search || '')
          setPage(1)
        }}
      />

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
