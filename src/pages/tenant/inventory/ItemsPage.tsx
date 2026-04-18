import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  fetchItems, fetchItemCategories, fetchUoms, createItem, updateItem,
  type Item, type ItemCategory, type UnitOfMeasure,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import type { ColumnDef } from '@tanstack/react-table'

const variantSchema = z.object({
  variant_name: z.string().min(1, 'Required'),
  item_code_suffix: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
})

const bundleSchema = z.object({
  component_item_id: z.string().min(1, 'Required'),
  component_quantity: z.coerce.number().positive('Must be > 0'),
})

const schema = z.object({
  item_code: z.string().min(1, 'Required'),
  item_name: z.string().min(1, 'Required'),
  item_type: z.enum(['stock', 'service', 'bundle']),
  category_id: z.string().nullable().default(null),
  base_unit_of_measure_id: z.string().min(1, 'Required'),
  reorder_level: z.coerce.number().min(0).default(0),
  is_batch_tracked: z.boolean().default(false),
  is_serial_tracked: z.boolean().default(false),
  is_expiry_tracked: z.boolean().default(false),
  is_active: z.boolean().default(true),
  variants: z.array(variantSchema).default([]),
  bundle_components: z.array(bundleSchema).default([]),
})

type FormValues = z.infer<typeof schema>

export default function ItemsPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'inventory')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['items', page],
    queryFn: () => fetchItems({ page }).then((r) => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['item-categories'],
    queryFn: () => fetchItemCategories().then((r) => r.data.data),
  })

  const { data: uoms = [] } = useQuery({
    queryKey: ['uoms'],
    queryFn: () => fetchUoms().then((r) => r.data.data),
  })

  const { data: allItems = [] } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        category_id: v.category_id ? Number(v.category_id) : null,
        base_unit_of_measure_id: Number(v.base_unit_of_measure_id),
        variants: v.variants.map((variant) => ({
          ...variant,
          variant_attributes: null,
        })),
        bundle_components: v.bundle_components.map((b) => ({
          ...b,
          component_item_id: Number(b.component_item_id),
        })),
      }
      return editing ? updateItem(editing.id, payload) : createItem(payload as Parameters<typeof createItem>[0])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      setOpen(false)
    },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({ control, name: 'variants' })
  const { fields: bundleFields, append: appendBundle, remove: removeBundle } = useFieldArray({ control, name: 'bundle_components' })

  const itemType = watch('item_type')

  const openCreate = () => {
    setEditing(null)
    reset({ item_code: '', item_name: '', item_type: 'stock', category_id: null, base_unit_of_measure_id: '', reorder_level: 0, is_batch_tracked: false, is_serial_tracked: false, is_expiry_tracked: false, is_active: true, variants: [], bundle_components: [] })
    setOpen(true)
  }

  const openEdit = (item: Item) => {
    setEditing(item)
    reset({
      item_code: item.item_code,
      item_name: item.item_name,
      item_type: item.item_type,
      category_id: item.category_id ? String(item.category_id) : null,
      base_unit_of_measure_id: String(item.base_unit_of_measure_id),
      reorder_level: item.reorder_level,
      is_batch_tracked: item.is_batch_tracked,
      is_serial_tracked: item.is_serial_tracked,
      is_expiry_tracked: item.is_expiry_tracked,
      is_active: item.is_active,
      variants: item.variants ?? [],
      bundle_components: item.bundle_components?.map((b) => ({ component_item_id: String(b.component_item_id), component_quantity: b.component_quantity })) ?? [],
    })
    setOpen(true)
  }

  const columns: ColumnDef<Item>[] = [
    { accessorKey: 'item_code', header: 'Code', enableSorting: true },
    { accessorKey: 'item_name', header: 'Name', enableSorting: true },
    { accessorKey: 'item_type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.item_type}</Badge> },
    { id: 'category', header: 'Category', cell: ({ row }) => row.original.category?.name ?? '—' },
    { id: 'uom', header: 'UOM', cell: ({ row }) => row.original.base_uom?.abbreviation ?? '—' },
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    ...(canEdit ? [{
      id: 'actions', header: '',
      cell: ({ row }: { row: { original: Item } }) => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}><Pencil className="h-3.5 w-3.5" /></Button>
      ),
    } as ColumnDef<Item>] : []),
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Items</h1>
          <p className="text-sm text-muted-foreground">Manage inventory items</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Item</Button>}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="item_code"
        filterPlaceholder="Search by code…"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Item Code</Label>
                <Input {...register('item_code')} placeholder="e.g. ITM-001" />
                {errors.item_code && <p className="text-xs text-destructive">{errors.item_code.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Item Name</Label>
                <Input {...register('item_name')} placeholder="Item name" />
                {errors.item_name && <p className="text-xs text-destructive">{errors.item_name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={watch('item_type')} onValueChange={(v) => setValue('item_type', v as 'stock' | 'service' | 'bundle', { shouldValidate: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={watch('category_id') ?? ''} onValueChange={(v) => setValue('category_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {(categories as ItemCategory[]).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Base UOM</Label>
                <Select value={watch('base_unit_of_measure_id')} onValueChange={(v) => setValue('base_unit_of_measure_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select UOM…" /></SelectTrigger>
                  <SelectContent>
                    {(uoms as UnitOfMeasure[]).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation})</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.base_unit_of_measure_id && <p className="text-xs text-destructive">{errors.base_unit_of_measure_id.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Reorder Level</Label>
                <Input type="number" step="0.0001" {...register('reorder_level')} />
              </div>
            </div>

            {/* Tracking flags */}
            {itemType === 'stock' && (
              <div className="flex gap-6">
                {(['is_batch_tracked', 'is_serial_tracked', 'is_expiry_tracked'] as const).map((flag) => (
                  <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border" {...register(flag)} />
                    {flag === 'is_batch_tracked' ? 'Batch Tracked' : flag === 'is_serial_tracked' ? 'Serial Tracked' : 'Expiry Tracked'}
                  </label>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border" {...register('is_active')} />
              Active
            </label>

            {/* Variants sub-form */}
            {itemType !== 'bundle' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Variants</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => appendVariant({ variant_name: '', item_code_suffix: null, is_active: true })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
                  </Button>
                </div>
                {variantFields.map((field, i) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Input placeholder="Variant name" {...register(`variants.${i}.variant_name`)} />
                    <Input placeholder="Code suffix" {...register(`variants.${i}.item_code_suffix`)} className="w-28" />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeVariant(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* Bundle components sub-form */}
            {itemType === 'bundle' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Bundle Components</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => appendBundle({ component_item_id: '', component_quantity: 1 })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Component
                  </Button>
                </div>
                {bundleFields.map((field, i) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Select value={watch(`bundle_components.${i}.component_item_id`)} onValueChange={(v) => setValue(`bundle_components.${i}.component_item_id`, v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select item…" /></SelectTrigger>
                      <SelectContent>
                        {(allItems as Item[]).filter((it) => it.item_type !== 'bundle').map((it) => (
                          <SelectItem key={it.id} value={String(it.id)}>{it.item_code} — {it.item_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.0001" placeholder="Qty" {...register(`bundle_components.${i}.component_quantity`)} className="w-24" />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeBundle(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}

            {save.isError && <p className="text-xs text-destructive">Failed to save item</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
