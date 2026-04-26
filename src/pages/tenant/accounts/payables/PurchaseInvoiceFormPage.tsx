import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import {
  fetchSuppliers,
  fetchAccounts,
  fetchCostCenters,
  createPurchaseInvoice,
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
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Date is required'),
  due_date: z.string().optional().nullable(),
  expense_account_id: z.string().min(1, 'Expense account is required'),
  cost_center_id: z.string().optional().nullable(),
  total_amount: z.string().min(1, 'Amount is required'),
  tax_amount: z.string().default('0'),
})

type FormValues = z.infer<typeof schema>

export default function PurchaseInvoiceFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers({ is_active: 1 }).then((r) => r.data.data),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts({ is_active: 1 }).then((r) => r.data.data),
  })

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => fetchCostCenters({ is_active: 1 }).then((r) => r.data.data),
  })

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      total_amount: '0',
      tax_amount: '0',
    },
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      return createPurchaseInvoice({
        ...v,
        total_amount: parseFloat(v.total_amount),
        tax_amount: parseFloat(v.tax_amount) || 0,
        cost_center_id: v.cost_center_id === 'none' ? null : v.cost_center_id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-invoices'] })
      navigate('/accounts/purchase-invoices')
    },
  })

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/purchase-invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Record Purchase Invoice</h1>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input {...register('invoice_number')} placeholder="e.g. INV-2024-001" />
              {errors.invoice_number && <p className="text-xs text-destructive">{errors.invoice_number.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" {...register('invoice_date')} />
              {errors.invoice_date && <p className="text-xs text-destructive">{errors.invoice_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accounting Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense/Asset Account</Label>
                <Controller
                  control={control}
                  name="expense_account_id"
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
                {errors.expense_account_id && <p className="text-xs text-destructive">{errors.expense_account_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Cost Center (Optional)</Label>
                <Controller
                  control={control}
                  name="cost_center_id"
                  render={({ field }) => (
                    <Select value={field.value || 'none'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="No cost center" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {costCenters.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount (Inc. Tax)</Label>
                <Input type="number" step="0.01" {...register('total_amount')} />
                {errors.total_amount && <p className="text-xs text-destructive">{errors.total_amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Tax Amount (Optional)</Label>
                <Input type="number" step="0.01" {...register('tax_amount')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {save.isError && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            {(save.error as any)?.response?.data?.message || 'Failed to save invoice'}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/accounts/purchase-invoices')}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting || save.isPending}>
            <Save size={16} />
            {isSubmitting ? 'Saving...' : 'Save Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
