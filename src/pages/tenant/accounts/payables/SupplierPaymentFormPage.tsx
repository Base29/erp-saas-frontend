import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Landmark } from 'lucide-react'
import {
  fetchSuppliers,
  fetchAccounts,
  createSupplierPayment,
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

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers({ is_active: 1 }).then((r) => r.data.data),
  })

  // We only want Bank/Cash accounts for payments
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts({ is_active: 1 }).then((r) => r.data.data),
  })

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      amount: '0',
    },
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      return createSupplierPayment({
        ...v,
        amount: parseFloat(v.amount),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-payments'] })
      navigate('/accounts/supplier-payments')
    },
  })

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/supplier-payments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Record Supplier Payment</h1>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
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
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.supplier_code})</SelectItem>
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
                <Input type="number" step="0.01" {...register('amount')} className="text-lg font-bold" />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Bank/Cash Account</Label>
                <Controller
                  control={control}
                  name="bank_account_id"
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
                {errors.bank_account_id && <p className="text-xs text-destructive">{errors.bank_account_id.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

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
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
