import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, FolderTree, Ruler, Boxes } from 'lucide-react'
import {
  fetchItems,
  fetchNextItemCode,
  fetchItemCategories,
  fetchUoms,
  fetchItemTypes,
  createItem,
  updateItem,
  type Item,
  type ItemCategory,
  type UnitOfMeasure,
  type ItemType,
} from '@/api/tenant'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import {
  canWrite,
  canManageUoms,
  canManageItemTypes,
  canManageItemCategories,
} from '@/utils/permissions'
import QuickAddUomModal from '@/components/inventory/QuickAddUomModal'
import QuickAddCategoryModal from '@/components/inventory/QuickAddCategoryModal'
import QuickAddTypeModal from '@/components/inventory/QuickAddTypeModal'
import ManageUomsModal from '@/components/inventory/ManageUomsModal'
import ManageCategoriesModal from '@/components/inventory/ManageCategoriesModal'
import ManageItemTypesModal, { DEFAULT_SYSTEM_ITEM_TYPES } from '@/components/inventory/ManageItemTypesModal'
import type { ColumnDef } from '@tanstack/react-table'

const variantSchema = z.object({
  variant_name: z.string().min(1, 'Required'),
  item_code_suffix: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
})

const bundleSchema = z.object({
  component_item_id: z.string().min(1, 'Required'),
  component_quantity: z.coerce.number().int('Must be a whole number').positive('Must be > 0'),
})

