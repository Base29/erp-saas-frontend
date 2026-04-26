import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBankStatement,
  fetchUnmatchedJournalLines,
  matchBankStatementLine,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function BankReconciliationWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  const { data: statement, isLoading: loadingStatement } = useQuery({
    queryKey: ['bank-statement', id],
    queryFn: () => fetchBankStatement(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  const { data: unmatchedJournalLines = [], isLoading: loadingUnmatched } = useQuery({
    queryKey: ['unmatched-journal-lines', statement?.bank_account_id],
    queryFn: () => fetchUnmatchedJournalLines(statement!.bank_account_id).then((r) => r.data.data),
    enabled: !!statement?.bank_account_id,
  })

  const matchMutation = useMutation({
    mutationFn: ({ lineId, journalLineId }: { lineId: string; journalLineId: string }) =>
      matchBankStatementLine(lineId, journalLineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-statement', id] })
      qc.invalidateQueries({ queryKey: ['unmatched-journal-lines'] })
      setSelectedLineId(null)
    },
  })

  if (loadingStatement) return <div className="p-20 text-center">Loading statement...</div>
  if (!statement) return <div className="p-20 text-center">Statement not found.</div>

  const selectedLine = statement.lines?.find((l) => l.id === selectedLineId)

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/bank-reconciliation')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{statement.bank_account?.account_name}</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(statement.start_date), 'MMM d')} - {format(new Date(statement.end_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Closing Balance</p>
            <p className="font-mono font-bold text-lg">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(statement.closing_balance)}
            </p>
          </div>
          <Badge variant={statement.status === 'reconciled' ? 'default' : 'secondary'} className="capitalize">
            {statement.status}
          </Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Statement Lines */}
        <div className="w-1/2 border-r flex flex-col bg-muted/10">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              Statement Lines
              <Badge variant="outline" className="text-[10px]">{statement.lines?.length || 0}</Badge>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y">
              {statement.lines?.map((line) => (
                <div
                  key={line.id}
                  onClick={() => !line.matched_journal_line_id && setSelectedLineId(line.id)}
                  className={cn(
                    "p-4 transition-colors cursor-pointer relative",
                    selectedLineId === line.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50",
                    line.matched_journal_line_id ? "opacity-60 cursor-default bg-green-50/30" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {format(new Date(line.transaction_date), 'MMM d, yyyy')}
                    </span>
                    <span className={cn("font-mono font-bold", line.amount < 0 ? "text-red-600" : "text-green-600")}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(line.amount)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{line.description}</p>
                  
                  {line.matched_journal_line_id ? (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                      <CheckCircle2 size={12} />
                      Matched to JV #{line.matched_journal_line?.id?.substring(0,8)}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-yellow-600 font-bold uppercase tracking-wider">
                      <AlertCircle size={12} />
                      Unmatched
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Matching Area */}
        <div className="w-1/2 flex flex-col bg-background">
          {!selectedLineId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Search size={48} className="mb-4 opacity-10" />
              <p>Select an unmatched statement line on the left to find a matching transaction from your books.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-muted/20">
                <h2 className="font-semibold mb-1">Match Transaction</h2>
                <p className="text-xs text-muted-foreground">
                  Finding matches for: <span className="font-bold text-foreground">{selectedLine?.description}</span>
                  {" "}({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedLine?.amount || 0)})
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {loadingUnmatched ? (
                    <p className="text-center py-10 text-sm text-muted-foreground">Searching ledger...</p>
                  ) : unmatchedJournalLines.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground">No unmatched ledger entries found for this bank account.</p>
                      <Button variant="link" size="sm" className="mt-2">Create missing Journal Voucher</Button>
                    </div>
                  ) : (
                    unmatchedJournalLines.map((jl) => {
                      const jlAmount = jl.debit_amount > 0 ? jl.debit_amount : -jl.credit_amount
                      // Check if amounts match
                      const isAmountMatch = Math.abs(jlAmount - (selectedLine?.amount || 0)) < 0.01
                      
                      return (
                        <div
                          key={jl.id}
                          className={cn(
                            "p-4 border rounded-lg hover:border-primary transition-all cursor-pointer group",
                            isAmountMatch ? "border-green-200 bg-green-50/10" : "border-muted"
                          )}
                          onClick={() => matchMutation.mutate({ lineId: selectedLineId!, journalLineId: jl.id! })}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                               <p className="text-sm font-bold">{jl.account?.account_name}</p>
                               <p className="text-[10px] text-muted-foreground">JV Ref: {jl.id?.substring(0,8)}</p>
                            </div>
                            <span className={cn("font-mono font-bold text-sm", jlAmount < 0 ? "text-red-600" : "text-green-600")}>
                               {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(jlAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                              {jl.line_narration || "No narration"}
                            </p>
                            {isAmountMatch && (
                              <Badge className="bg-green-600 hover:bg-green-700 text-[10px] h-5">Suggested Match</Badge>
                            )}
                          </div>
                          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" className="w-full h-8 text-xs">Confirm Match</Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
