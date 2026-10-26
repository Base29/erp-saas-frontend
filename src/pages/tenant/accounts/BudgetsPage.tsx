import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBudgets, fetchFiscalPeriods, type Budget } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, PieChart, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BudgetModal from './BudgetModal'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  
  const { data: periods = [] } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data),
  })

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page }
    if (fiscalPeriodId && fiscalPeriodId !== '__all__') params.fiscal_period_id = fiscalPeriodId
    if (search.trim()) params.search = search.trim()
    return params
  }, [fiscalPeriodId, search, page])

  const { data, isLoading } = useQuery({
    queryKey: ['budgets', queryParams],
    queryFn: () => fetchBudgets(queryParams).then((r) => r.data),
  })

  const budgets = data?.data ?? []
  const pagination = data
    ? { page: data.current_page, per_page: data.per_page, total: data.total }
    : undefined

  const handleAdd = () => {
    setSelectedBudget(null)
    setModalOpen(true)
  }

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget)
    setModalOpen(true)
  }

  const clearFilters = () => {
    setFiscalPeriodId('')
    setSearch('')
    setPage(1)
  }

  const columns = useMemo<ColumnDef<Budget>[]>(() => [
    {
      id: 'account',
      header: 'Account',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-foreground">{row.original.account?.account_name}</span>
          {row.original.account?.account_code && (
            <span className="text-xs text-muted-foreground ml-2 font-mono">({row.original.account.account_code})</span>
          )}
        </div>
      ),
    },
    {
      id: 'cost_center',
      header: 'Cost Center',
      cell: ({ row }) => <span>{row.original.cost_center?.name || '—'}</span>,
    },
    {
      id: 'period',
      header: 'Fiscal Period',
      cell: ({ row }) => <span>{row.original.fiscal_period?.name || '—'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Budgeted Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-foreground">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.amount)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            <Edit2 size={14} />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5 text-xs"
            onClick={() => navigate(`/accounts/budgets/${row.original.id}/report`)}
          >
            <PieChart size={14} />
            Performance
          </Button>
        </div>
      ),
    },
  ], [navigate])

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

      <DataTable
        columns={columns}
        data={budgets}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search by account or cost center…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(search || (fiscalPeriodId && fiscalPeriodId !== '__all__'))}
        onClearFilters={clearFilters}
        toolbarExtra={
          <div className="w-56">
            <Select
              value={fiscalPeriodId || '__all__'}
              onValueChange={(val) => {
                setFiscalPeriodId(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Fiscal Periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Fiscal Periods</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <BudgetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        budget={selectedBudget}
        defaultPeriodId={fiscalPeriodId}
      />
    </div>
  )
}
