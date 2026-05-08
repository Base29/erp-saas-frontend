import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, AlertCircle } from 'lucide-react'
import { fetchSuppliers, type Supplier } from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import SupplierModal from './SupplierModal'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function SuppliersPage() {
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page }
    if (search.trim()) params.search = search.trim()
    return params
  }, [search, page])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['suppliers', queryParams],
    queryFn: () => fetchSuppliers(queryParams).then((r) => {
      console.log('Suppliers API Response:', r.data)
      return r.data
    }),
  })

  const suppliers = useMemo(() => data?.data ?? [], [data])
  const pagination = useMemo(() => data ? {
    page: data.current_page,
    per_page: data.per_page,
    total: data.total
  } : undefined, [data])

  useEffect(() => {
    if (suppliers.length > 0) {
      console.log('Suppliers Array:', suppliers)
    }
  }, [suppliers])

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
        <span className="font-mono font-bold text-primary">{row.original.supplier_code}</span>
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
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your vendors and their details.</p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={handleAdd}>
            <Plus size={16} />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code or email…"
            className="pl-9 h-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load suppliers: {(error as any)?.message || 'Unknown error'}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />

      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        supplier={selectedSupplier ?? undefined}
      />
    </div>
  )
}
