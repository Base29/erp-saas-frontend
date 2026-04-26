import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSuppliers, type Supplier } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, Search, Edit2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import SupplierModal from './SupplierModal'

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', { search }],
    queryFn: () => fetchSuppliers({ search }),
  })

  const handleAdd = () => {
    setSelectedSupplier(null)
    setModalOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setModalOpen(true)
  }

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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="h-10 px-4 text-left font-medium">Code</th>
              <th className="h-10 px-4 text-left font-medium">Name</th>
              <th className="h-10 px-4 text-left font-medium">Email</th>
              <th className="h-10 px-4 text-left font-medium">Phone</th>
              <th className="h-10 px-4 text-left font-medium">Status</th>
              <th className="h-10 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="h-24 text-center">Loading...</td></tr>
            ) : suppliers?.data?.data?.length ? (
              suppliers.data.data.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono">{s.supplier_code}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.email || '-'}</td>
                  <td className="px-4 py-3">{s.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}>
                      <Edit2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="h-24 text-center text-muted-foreground">No suppliers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        supplier={selectedSupplier}
      />
    </div>
  )
}
