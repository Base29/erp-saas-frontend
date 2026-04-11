import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import {
  fetchPriceLists, fetchPriceList, createPriceList, updatePriceList,
  fetchItems,
  type PriceList, type Item,
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

const itemLineSchema = z.object({
  item_id: z.string().min(1, 'Required'),
  unit_price: z.coerce.number().min(0, 'Required'),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
})

const schema = z.object({
  name: z.string().min(1, 'Required'),
  currency: z.string().default('PKR'),
  valid_from: z.string().nullable().default(null),
  valid_to: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
  items: z.array(itemLineSchema).default([]),
})

type FormValues = z.infer<typeof schema>

export default function PriceListsPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'sales')

  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PriceList | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['price-lists', page],
    queryFn: () => fetchPriceLists({ page }).then((r) => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ['price-list', detailId],
    queryFn: () => fetchPriceList(detailId!).then((r) => r.data.data),
    enabled: !!detailId,
  })

  const { data: itemsData } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => fetchItems({ per_page: 500 }).then((r) => r.data.data),
  })
  const allItems: Item[] = itemsData ?? []

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        items: v.items.map((i) => ({ item_id: Number(i.item_id), unit_price: i.unit_price, discount_percentage: i.discount_percentage })),
      }
      return editing ? updatePriceList(editing.id, payload) : createPriceList(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-lists'] }); setOpen(false) },
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', currency: 'PKR', valid_from: null, valid_to: null, is_active: true, items: [] })
    setOpen(true)
  }

  const openEdit = (pl: PriceList) => {
    setEditing(pl)
    reset({
      name: pl.name, currency: pl.currency,
      valid_from: pl.valid_from, valid_to: pl.valid_to, is_active: pl.is_active,
      items: pl.items?.map((i) => ({ item_id: String(i.item_id), unit_price: i.unit_price, discount_percentage: i.discount_percentage })) ?? [],
    })
    setOpen(true)
  }

  const columns: ColumnDef<PriceList>[] = [
    { accessorKey: 'name', header: 'Name', enableSorting: true },
    { accessorKey: 'currency', header: 'Currency' },
    { accessorKey: 'valid_from', header: 'Valid From', cell: ({ row }) => row.original.valid_from ?? '—' },
    { accessorKey: 'valid_to', header: 'Valid To', cell: ({ row }) => row.original.valid_to ?? '—' },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDetailId(row.original.id)}><Eye className="h-3.5 w-3.5" /></Button>
          {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}><Pencil className="h-3.5 w-3.5" /></Button>}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Price Lists</h1>
          <p className="text-sm text-muted-foreground">Manage pricing for customers</p>
        </div>
        {canEdit && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Price List</Button>}
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage} />

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Price List' : 'New Price List'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input {...register('name')} placeholder="e.g. Standard Retail" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input {...register('currency')} defaultValue="PKR" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valid From</Label>
                <Input type="date" {...register('valid_from')} />
              </div>
              <div className="space-y-1">
                <Label>Valid To</Label>
                <Input type="date" {...register('valid_to')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border" {...register('is_active')} />
              Active
            </label>

            {/* Price list items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Price List Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ item_id: '', unit_price: 0, discount_percentage: 0 })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-start">
                    <Select value={watch(`items.${i}.item_id`)} onValueChange={(v) => setValue(`items.${i}.item_id`, v, { shouldValidate: true })}>
                      <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                      <SelectContent>
                        {allItems.map((it) => <SelectItem key={it.id} value={String(it.id)}>{it.item_code} — {it.item_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="Unit price" {...register(`items.${i}.unit_price`)} />
                    <Input type="number" step="0.01" placeholder="Disc %" {...register(`items.${i}.discount_percentage`)} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>

            {save.isError && <p className="text-xs text-destructive">Failed to save price list</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Price List — {detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Currency:</span> {detail.currency}</div>
                <div><span className="text-muted-foreground">Valid:</span> {detail.valid_from ?? '—'} → {detail.valid_to ?? '—'}</div>
              </div>
              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Discount %</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((li, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{li.item?.item_name ?? `Item #${li.item_id}`}</td>
                      <td className="px-3 py-2 text-right">PKR {Number(li.unit_price).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{li.discount_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
