import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, Upload, BookOpen } from 'lucide-react'
import BulkImportModal from '@/components/import/BulkImportModal'
import { fetchSuppliers, type Supplier } from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SupplierModal from './SupplierModal'
import SupplierProfileDrawer from './SupplierProfileDrawer'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

export default function SuppliersPage() {
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')
  const qc = useQueryClient()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
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
    queryFn: () => fetchSuppliers(queryParams).then((r) => r.data),
  })

  const suppliers = useMemo(() => data?.data ?? [], [data])
  const pagination = useMemo(() => data ? {
    page: data.current_page,
    per_page: data.per_page,
    total: data.total
  } : undefined, [data])

  const handleAdd = () => {
    setSelectedSupplier(null)
    setModalOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setModalOpen(true)
  }

  const handleViewProfile = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setDrawerOpen(true)
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
        <button
          type="button"
          onClick={() => handleViewProfile(row.original)}
          className="font-medium text-foreground hover:text-primary hover:underline text-left"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '—',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '—',
    },
    {
      accessorKey: 'current_balance',
      header: () => <div className="text-right">Balance Due</div>,
      cell: ({ row }) => {
        const bal = Number(row.original.current_balance ?? 0)
        return (
          <div className="text-right font-mono font-semibold">
            {bal > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-muted-foreground">$0.00</span>
            )}
          </div>
        )
      },
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
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleViewProfile(row.original)}
            title="View Ledger & Profile"
          >
            <BookOpen className="h-3 w-3" />
            Ledger
          </Button>
          {canEdit && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(row.original)}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage vendor profiles, ledger balances, and payment terms.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload size={16} />
              Bulk Upload Suppliers
            </Button>
            <Button className="gap-2" onClick={handleAdd}>
              <Plus size={16} />
              Add Supplier
            </Button>
          </div>
        )}
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
        filterKey="search"
        filterPlaceholder="Search by name, code or email…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(search)}
        onClearFilters={() => {
          setSearch('')
          setPage(1)
        }}
      />

      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        supplier={selectedSupplier ?? undefined}
      />

      <SupplierProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        supplier={selectedSupplier}
        onEdit={(s) => {
          setDrawerOpen(false)
          handleEdit(s)
        }}
      />

      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        type="suppliers"
        title="Import Suppliers"
        description="Upload CSV containing supplier master records, contact details, and payable accounts."
        getExtraOptions={() => ({ default_type: 'vendor' })}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['suppliers'] })}
      />
    </div>
  )
}
