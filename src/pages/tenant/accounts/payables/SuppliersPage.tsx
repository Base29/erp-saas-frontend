import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSuppliers, type Supplier } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, Edit2 } from 'lucide-react'
import SupplierModal from './SupplierModal'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, page }],
    queryFn: () => fetchSuppliers({ search, page }).then((r) => r.data),
  })

  const suppliers = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const handleAdd = () => {
    setSelectedSupplier(null)
    setModalOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setModalOpen(true)
  }

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'supplier_code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.supplier_code}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '-',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.original.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your vendors and their details.</p>
        </div>
        <Button className="gap-2" onClick={handleAdd}>
          <Plus size={16} />
          Add Supplier
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search suppliers..."
        onFilterChange={(filters) => {
          setSearch(filters.search || '')
          setPage(1)
        }}
      />

      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        supplier={selectedSupplier}
      />
    </div>
  )
}
