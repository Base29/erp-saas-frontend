import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Landmark, Sparkles, Check, FileText } from 'lucide-react'
import {
  fetchSuppliers,
  fetchAccounts,
  createSupplierPayment,
  fetchUnpaidPurchaseInvoices,
  type Account,
  type PurchaseInvoice,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { format } from 'date-fns'

const schema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  payment_date: z.string().min(1, 'Date is required'),
  payment_reference: z.string().optional().nullable(),
  amount: z.string().min(1, 'Amount is required'),
  bank_account_id: z.string().min(1, 'Bank account is required'),
})

type FormValues = z.infer<typeof schema>

export default function SupplierPaymentFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [allocationError, setAllocationError] = useState<string | null>(null)

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers({ is_active: 1 }).then((r) => r.data.data),
  })

  // We only want Bank/Cash accounts for payments
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => fetchAccounts({ per_page: -1 }).then((r) => r.data),
  })

  const accounts: Account[] = useMemo(() => {
    if (!accountsData) return []
    if (Array.isArray(accountsData)) return accountsData
    if (Array.isArray((accountsData as any).data)) return (accountsData as any).data
    return []
  }, [accountsData])

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const name = a.account_name.toLowerCase()
      const code = a.account_code || ''
      return (
        name.includes('bank') ||
        name.includes('cash') ||
        name.includes('checking') ||
        name.includes('petty') ||
        code.startsWith('111') ||
        code.startsWith('10')
      )
    })
  }, [accounts])

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      amount: '0',
    },
  })

  const selectedSupplierId = watch('supplier_id')
  const amountStr = watch('amount')
  const paymentAmount = parseFloat(amountStr) || 0

  // Fetch unpaid invoices for selected supplier
  const { data: unpaidInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['unpaid-invoices', selectedSupplierId],
    queryFn: () => fetchUnpaidPurchaseInvoices(selectedSupplierId).then((r) => r.data.data),
    enabled: !!selectedSupplierId,
  })

  // Clear allocations when supplier changes
  useEffect(() => {
    setAllocations({})
    setAllocationError(null)
  }, [selectedSupplierId])

  // Total amount currently allocated across invoices
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0)
  }, [allocations])

  const unallocatedAmount = Math.max(0, paymentAmount - totalAllocated)

  // Auto-allocate payments FIFO (oldest invoices first)
  const handleAutoAllocate = () => {
    let remaining = paymentAmount
    const newAlloc: Record<string, number> = {}

    // Sort by invoice_date ascending
    const sorted = [...unpaidInvoices].sort((a, b) =>
      new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
    )

    for (const inv of sorted) {
      if (remaining <= 0) break
      const due = inv.balance_due ?? (Number(inv.total_amount) - (Number(inv.amount_paid) || 0))
      const toAlloc = Math.min(remaining, due)
      if (toAlloc > 0) {
        newAlloc[inv.id] = Math.round(toAlloc * 100) / 100
        remaining -= toAlloc
      }
    }

    setAllocations(newAlloc)
    setAllocationError(null)
  }

  const handleManualAllocation = (invId: string, val: string) => {
    const num = parseFloat(val) || 0
    setAllocations((prev) => {
      const copy = { ...prev }
      if (num <= 0) {
        delete copy[invId]
      } else {
        copy[invId] = num
      }
      return copy
    })
  }

  const handlePayFullInvoice = (inv: PurchaseInvoice) => {
    const due = inv.balance_due ?? (Number(inv.total_amount) - (Number(inv.amount_paid) || 0))
    setAllocations((prev) => ({
      ...prev,
      [inv.id]: due,
    }))
  }

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const allocArray = Object.entries(allocations)
        .filter(([_, amt]) => amt > 0)
        .map(([invId, amt]) => ({
          purchase_invoice_id: invId,
          allocated_amount: amt,
        }))

      return createSupplierPayment({
        ...v,
        amount: parseFloat(v.amount),
        allocations: allocArray.length > 0 ? allocArray : undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-payments'] })
      qc.invalidateQueries({ queryKey: ['purchase-invoices'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/accounts/supplier-payments')
    },
  })

  const onSubmit = (v: FormValues) => {
    const entered = parseFloat(v.amount)
    if (totalAllocated > entered + 0.001) {
      setAllocationError(`Allocated total ($${totalAllocated.toFixed(2)}) exceeds payment amount ($${entered.toFixed(2)})`)
      return
    }
    setAllocationError(null)
    save.mutate(v)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/supplier-payments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Supplier Payment</h1>
          <p className="text-xs text-muted-foreground">Make payments and reconcile against purchase invoices.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark size={18} className="text-primary" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Controller
                control={control}
                name="supplier_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.supplier_code})
                          {s.current_balance !== undefined && ` — Bal: $${Number(s.current_balance).toFixed(2)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplier_id && <p className="text-xs text-destructive">{errors.supplier_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input type="date" {...register('payment_date')} />
                {errors.payment_date && <p className="text-xs text-destructive">{errors.payment_date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input {...register('payment_reference')} placeholder="e.g. Chq #123, Bank Ref" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount Paid</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  className="text-lg font-bold"
                  placeholder="0.00"
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Bank / Cash Account</Label>
                <Controller
                  control={control}
                  name="bank_account_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank/cash account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(bankAccounts.length > 0 ? bankAccounts : accounts).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.account_code} - {a.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.bank_account_id && <p className="text-xs text-destructive">{errors.bank_account_id.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Allocation & Reconciliation Card */}
        {selectedSupplierId && (
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Invoice Allocation & Reconciliation
                </CardTitle>
                <CardDescription className="text-xs">
                  Reconcile this payment against outstanding purchase invoices.
                </CardDescription>
              </div>

              {unpaidInvoices.length > 0 && paymentAmount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAllocate}
                  className="gap-1.5 text-xs border-primary/40 hover:bg-primary/5 text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Allocate (FIFO)
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {invoicesLoading ? (
                <p className="text-xs text-muted-foreground p-4 text-center">Loading unpaid invoices…</p>
              ) : unpaidInvoices.length === 0 ? (
                <div className="p-4 text-center border rounded-md bg-muted/10 text-xs text-muted-foreground">
                  No outstanding unpaid invoices found for this supplier. Payment will be recorded on account.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Invoice #</th>
                        <th className="py-2.5 px-3 text-left">Date</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-right w-44">Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unpaidInvoices.map((inv) => {
                        const balanceDue = inv.balance_due ?? (Number(inv.total_amount) - (Number(inv.amount_paid) || 0))
                        const currentAlloc = allocations[inv.id] ?? ''

                        return (
                          <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-2 px-3 font-medium text-foreground">
                              {inv.invoice_number}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              ${Number(inv.total_amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                              ${balanceDue.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={balanceDue}
                                  value={currentAlloc}
                                  onChange={(e) => handleManualAllocation(inv.id, e.target.value)}
                                  placeholder="0.00"
                                  className="h-7 w-28 text-right font-mono text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                                  title="Pay full balance"
                                  onClick={() => handlePayFullInvoice(inv)}
                                >
                                  Full
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Allocation Summary Bar */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border text-xs">
                <div className="space-x-4">
                  <span>
                    Total Payment: <strong className="font-mono text-foreground">${paymentAmount.toFixed(2)}</strong>
                  </span>
                  <span>
                    Allocated: <strong className="font-mono text-primary">${totalAllocated.toFixed(2)}</strong>
                  </span>
                  <span>
                    Unallocated: <strong className="font-mono text-muted-foreground">${unallocatedAmount.toFixed(2)}</strong>
                  </span>
                </div>
                {totalAllocated > 0 && totalAllocated <= paymentAmount && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                    <Check className="h-3.5 w-3.5" /> Reconciled
                  </span>
                )}
              </div>

              {allocationError && (
                <p className="text-xs text-destructive font-medium">{allocationError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {save.isError && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            {(save.error as any)?.response?.data?.message || 'Failed to record payment'}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/accounts/supplier-payments')}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting || save.isPending}>
            <Save size={16} />
            {isSubmitting || save.isPending ? 'Recording…' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
