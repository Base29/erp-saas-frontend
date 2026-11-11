import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Paperclip, Save, Upload, X } from 'lucide-react'
import {
  fetchSuppliers,
  fetchAccounts,
  fetchCostCenters,
  fetchPurchaseInvoice,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  uploadAttachment,
  type Account,
} from '@/api/tenant'
import { getProjects, type Project } from '@/api/projects'
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
import AccountCombobox from '@/components/accounts/AccountCombobox'

const schema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Date is required'),
  due_date: z.string().optional().nullable(),
  expense_account_id: z.string().min(1, 'Expense account is required'),
  tax_account_id: z.string().optional().nullable(),
  cost_center_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  total_amount: z.string().min(1, 'Amount is required'),
  tax_amount: z.string().default('0'),
})

type FormValues = z.infer<typeof schema>

export default function PurchaseInvoiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers({ is_active: 1 }).then((r) => r.data.data),
  })

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => fetchAccounts({ per_page: -1 }).then((r) => r.data),
  })

  const accounts: Account[] = useMemo(() => {
    if (!accountsData) return []
    if (Array.isArray(accountsData)) return accountsData
    if (Array.isArray((accountsData as any).data)) return (accountsData as any).data
    return []
  }, [accountsData])

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => fetchCostCenters({ is_active: 1 }).then((r) => r.data.data),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-all-active'],
    queryFn: () => getProjects({ per_page: 200 }).then((r) => r.data),
  })
  const projects: Project[] = projectsData?.data ?? []

  const { data: existingInvoice } = useQuery({
    queryKey: ['purchase-invoice', id],
    queryFn: () => fetchPurchaseInvoice(id!).then((r) => r.data.data),
    enabled: isEdit,
  })

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      total_amount: '0',
      tax_amount: '0',
    },
  })

  const watchedTaxAmount = parseFloat(watch('tax_amount') || '0')

  useEffect(() => {
    if (existingInvoice) {
      // Find expense and tax accounts from JV lines if available
      const jvLines = existingInvoice.journal_voucher?.lines ?? []
      const taxLine = jvLines.find((l: any) =>
        l.account?.account_name?.toLowerCase().includes('vat') ||
        l.account?.account_name?.toLowerCase().includes('tax')
      )
      const expenseLine = jvLines.find((l: any) =>
        Number(l.debit_amount) > 0 && l !== taxLine
      )

      reset({
        supplier_id: existingInvoice.supplier_id,
        invoice_number: existingInvoice.invoice_number,
        invoice_date: existingInvoice.invoice_date ? existingInvoice.invoice_date.slice(0, 10) : '',
        due_date: existingInvoice.due_date ? existingInvoice.due_date.slice(0, 10) : null,
        expense_account_id: expenseLine ? String(expenseLine.account_id) : '',
        tax_account_id: taxLine ? String(taxLine.account_id) : null,
        cost_center_id: expenseLine?.cost_center_id ?? 'none',
        project_id: (existingInvoice as any)?.project_id ?? 'none',
        total_amount: String(existingInvoice.total_amount),
        tax_amount: String(existingInvoice.tax_amount || 0),
      })
    }
  }, [existingInvoice, reset])

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = {
        ...v,
        total_amount: parseFloat(v.total_amount),
        tax_amount: parseFloat(v.tax_amount) || 0,
        tax_account_id: v.tax_account_id && v.tax_account_id !== 'default' ? v.tax_account_id : null,
        cost_center_id: v.cost_center_id === 'none' ? null : v.cost_center_id,
        project_id: v.project_id === 'none' ? null : v.project_id,
      }

      const res = isEdit
        ? await updatePurchaseInvoice(id!, payload)
        : await createPurchaseInvoice(payload)

      const invoiceId = res.data?.data?.id
      if (invoiceId && attachmentFile) {
        try {
          await uploadAttachment('PurchaseInvoice', invoiceId, attachmentFile)
        } catch (err) {
          console.error('Attachment upload error:', err)
        }
      }

      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-invoices'] })
      if (id) {
        qc.invalidateQueries({ queryKey: ['purchase-invoice', id] })
      }
      navigate('/accounts/purchase-invoices')
    },
  })

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/purchase-invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? 'Edit Purchase Invoice' : 'Record Purchase Invoice'}
        </h1>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Expense/Asset Account</Label>
                <Controller
                  control={control}
                  name="expense_account_id"
                  render={({ field }) => (
                    <AccountCombobox
                      value={field.value}
                      onChange={field.onChange}
                      accounts={accounts}
                      isLoading={accountsLoading}
                      filterType="expense"
                      placeholder="Search expense account by name or code…"
                    />
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

              <div className="space-y-2">
                <Label>Project (Optional)</Label>
                <Controller
                  control={control}
                  name="project_id"
                  render={({ field }) => (
                    <Select value={field.value || 'none'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.project_code} - {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount (Inc. Tax)</Label>
                <Input type="number" step="0.01" min="0" {...register('total_amount')} />
                {errors.total_amount && <p className="text-xs text-destructive">{errors.total_amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Tax Amount (Optional)</Label>
                <Input type="number" step="0.01" min="0" {...register('tax_amount')} />
              </div>
            </div>

            {watchedTaxAmount > 0 && (
              <div className="space-y-2 pt-1 border-t">
                <Label>Purchases VAT / Input Tax Account</Label>
                <Controller
                  control={control}
                  name="tax_account_id"
                  render={({ field }) => (
                    <AccountCombobox
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      accounts={accounts}
                      isLoading={accountsLoading}
                      placeholder="Default: Auto-resolve Purchases VAT (Input Tax) account"
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to automatically link to the standard Purchases VAT (Input Tax) account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Attachment</CardTitle>
          </CardHeader>
          <CardContent>
            {attachmentFile ? (
              <div className="flex items-center justify-between rounded-md border p-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{attachmentFile.name}</span>
                  <span className="text-xs text-muted-foreground">({(attachmentFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setAttachmentFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachmentFile(e.target.files[0])
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed py-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span>Attach supplier invoice PDF or receipt image (optional)</span>
                </Button>
              </div>
            )}
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
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
