import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBankStatements, fetchAccounts } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCcw, Landmark, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import BulkImportModal from '@/components/import/BulkImportModal'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function BankReconciliationPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [importOpen, setImportOpen] = useState(false)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('')

  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements'],
    queryFn: () => fetchBankStatements(),
  })

  // Load bank accounts for CSV upload
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', { is_active: 1 }],
    queryFn: () => fetchAccounts({ is_active: 1, per_page: 200 }).then((r) => r.data),
  })

  const bankAccounts = (accountsData?.data ?? []).filter((a) => {
    const cat = (a.account_category?.name ?? '').toLowerCase()
    return cat.includes('bank') || cat.includes('cash') || a.account_code.startsWith('111')
  })

  // Pre-select first bank account once loaded
  useEffect(() => {
    if (!selectedBankAccountId && bankAccounts.length > 0) {
      setSelectedBankAccountId(bankAccounts[0].id)
    }
  }, [bankAccounts, selectedBankAccountId])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Match your bank statements with internal accounting records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload size={16} />
            Upload Statement CSV
          </Button>
          <Button className="gap-2" onClick={() => navigate('/accounts/bank-reconciliation/new')}>
            <Plus size={16} />
            New Statement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">Loading statements...</div>
        ) : statements?.data?.data?.length ? (
          statements.data.data.map((stmt) => (
            <div
              key={stmt.id}
              onClick={() => navigate(`/accounts/bank-reconciliation/${stmt.id}`)}
              className="border rounded-xl p-5 bg-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
            >
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
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setImportOpen(true)}>Upload Statement CSV</Button>
              <Button onClick={() => navigate('/accounts/bank-reconciliation/new')}>Create Statement Manually</Button>
            </div>
          </div>
        )}
      </div>

      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        type="bank_statements"
        title="Import Bank Statement CSV"
        description="Select the destination bank account and upload your bank statement CSV file."
        extraFields={
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Bank Account *</Label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select bank account…" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_code} - {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        extraOptions={{ bank_account_id: selectedBankAccountId }}
        getExtraOptions={() => ({ bank_account_id: selectedBankAccountId })}
        onSuccess={(res) => {
          qc.invalidateQueries({ queryKey: ['bank-statements'] })
          if (res?.bank_statement_id) {
            navigate(`/accounts/bank-reconciliation/${res.bank_statement_id}`)
          }
        }}
      />
    </div>
  )
}
