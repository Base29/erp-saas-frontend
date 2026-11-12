import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Puzzle, MoreHorizontal, Ban, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchTenants, suspendTenant, reactivateTenant, type Tenant } from '@/api/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(() => searchParams.get('status') || '')

  useEffect(() => {
    const urlStatus = searchParams.get('status') || ''
    if (urlStatus !== status) {
      setStatus(urlStatus)
      setPage(1)
    }
  }, [searchParams])

  const queryParams: Record<string, string | number> = { page }
  if (search.trim()) queryParams.search = search.trim()
  if (status && status !== '__all__') queryParams.status = status

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'tenants', queryParams],
    queryFn: () => fetchTenants(queryParams).then((r) => r.data),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      toast.success('Tenant suspended successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to suspend tenant')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      toast.success('Tenant reactivated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reactivate tenant')
    },
  })

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setPage(1)
    setSearchParams({})
  }

  const columns: ColumnDef<Tenant>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'subdomain', header: 'Subdomain', cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{row.original.subdomain}</span> },
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
      header: 'Actions',
      cell: ({ row }) => {
        const tenant = row.original
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="View Details"
              onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View Details</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Manage Modules"
              onClick={() => navigate(`/platform/tenants/${tenant.id}/modules`)}
            >
              <Puzzle className="h-4 w-4" />
              <span className="sr-only">Manage Modules</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="More Options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/platform/tenants/${tenant.id}`)}>
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/platform/tenants/${tenant.id}/modules`)}>
                  <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
                  Manage Modules
                </DropdownMenuItem>
                {tenant.status === 'active' && (
                  <DropdownMenuItem
                    className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/30"
                    onClick={() => suspendMutation.mutate(tenant.id)}
                    disabled={suspendMutation.isPending}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Suspend Tenant
                  </DropdownMenuItem>
                )}
                {tenant.status === 'suspended' && (
                  <DropdownMenuItem
                    className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                    onClick={() => reactivateMutation.mutate(tenant.id)}
                    disabled={reactivateMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Reactivate Tenant
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-8 w-full">
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
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(search || status)}
        onClearFilters={clearFilters}
        toolbarExtra={
          <Select
            value={status || '__all__'}
            onValueChange={(val) => {
              const newStatus = val === '__all__' ? '' : val
              setStatus(newStatus)
              setPage(1)
              if (newStatus) {
                setSearchParams({ status: newStatus })
              } else {
                setSearchParams({})
              }
            }}
          >
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="provisioning_failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
