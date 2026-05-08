import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCostCenters, type CostCenter } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, Edit2 } from 'lucide-react'
import CostCenterModal from './CostCenterModal'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

export default function CostCentersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['cost-centers', { search, page }],
    queryFn: () => fetchCostCenters({ search, page }).then((r) => r.data),
  })

  const costCenters = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

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
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.original.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            <Edit2 size={14} />
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
        <Button className="gap-2" onClick={handleAdd}>
          <Plus size={16} />
          Add Cost Center
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={costCenters}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search cost centers..."
        onFilterChange={(filters) => {
          setSearch(filters.search || '')
          setPage(1)
        }}
      />

      <CostCenterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        costCenter={selectedCostCenter}
      />
    </div>
  )
}
