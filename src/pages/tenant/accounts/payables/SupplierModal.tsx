import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplier,
  updateSupplier,
  fetchAccounts,
  type Supplier,
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
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  supplier_code: z.string().min(1, 'Code is required'),
  tax_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  default_payable_account_id: z.string().optional(),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface SupplierModalProps {
  supplier?: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SupplierModal({ supplier, open, onOpenChange }: SupplierModalProps) {
  const qc = useQueryClient()
  const isEdit = !!supplier

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', { type: 'liability' }], // Ideally filter by liability
    queryFn: () => fetchAccounts({ is_active: 1 }).then((r) => r.data.data),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_active: true,
    },
  })

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        supplier_code: supplier.supplier_code,
        tax_number: supplier.tax_number || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        default_payable_account_id: supplier.default_payable_account_id || '',
        is_active: supplier.is_active,
      })
    } else {
      reset({
        name: '',
        supplier_code: '',
        tax_number: '',
        email: '',
        phone: '',
        address: '',
        default_payable_account_id: '',
        is_active: true,
      })
    }
  }, [supplier, reset, open])

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = { ...v }
      return isEdit ? updateSupplier(supplier!.id, payload) : createSupplier(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_code">Supplier Code</Label>
              <Input id="supplier_code" {...register('supplier_code')} placeholder="SUP-001" />
              {errors.supplier_code && <p className="text-xs text-destructive">{errors.supplier_code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input id="name" {...register('name')} placeholder="Acme Corp" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="vendor@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_number">Tax Number</Label>
              <Input id="tax_number" {...register('tax_number')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register('address')} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Default Payable Account</Label>
            <Select
              onValueChange={(val) => setValue('default_payable_account_id', val)}
              value={watch('default_payable_account_id') || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_code} - {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
             <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-gray-300" />
             <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {isSubmitting ? 'Saving...' : 'Save Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
