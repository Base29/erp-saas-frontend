import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBudget,
  updateBudget,
  fetchAccounts,
  fetchFiscalPeriods,
  fetchCostCenters,
  type Budget,
} from '@/api/tenant'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

const schema = z.object({
  fiscal_period_id: z.string().min(1, 'Period is required'),
  account_id: z.string().min(1, 'Account is required'),
  cost_center_id: z.string().optional().nullable(),
  amount: z.string().min(1, 'Amount is required'),
})

type FormValues = z.infer<typeof schema>

interface BudgetModalProps {
  budget?: Budget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPeriodId?: string
}

export default function BudgetModal({ budget, open, onOpenChange, defaultPeriodId }: BudgetModalProps) {
  const qc = useQueryClient()
  const isEdit = !!budget

  const { data: periods = [] } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data),
    enabled: open,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts({ is_active: 1 }).then((r) => r.data.data),
    enabled: open,
  })

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => fetchCostCenters({ is_active: 1 }).then((r) => r.data.data),
    enabled: open,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fiscal_period_id: defaultPeriodId || '',
      amount: '0',
    },
  })

  useEffect(() => {
    if (budget) {
      reset({
        fiscal_period_id: budget.fiscal_period_id,
        account_id: budget.account_id,
        cost_center_id: budget.cost_center_id || '',
        amount: String(budget.amount),
      })
    } else {
      reset({
        fiscal_period_id: defaultPeriodId || '',
        account_id: '',
        cost_center_id: '',
        amount: '0',
      })
    }
  }, [budget, reset, open, defaultPeriodId])

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        amount: parseFloat(v.amount),
        cost_center_id: v.cost_center_id || null,
      }
      return isEdit ? updateBudget(budget!.id, payload) : createBudget(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Budget' : 'Set New Budget'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Fiscal Period</Label>
            <Controller
              control={control}
              name="fiscal_period_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fiscal_period_id && <p className="text-xs text-destructive">{errors.fiscal_period_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.account_id && <p className="text-xs text-destructive">{errors.account_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Cost Center (Optional)</Label>
            <Controller
              control={control}
              name="cost_center_id"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No cost center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Global)</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Budgeted Amount</Label>
            <Input id="amount" type="number" step="0.01" {...register('amount')} className="text-lg font-bold" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {isSubmitting ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
