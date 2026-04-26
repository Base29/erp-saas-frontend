import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBudgets, fetchFiscalPeriods, type Budget } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, PieChart, TrendingUp, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BudgetModal from './BudgetModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function BudgetsPage() {
  const navigate = useNavigate()
  const [fiscalPeriodId, setFiscalPeriodId] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  
  const { data: periods = [] } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data),
  })

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', { fiscalPeriodId }],
    queryFn: () => fetchBudgets({ fiscal_period_id: fiscalPeriodId }),
    enabled: !!fiscalPeriodId,
  })

  const handleAdd = () => {
    setSelectedBudget(null)
    setModalOpen(true)
  }

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget)
    setModalOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgeting</h1>
          <p className="text-muted-foreground">Set and monitor financial targets for your accounts.</p>
        </div>
        <Button className="gap-2" onClick={handleAdd}>
          <Plus size={16} />
          Set Budget
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg">
        <div className="w-64">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Fiscal Period</label>
          <Select value={fiscalPeriodId} onValueChange={setFiscalPeriodId}>
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!fiscalPeriodId ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-xl bg-card">
          <TrendingUp size={48} className="text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">Select a fiscal period to view budgets</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="h-10 px-4 text-left font-medium">Account</th>
                <th className="h-10 px-4 text-left font-medium">Cost Center</th>
                <th className="h-10 px-4 text-right font-medium">Budgeted Amount</th>
                <th className="h-10 px-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="h-24 text-center">Loading budgets...</td></tr>
              ) : budgets?.data?.data?.length ? (
                budgets.data.data.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{b.account?.account_name}</td>
                    <td className="px-4 py-3">{b.cost_center?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(b.amount)}
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-2"
                        onClick={() => navigate(`/accounts/budgets/${b.id}/report`)}
                      >
                        <PieChart size={14} />
                        Performance
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">No budgets set for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        budget={selectedBudget}
        defaultPeriodId={fiscalPeriodId}
      />
    </div>
  )
}
