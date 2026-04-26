import { useQuery } from '@tanstack/react-query'
import { fetchBankStatements } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCcw, Landmark } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function BankReconciliationPage() {
  const navigate = useNavigate()
  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements'],
    queryFn: () => fetchBankStatements(),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Match your bank statements with internal accounting records.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/accounts/bank-reconciliation/new')}>
          <Plus size={16} />
          Import Statement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">Loading statements...</div>
        ) : statements?.data?.data?.length ? (
          statements.data.data.map((stmt) => (
            <div key={stmt.id} className="border rounded-xl p-5 bg-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Landmark size={20} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${stmt.status === 'reconciled' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {stmt.status}
                </span>
              </div>
              <h3 className="font-semibold text-lg">{stmt.bank_account?.account_name || 'Bank Account'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {format(new Date(stmt.start_date), 'MMM d')} - {format(new Date(stmt.end_date), 'MMM d, yyyy')}
              </p>
              <div className="flex justify-between text-sm pt-4 border-t">
                <span className="text-muted-foreground">Closing Balance</span>
                <span className="font-mono font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stmt.closing_balance)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-muted/30">
            <RefreshCcw size={48} className="text-muted-foreground mb-4 opacity-20" />
            <p className="text-lg font-medium text-muted-foreground">No reconciliation statements found</p>
            <Button variant="outline" className="mt-4">Start your first reconciliation</Button>
          </div>
        )}
      </div>
    </div>
  )
}