const schema = z.object({
  item_code: z.string().max(50, 'Max 50 characters').optional().default(''),
  item_name: z.string().min(1, 'Required'),
  item_type: z.string().min(1, 'Required'),
  category_id: z.string().nullable().default(null),
  base_unit_of_measure_id: z.string().min(1, 'Required'),
  reorder_level: z.coerce.number().int('Must be a whole number').min(0).default(0),
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
  const canEditUoms = canManageUoms(role)
  const canEditCategories = canManageItemCategories(role)
  const canEditTypes = canManageItemTypes(role)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')

  // Quick Add Dialog States
  const [quickAddUomOpen, setQuickAddUomOpen] = useState(false)
  const [quickAddCategoryOpen, setQuickAddCategoryOpen] = useState(false)
  const [quickAddTypeOpen, setQuickAddTypeOpen] = useState(false)

  // Full Master Data Manager Modal States
  const [manageUomsOpen, setManageUomsOpen] = useState(false)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [manageTypesOpen, setManageTypesOpen] = useState(false)

  const queryParams: Record<string, string | number | boolean> = { page }
  if (search.trim()) queryParams.search = search.trim()
  if (filterType && filterType !== '__all__') queryParams.item_type = filterType
  if (categoryId && categoryId !== '__all__') queryParams.category_id = categoryId
  if (status && status !== '__all__') queryParams.is_active = status === 'active'

  const { data, isLoading } = useQuery({
    queryKey: ['items', queryParams],
    queryFn: () => fetchItems(queryParams).then((r) => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['item-categories'],
    queryFn: () => fetchItemCategories({ all: true }).then((r) => r.data.data ?? []),
  })

  const { data: uoms = [] } = useQuery({
    queryKey: ['uoms'],
    queryFn: () => fetchUoms({ all: true }).then((r) => r.data.data ?? []),
  })

  const { data: itemTypes = [] } = useQuery({
    queryKey: ['item-types'],
    queryFn: () => fetchItemTypes({ all: true }).then((r) => r.data.data ?? []),
  })

  const effectiveItemTypes = useMemo(() => {
    const list = [...(itemTypes as ItemType[])]
    for (const def of DEFAULT_SYSTEM_ITEM_TYPES) {
      if (!list.some((t) => t.code === def.code)) {
        list.push(def)
      }
    }
    return list
  }, [itemTypes])

  const { data: allItems = [] } = useQuery({
    queryKey: ['items-all'],
    queryFn: () => fetchItems({ per_page: 200 }).then((r) => r.data.data),
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        ...v,
        category_id: v.category_id || null,
        base_unit_of_measure_id: v.base_unit_of_measure_id,
        variants: v.variants.map((variant) => ({
          ...variant,
          variant_attributes: null,
        })),
        bundle_components: v.bundle_components.map((b) => ({
          ...b,
          component_item_id: b.component_item_id,
        })),
      }
      return editing ? updateItem(editing.id, payload) : createItem(payload as Parameters<typeof createItem>[0])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      setOpen(false)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({ control, name: 'variants' })
  const { fields: bundleFields, append: appendBundle, remove: removeBundle } = useFieldArray({ control, name: 'bundle_components' })

  const itemType = watch('item_type')
  const currentTypeObj = effectiveItemTypes.find((t) => t.code === itemType)
  const currentNature = currentTypeObj?.nature ?? (itemType === 'service' ? 'service' : itemType === 'bundle' ? 'bundle' : 'stock')

  const openCreate = () => {
    setEditing(null)
    reset({
      item_code: '',
      item_name: '',
      item_type: 'stock',
      category_id: null,
      base_unit_of_measure_id: '',
      reorder_level: 0,
      is_batch_tracked: false,
      is_serial_tracked: false,
      is_expiry_tracked: false,
      is_active: true,
      variants: [],
      bundle_components: [],
    })
    setOpen(true)
    fetchNextItemCode('stock')
      .then((r) => {
        if (r.data?.code) {
          setValue('item_code', r.data.code, { shouldValidate: true })
        }
      })
      .catch(() => {})
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
      bundle_components:
        item.bundle_components?.map((b) => ({
          component_item_id: String(b.component_item_id),
          component_quantity: b.component_quantity,
        })) ?? [],
    })
    setOpen(true)
  }

  const columns: ColumnDef<Item>[] = [
    { accessorKey: 'item_code', header: 'Code', enableSorting: true },
    { accessorKey: 'item_name', header: 'Name', enableSorting: true },
    {
      accessorKey: 'item_type',
      header: 'Type',
      cell: ({ row }) => {
        const typeCode = row.original.item_type
        const matched = effectiveItemTypes.find((t) => t.code === typeCode)
        return <Badge variant="outline">{matched?.name ?? typeCode}</Badge>
      },
    },
    { id: 'category', header: 'Category', cell: ({ row }) => row.original.category?.name ?? '—' },
    { id: 'uom', header: 'UOM', cell: ({ row }) => row.original.base_uom?.abbreviation ?? '—' },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    ...(canEdit
      ? ([
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: Item } }) => (
              <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
          } as ColumnDef<Item>,
        ] as ColumnDef<Item>[])
      : []),
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Page Header with Master Data Management Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Items</h1>
          <p className="text-sm text-muted-foreground">Manage catalog items, UOMs, types, and categories</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEditCategories && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              onClick={() => setManageCategoriesOpen(true)}
            >
              <FolderTree className="h-4 w-4 text-primary" />
              Categories
            </Button>
          )}
          {canEditUoms && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              onClick={() => setManageUomsOpen(true)}
            >
              <Ruler className="h-4 w-4 text-primary" />
              Units of Measure
            </Button>
          )}
          {canEditTypes && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              onClick={() => setManageTypesOpen(true)}
            >
              <Boxes className="h-4 w-4 text-primary" />
              Item Types
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={openCreate} className="h-9 gap-1.5">
              <Plus className="h-4 w-4" /> New Item
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search items by code or name…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(
          search ||
            (filterType && filterType !== '__all__') ||
            (categoryId && categoryId !== '__all__') ||
            (status && status !== '__all__')
        )}
        onClearFilters={() => {
          setSearch('')
          setFilterType('')
          setCategoryId('')
          setStatus('')
          setPage(1)
        }}
        toolbarExtra={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={filterType || '__all__'}
              onValueChange={(val) => {
                setFilterType(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {effectiveItemTypes.map((t) => (
                  <SelectItem key={t.id} value={t.code}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryId || '__all__'}
              onValueChange={(val) => {
                setCategoryId(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {(categories as ItemCategory[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status || '__all__'}
              onValueChange={(val) => {
                setStatus(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* New / Edit Item Modal with increased width (max-w-4xl) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6 py-2">
            {/* Basic Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Item Code</Label>
                  {!editing && <span className="text-[10px] text-muted-foreground">Auto-sequenced</span>}
                </div>
                <Input
                  {...register('item_code')}
                  disabled={Boolean(editing)}
                  placeholder={editing ? 'Item code' : 'Auto-generated (e.g. ITM-00001)'}
                  className={editing ? 'bg-muted cursor-not-allowed' : ''}
                />
                {!editing ? (
                  <p className="text-[11px] text-muted-foreground">Leave blank to auto-generate sequence.</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Item code cannot be changed once created.</p>
                )}
                {errors.item_code && <p className="text-xs text-destructive">{errors.item_code.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Item Name</Label>
                <Input {...register('item_name')} placeholder="Item name" />
                {errors.item_name && <p className="text-xs text-destructive">{errors.item_name.message}</p>}
              </div>
            </div>

            {/* Classification & Measure Grid with inline "+ Add" buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border bg-muted/20">
              {/* Type with inline Add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Type</Label>
                  {canEditTypes && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-primary font-medium hover:text-primary hover:bg-primary/10"
                      onClick={() => setQuickAddTypeOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> New Type
                    </Button>
                  )}
                </div>
                <Select
                  value={watch('item_type')}
                  disabled={Boolean(editing)}
                  onValueChange={(v) => {
                    setValue('item_type', v, { shouldValidate: true })
                    if (!editing) {
                      fetchNextItemCode(v)
                        .then((r) => {
                          if (r.data?.code) {
                            setValue('item_code', r.data.code, { shouldValidate: true })
                          }
                        })
                        .catch(() => {})
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveItemTypes.map((t) => (
                      <SelectItem key={t.id} value={t.code}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.item_type && <p className="text-xs text-destructive">{errors.item_type.message}</p>}
              </div>

              {/* Category with inline Add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  {canEditCategories && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-primary font-medium hover:text-primary hover:bg-primary/10"
                      onClick={() => setQuickAddCategoryOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> New Category
                    </Button>
                  )}
                </div>
                <Select
                  value={watch('category_id') ?? 'none'}
                  onValueChange={(v) => setValue('category_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(categories as ItemCategory[]).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base UOM with inline Add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Base UOM</Label>
                  {canEditUoms && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-primary font-medium hover:text-primary hover:bg-primary/10"
                      onClick={() => setQuickAddUomOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> New UOM
                    </Button>
                  )}
                </div>
                <Select
                  value={watch('base_unit_of_measure_id')}
                  onValueChange={(v) => setValue('base_unit_of_measure_id', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UOM…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(uoms as UnitOfMeasure[]).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.base_unit_of_measure_id && (
                  <p className="text-xs text-destructive">{errors.base_unit_of_measure_id.message}</p>
                )}
              </div>
            </div>

            {/* Inventory Reorder Level & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Reorder Level (Alert Threshold)</Label>
                <Input type="number" step="1" min="0" {...register('reorder_level')} />
                <p className="text-[11px] text-muted-foreground">
                  Triggers low-stock alerts when available quantity falls at or below this level.
                </p>
              </div>

              <div className="flex items-center gap-6 pt-5">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border" {...register('is_active')} />
                  Active Item
                </label>
              </div>
            </div>

            {/* Tracking flags (shown for stock nature) */}
            {currentNature === 'stock' && (
              <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Stock Tracking Features
                </Label>
                <div className="flex flex-wrap gap-6 pt-1">
                  {(['is_batch_tracked', 'is_serial_tracked', 'is_expiry_tracked'] as const).map((flag) => (
                    <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 rounded border" {...register(flag)} />
                      {flag === 'is_batch_tracked'
                        ? 'Batch Tracked'
                        : flag === 'is_serial_tracked'
                        ? 'Serial Tracked'
                        : 'Expiry Tracked'}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Variants sub-form */}
            {currentNature !== 'bundle' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <Label className="text-sm font-semibold">Item Variants</Label>
                    <p className="text-xs text-muted-foreground">Add SKU variants (e.g. Size, Color, Specifications)</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => appendVariant({ variant_name: '', item_code_suffix: null, is_active: true })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
                  </Button>
                </div>
                {variantFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">No variants configured (standard single item).</p>
                ) : (
                  <div className="space-y-2">
                    {variantFields.map((field, i) => (
                      <div key={field.id} className="flex gap-2 items-start">
                        <Input placeholder="Variant name (e.g. Red / XL)" {...register(`variants.${i}.variant_name`)} />
                        <Input placeholder="Code suffix (e.g. -RED)" {...register(`variants.${i}.item_code_suffix`)} className="w-36" />
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeVariant(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bundle components sub-form */}
            {currentNature === 'bundle' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <Label className="text-sm font-semibold">Bundle Components</Label>
                    <p className="text-xs text-muted-foreground">Specify the items and quantities that make up this kit</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => appendBundle({ component_item_id: '', component_quantity: 1 })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Component
                  </Button>
                </div>
                {bundleFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">No bundle components added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bundleFields.map((field, i) => (
                      <div key={field.id} className="flex gap-2 items-start">
                        <Select
                          value={watch(`bundle_components.${i}.component_item_id`)}
                          onValueChange={(v) => setValue(`bundle_components.${i}.component_item_id`, v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select component item…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(allItems as Item[])
                              .filter((it) => it.item_type !== 'bundle')
                              .map((it) => (
                                <SelectItem key={it.id} value={String(it.id)}>
                                  {it.item_code} — {it.item_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Qty"
                          {...register(`bundle_components.${i}.component_quantity`)}
                          className="w-24"
                        />
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeBundle(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {save.isError && <p className="text-xs text-destructive">Failed to save item</p>}

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || save.isPending}>
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Modals (opened from within the New Item modal) */}
      <QuickAddUomModal
        open={quickAddUomOpen}
        onOpenChange={setQuickAddUomOpen}
        onSuccess={(newUom) => {
          setValue('base_unit_of_measure_id', String(newUom.id), { shouldValidate: true })
        }}
      />

      <QuickAddCategoryModal
        open={quickAddCategoryOpen}
        onOpenChange={setQuickAddCategoryOpen}
        categories={categories as ItemCategory[]}
        onSuccess={(newCat) => {
          setValue('category_id', String(newCat.id), { shouldValidate: true })
        }}
      />

      <QuickAddTypeModal
        open={quickAddTypeOpen}
        onOpenChange={setQuickAddTypeOpen}
        onSuccess={(newType) => {
          setValue('item_type', newType.code, { shouldValidate: true })
          if (!editing) {
            fetchNextItemCode(newType.code)
              .then((r) => {
                if (r.data?.code) {
                  setValue('item_code', r.data.code, { shouldValidate: true })
                }
              })
              .catch(() => {})
          }
        }}
      />

      {/* Full Management Modals (opened from header buttons) */}
      <ManageCategoriesModal
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
      />

      <ManageUomsModal
        open={manageUomsOpen}
        onOpenChange={setManageUomsOpen}
      />

      <ManageItemTypesModal
        open={manageTypesOpen}
        onOpenChange={setManageTypesOpen}
      />
    </div>
  )
}
