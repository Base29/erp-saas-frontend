import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBankStatement,
  fetchUnmatchedJournalLines,
  matchBankStatementLine,
  fetchAccounts,
  fetchCostCenters,
  createJournalVoucherForStatementLine,
  invertBankStatementSigns,
  VOUCHER_TYPE_LABELS,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, AlertCircle, Search, Plus, ExternalLink, Loader2, ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function BankReconciliationWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  // Modal form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [offsetAccountId, setOffsetAccountId] = useState('')
  const [costCenterId, setCostCenterId] = useState('none')
  const [voucherType, setVoucherType] = useState('bank_receipt')
  const [narration, setNarration] = useState('')

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

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', 'active-all'],
    queryFn: () => fetchAccounts({ is_active: 1, per_page: -1 }).then((r) => r.data.data),
  })

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers', 'active-all'],
    queryFn: () => fetchCostCenters({ is_active: 1, per_page: -1 }).then((r) => r.data.data),
  })

  const matchMutation = useMutation({
    mutationFn: ({ lineId, journalLineId }: { lineId: string; journalLineId: string }) =>
      matchBankStatementLine(lineId, journalLineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-statement', id] })
      qc.invalidateQueries({ queryKey: ['unmatched-journal-lines'] })
      setSelectedLineId(null)
      toast.success('Statement line matched successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to match statement line')
    },
  })

  const selectedLine = statement?.lines?.find((l) => l.id === selectedLineId)

  // Re-initialize modal form values when selected line changes
  useEffect(() => {
    if (selectedLine) {
      setOffsetAccountId('')
      setCostCenterId('none')
      setVoucherType(selectedLine.amount > 0 ? 'bank_receipt' : 'bank_payment')
      setNarration(selectedLine.description || '')
    }
  }, [selectedLineId])

  const createJvMutation = useMutation({
    mutationFn: () =>
      createJournalVoucherForStatementLine(selectedLine!.id, {
        offset_account_id: offsetAccountId,
        cost_center_id: costCenterId === 'none' ? undefined : costCenterId,
        voucher_type: voucherType,
        narration: narration || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-statement', id] })
      qc.invalidateQueries({ queryKey: ['unmatched-journal-lines'] })
      setIsCreateModalOpen(false)
      setSelectedLineId(null)
      toast.success('Journal Voucher created and matched successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create Journal Voucher')
    },
  })

  const invertMutation = useMutation({
    mutationFn: () => invertBankStatementSigns(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-statement', id] })
      toast.success('Statement entries inverted (DR ↔ CR)')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to invert statement entries')
    },
  })

  if (loadingStatement) return <div className="p-20 text-center">Loading statement...</div>
  if (!statement) return <div className="p-20 text-center">Statement not found.</div>

  const offsetAccounts = accounts.filter(
    (a) => String(a.id) !== String(statement.bank_account_id)
  )
  const selectedOffsetAccount = offsetAccounts.find((a) => String(a.id) === offsetAccountId)

  const handleOpenFullForm = () => {
    if (!selectedLine || !statement) return
    const params = new URLSearchParams({
      bank_line_id: selectedLine.id,
      bank_account_id: statement.bank_account_id,
      amount: String(selectedLine.amount),
      date: selectedLine.transaction_date.substring(0, 10),
      narration: selectedLine.description || '',
      return_to: location.pathname,
    })
    navigate(`/accounts/journal-vouchers/new?${params.toString()}`)
  }

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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => invertMutation.mutate()}
            disabled={invertMutation.isPending}
            className="gap-1.5 text-xs font-medium"
            title="Invert statement entries (DR ↔ CR)"
          >
            <ArrowUpDown className={cn("h-3.5 w-3.5", invertMutation.isPending && "animate-spin")} />
            Invert DR/CR
          </Button>
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
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-mono font-bold px-1.5 py-0 h-4 border",
                          line.amount >= 0
                            ? "border-green-600/40 text-green-700 bg-green-50/60 dark:bg-green-950/30"
                            : "border-red-600/40 text-red-700 bg-red-50/60 dark:bg-red-950/30"
                        )}
                      >
                        {line.amount >= 0 ? 'DR' : 'CR'}
                      </Badge>
                      <span className={cn("font-mono font-bold", line.amount < 0 ? "text-red-600" : "text-green-600")}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(line.amount))}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{line.description}</p>
                  
                  {line.matched_journal_line_id ? (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                      <CheckCircle2 size={12} />
                      Matched to JV {line.matched_journal_line?.journal_voucher?.voucher_number ?? `#${line.matched_journal_line?.id?.substring(0,8)}`}
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
              <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold mb-1">Match Transaction</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    Finding matches for: <span className="font-bold text-foreground">{selectedLine?.description}</span>
                    {" "}({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedLine?.amount || 0)})
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="shrink-0 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Journal Voucher
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {loadingUnmatched ? (
                    <p className="text-center py-10 text-sm text-muted-foreground">Searching ledger...</p>
                  ) : unmatchedJournalLines.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg p-6">
                      <p className="text-sm text-muted-foreground">No unmatched ledger entries found for this bank account.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1.5"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create missing Journal Voucher
                      </Button>
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
                               <p className="text-[10px] text-muted-foreground">
                                 JV Ref: {jl.journal_voucher?.voucher_number ?? jl.id?.substring(0,8)}
                               </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-mono font-bold px-1.5 py-0 h-4 border",
                                  jlAmount >= 0
                                    ? "border-green-600/40 text-green-700 bg-green-50/60 dark:bg-green-950/30"
                                    : "border-red-600/40 text-red-700 bg-red-50/60 dark:bg-red-950/30"
                                )}
                              >
                                {jlAmount >= 0 ? 'DR' : 'CR'}
                              </Badge>
                              <span className={cn("font-mono font-bold text-sm", jlAmount < 0 ? "text-red-600" : "text-green-600")}>
                                 {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(jlAmount))}
                              </span>
                            </div>
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

      {/* Create Journal Voucher Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Journal Voucher</DialogTitle>
            <DialogDescription>
              Create a balanced Journal Voucher directly from this bank statement transaction and match it automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedLine && (
            <div className="space-y-4 py-2">
              {/* Statement Transaction Summary Card */}
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Transaction Date</span>
                  <span className="font-mono text-xs">
                    {format(new Date(selectedLine.transaction_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Bank Account</span>
                  <span className="font-medium text-xs">
                    {statement.bank_account?.account_code} — {statement.bank_account?.account_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Description</span>
                  <span className="text-xs font-medium truncate max-w-[260px]">{selectedLine.description}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t">
                  <span className="text-xs font-semibold">Transaction Amount</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-mono font-bold px-1.5 py-0 h-4 border",
                        selectedLine.amount >= 0
                          ? "border-green-600/40 text-green-700 bg-green-50/60 dark:bg-green-950/30"
                          : "border-red-600/40 text-red-700 bg-red-50/60 dark:bg-red-950/30"
                      )}
                    >
                      {selectedLine.amount >= 0 ? 'DR' : 'CR'}
                    </Badge>
                    <span className={cn('font-mono font-bold', selectedLine.amount < 0 ? 'text-red-600' : 'text-green-600')}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(selectedLine.amount))}
                    </span>
                    <span className="text-[10px] font-normal ml-1 text-muted-foreground">
                      ({selectedLine.amount >= 0 ? 'Debit / Deposit — Asset Inflow' : 'Credit / Disbursement — Asset Outflow'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Offset Account <span className="text-destructive">*</span>
                  </Label>
                  <Select value={offsetAccountId} onValueChange={setOffsetAccountId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select offset account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 min-w-[20rem]">
                      {offsetAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.account_code} — {acc.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Voucher Type</Label>
                    <Select value={voucherType} onValueChange={setVoucherType}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(VOUCHER_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Cost Center (Optional)</Label>
                    <Select value={costCenterId} onValueChange={setCostCenterId}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">None</SelectItem>
                        {costCenters.map((cc) => (
                          <SelectItem key={cc.id} value={String(cc.id)}>
                            {cc.code} — {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Narration / Notes</Label>
                  <Input
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Voucher narration..."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Double-Entry Preview */}
              <div className="rounded border overflow-hidden">
                <div className="bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Double-Entry Preview
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/20 text-muted-foreground">
                      <th className="px-3 py-1.5 text-left font-medium">Account</th>
                      <th className="px-3 py-1.5 text-right font-medium">Debit</th>
                      <th className="px-3 py-1.5 text-right font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    <tr>
                      <td className="px-3 py-1.5 font-sans font-medium text-foreground">
                        {statement.bank_account?.account_name}
                      </td>
                      <td className="px-3 py-1.5 text-right text-green-600">
                        {selectedLine.amount > 0
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedLine.amount)
                          : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-red-600">
                        {selectedLine.amount < 0
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(selectedLine.amount))
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-sans italic text-muted-foreground">
                        {selectedOffsetAccount
                          ? `${selectedOffsetAccount.account_code} — ${selectedOffsetAccount.account_name}`
                          : '(Select offset account above)'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-green-600">
                        {selectedLine.amount < 0
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(selectedLine.amount))
                          : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-red-600">
                        {selectedLine.amount > 0
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedLine.amount)
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row justify-between sm:justify-between items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1 mr-auto"
              onClick={handleOpenFullForm}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Full Voucher Form
            </Button>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createJvMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => createJvMutation.mutate()}
                disabled={!offsetAccountId || createJvMutation.isPending}
              >
                {createJvMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create & Match
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

