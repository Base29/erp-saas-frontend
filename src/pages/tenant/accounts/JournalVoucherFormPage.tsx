import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import {
  fetchJournalVoucher,
  fetchAccounts,
  fetchFiscalPeriods,
  createJournalVoucher,
  updateJournalVoucher,
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

const lineSchema = z.object({
  account_id: z.string().min(1, 'Required'),
  debit_amount: z.string().default('0'),
  credit_amount: z.string().default('0'),
  line_narration: z.string().optional(),
})

const schema = z.object({
  voucher_type: z.string().default('general'),
  voucher_date: z.string().min(1, 'Required'),
  fiscal_period_id: z.string().min(1, 'Required'),
  reference: z.string().optional(),
  narration: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
})

type FormValues = z.infer<typeof schema>

const VOUCHER_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'cash_receipt', label: 'Cash Receipt' },
  { value: 'cash_payment', label: 'Cash Payment' },
  { value: 'bank_receipt', label: 'Bank Receipt' },
  { value: 'bank_payment', label: 'Bank Payment' },
]

export default function JournalVoucherFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: jv } = useQuery({
    queryKey: ['journal-voucher', id],
    queryFn: () => fetchJournalVoucher(Number(id)).then((r) => r.data),
    enabled: isEdit,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts({ is_active: true }).then((r) => r.data.data),
  })

  const { data: periods = [] } = useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: () => fetchFiscalPeriods().then((r) => r.data.data),
  })

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        voucher_type: 'general',
        lines: [{ account_id: '', debit_amount: '0', credit_amount: '0' }],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  useEffect(() => {
    if (jv) {
      reset({
        voucher_type: jv.voucher_type,
        voucher_date: jv.voucher_date,
        fiscal_period_id: String(jv.fiscal_period_id),
        reference: jv.reference ?? '',
        narration: jv.narration ?? '',
        lines: (jv.lines ?? []).map((l) => ({
          account_id: String(l.account_id),
          debit_amount: String(l.debit_amount),
          credit_amount: String(l.credit_amount),
          line_narration: l.line_narration ?? '',
        })),
      })
    }
  }, [jv, reset])

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        voucher_type: v.voucher_type,
        voucher_date: v.voucher_date,
        fiscal_period_id: Number(v.fiscal_period_id),
        reference: v.reference || undefined,
        narration: v.narration || undefined,
        lines: v.lines.map((l) => ({
          account_id: Number(l.account_id),
          debit_amount: parseFloat(l.debit_amount) || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          line_narration: l.line_narration || undefined,
        })),
      }
      return isEdit
        ? updateJournalVoucher(Number(id), payload)
        : createJournalVoucher(payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['journal-vouchers'] })
      navigate(`/accounts/journal-vouchers/${res.data.id}`)
    },
  })

  const lines = watch('lines')
  const totalDebit = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0),
    [lines]
  )
  const totalCredit = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0),
    [lines]
  )
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const isReadOnly = jv?.posting_status === 'posted' || jv?.is_auto_generated

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/journal-vouchers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? `Edit Voucher ${jv?.voucher_number ?? ''}` : 'New Journal Voucher'}
        </h1>
      </div>

      {isReadOnly && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          This voucher is read-only ({jv?.is_auto_generated ? 'auto-generated' : 'posted'}).
        </div>
      )}

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        {/* Header fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Voucher Type</Label>
            <Controller
              control={control}
              name="voucher_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOUCHER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label>Voucher Date</Label>
            <Input type="date" {...register('voucher_date')} disabled={isReadOnly} />
            {errors.voucher_date && <p className="text-xs text-destructive">{errors.voucher_date.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Fiscal Period</Label>
            <Controller
              control={control}
              name="fiscal_period_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue placeholder="Select period…" /></SelectTrigger>
                  <SelectContent>
                    {periods.filter((p) => p.status === 'open').map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fiscal_period_id && <p className="text-xs text-destructive">{errors.fiscal_period_id.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Reference</Label>
            <Input {...register('reference')} placeholder="Optional reference" disabled={isReadOnly} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Narration</Label>
            <Input {...register('narration')} placeholder="Description" disabled={isReadOnly} />
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Journal Lines</Label>
            {!isReadOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ account_id: '', debit_amount: '0', credit_amount: '0' })}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-64">Account</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Narration</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground w-32">Debit</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground w-32">Credit</th>
                  {!isReadOnly && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, i) => (
                  <tr key={field.id} className="border-t">
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`lines.${i}.account_id`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange} disabled={isReadOnly}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select account…" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={String(a.id)}>
                                  {a.account_code} — {a.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 text-xs"
                        {...register(`lines.${i}.line_narration`)}
                        placeholder="Line note"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 text-xs text-right"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`lines.${i}.debit_amount`)}
                        disabled={isReadOnly}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 text-xs text-right"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`lines.${i}.credit_amount`)}
                        disabled={isReadOnly}
                      />
                    </td>
                    {!isReadOnly && (
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(i)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-sm font-medium text-right">Totals</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    {totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    {totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </td>
                  {!isReadOnly && <td />}
                </tr>
              </tfoot>
            </table>
          </div>

          {!isBalanced && totalDebit > 0 && (
            <p className="text-xs text-destructive">
              Debits and credits must balance. Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)}
            </p>
          )}
        </div>

        {save.isError && (
          <p className="text-sm text-destructive">
            {(save.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'}
          </p>
        )}

        {!isReadOnly && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/accounts/journal-vouchers')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {isEdit ? 'Save Changes' : 'Create Voucher'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
