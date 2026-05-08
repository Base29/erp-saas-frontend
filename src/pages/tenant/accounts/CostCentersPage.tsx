import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, AlertCircle } from 'lucide-react'
import { fetchCostCenters, type CostCenter } from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import CostCenterModal from './CostCenterModal'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function CostCentersPage() {
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page }
    if (search.trim()) params.search = search.trim()
    return params
  }, [search, page])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cost-centers', queryParams],
    queryFn: () => fetchCostCenters(queryParams).then((r) => {
      console.log('Cost Centers API Response:', r.data)
      return r.data
    }),
  })

  const costCenters = useMemo(() => data?.data ?? [], [data])
  const pagination = useMemo(() => data ? {
    page: data.current_page,
    per_page: data.per_page,
    total: data.total
  } : undefined, [data])

  useEffect(() => {
    if (costCenters.length > 0) {
      console.log('Cost Centers Array:', costCenters)
    }
  }, [costCenters])

  const handleAdd = () => {
    setSelectedCostCenter(null)
    setModalOpen(true)
  }

  const handleEdit = (cc: CostCenter) => {
    setSelectedCostCenter(cc)
    setModalOpen(true)
  }

  const columns: ColumnDef<CostCenter>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono font-bold text-primary">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => canEdit && (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            Edit
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Centers</h1>
          <p className="text-muted-foreground">Define departments, projects, or branches for granular financial tracking.</p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={handleAdd}>
            <Plus size={16} />
            Add Cost Center
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code…"
            className="pl-9 h-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load cost centers: {(error as any)?.message || 'Unknown error'}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={costCenters}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />

      <CostCenterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        costCenter={selectedCostCenter ?? undefined}
      />
    </div>
  )
}
