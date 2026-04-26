import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCostCenters, type CostCenter } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, Search, Edit2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import CostCenterModal from './CostCenterModal'

export default function CostCentersPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null)

  const { data: costCenters, isLoading } = useQuery({
    queryKey: ['cost-centers', { search }],
    queryFn: () => fetchCostCenters({ search }),
  })

  const handleAdd = () => {
    setSelectedCostCenter(null)
    setModalOpen(true)
  }

  const handleEdit = (cc: CostCenter) => {
    setSelectedCostCenter(cc)
    setModalOpen(true)
  }

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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cost centers..."
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
              <th className="h-10 px-4 text-left font-medium">Status</th>
              <th className="h-10 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="h-24 text-center">Loading...</td></tr>
            ) : costCenters?.data?.data?.length ? (
              costCenters.data.data.map((cc) => (
                <tr key={cc.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{cc.code}</td>
                  <td className="px-4 py-3">{cc.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cc.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {cc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cc)}>
                      <Edit2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">No cost centers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <CostCenterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        costCenter={selectedCostCenter}
      />
    </div>
  )
}
