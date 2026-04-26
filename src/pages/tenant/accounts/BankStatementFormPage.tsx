import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import {
  fetchAccounts,
  createBankStatement,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const lineSchema = z.object({
  transaction_date: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  amount: z.string().default('0'),
})

const schema = z.object({
  bank_account_id: z.string().min(1, 'Bank account is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  opening_balance: z.string().default('0'),
  closing_balance: z.string().default('0'),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
})

type FormValues = z.infer<typeof schema>

export default function BankStatementFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', { type: 'bank' }],
    queryFn: () => fetchAccounts({ is_active: 1 }).then((r) => r.data.data),
  })

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      opening_balance: '0',
      closing_balance: '0',
      lines: [{ transaction_date: new Date().toISOString().split('T')[0], description: '', amount: '0' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        opening_balance: parseFloat(v.opening_balance),
        closing_balance: parseFloat(v.closing_balance),
        lines: v.lines.map((l) => ({
          ...l,
          amount: parseFloat(l.amount),
        })),
      }
      return createBankStatement(payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bank-statements'] })
      // Navigate to matching workspace
      navigate(`/accounts/bank-reconciliation/${res.data.data.id}`)
    },
  })

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/bank-reconciliation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Import Bank Statement</h1>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statement Header</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Controller
                control={control}
                name="bank_account_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.bank_account_id && <p className="text-xs text-destructive">{errors.bank_account_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...register('start_date')} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...register('end_date')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input type="number" step="0.01" {...register('opening_balance')} />
            </div>

            <div className="space-y-2">
              <Label>Closing Balance</Label>
              <Input type="number" step="0.01" {...register('closing_balance')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Statement Lines</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ transaction_date: new Date().toISOString().split('T')[0], description: '', amount: '0' })}
            >
              <Plus size={14} className="mr-1" /> Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 w-40">Date</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2 w-32">Amount</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <Input type="date" {...register(`lines.${index}.transaction_date`)} className="h-8" />
                    </td>
                    <td className="py-2 pr-2">
                      <Input {...register(`lines.${index}.description`)} className="h-8" placeholder="e.g. ATM Withdrawal, Salary Deposit" />
                    </td>
                    <td className="py-2 pr-2">
                      <Input type="number" step="0.01" {...register(`lines.${index}.amount`)} className="h-8 text-right" />
                    </td>
                    <td className="py-2">
                      <Button variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.lines && <p className="text-xs text-destructive mt-2">{errors.lines.message}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/accounts/bank-reconciliation')}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting || save.isPending}>
            <Save size={16} />
            Save & Continue to Match
          </Button>
        </div>
      </form>
    </div>
  )
}
