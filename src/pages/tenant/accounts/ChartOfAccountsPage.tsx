import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Pencil,
  Upload,
  Search,
  X,
  FolderTree,
  Table as TableIcon,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Inbox,
} from 'lucide-react'
import BulkImportModal from '@/components/import/BulkImportModal'
import CategoryCombobox from '@/components/accounts/CategoryCombobox'
import {
  fetchAccounts,
  fetchAccountCategories,
  fetchNextAccountCode,
  createAccount,
  updateAccount,
  type Account,
  type AccountCategory,
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
import { useAuthStore } from '@/store/authStore'
import { canWrite } from '@/utils/permissions'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'

const accountSchema = z.object({
  account_code: z.string().min(1, 'Required'),
  account_name: z.string().min(1, 'Required'),
  account_category_id: z.string().min(1, 'Required'),
  is_active: z.boolean().default(true),
})

type AccountFormValues = z.infer<typeof accountSchema>

interface FilteredCategoryNode {
  category: AccountCategory
  accounts: Account[]
  children: FilteredCategoryNode[]
  totalAccountsInSubtree: number
}

export function formatAccountCode(code: string | null | undefined): string {
  if (!code) return ''
  const trimmed = code.trim()

  // If already formatted with hyphens (e.g. 20105-01-01, 5210-01-01, 5210-001)
  if (trimmed.includes('-')) {
    return `[${trimmed}]`
  }

  // If pure digits, format legacy/raw codes to [xxxxx-xx-xx]
  if (/^\d+$/.test(trimmed)) {
    // 9 digits: xxxxx + xx + xx -> [xxxxx-xx-xx]
    if (trimmed.length === 9) {
      return `[${trimmed.slice(0, 5)}-${trimmed.slice(5, 7)}-${trimmed.slice(7)}]`
    }
    // 7 digits: xxxxx + xx -> [xxxxx-01-xx]
    if (trimmed.length === 7) {
      return `[${trimmed.slice(0, 5)}-01-${trimmed.slice(5)}]`
    }
    // 6 digits: xxxxx + x (e.g. 201051, 201052) -> [xxxxx-01-0x] (e.g. [20105-01-01], [20105-01-02])
    if (trimmed.length === 6) {
      return `[${trimmed.slice(0, 5)}-01-0${trimmed.slice(5)}]`
    }
  }

  return `[${trimmed}]`
}

function filterCategoryTree(
  categories: AccountCategory[],
  searchQuery: string,
  targetCategoryId: string | null
): FilteredCategoryNode[] {
  const query = searchQuery.trim().toLowerCase()

  const processNode = (cat: AccountCategory): FilteredCategoryNode | null => {
    // If targetCategoryId is set, ensure this node is within the selected branch
    if (targetCategoryId && cat.id !== targetCategoryId && !isAncestorOf(cat, targetCategoryId)) {
      return null
    }

    const catMatches =
      !query ||
      cat.name.toLowerCase().includes(query) ||
      (cat.code ? cat.code.toLowerCase().includes(query) : false)

    const directAccounts = cat.accounts ?? []
    const matchingAccounts = query
      ? directAccounts.filter(
          (a) =>
            a.account_name.toLowerCase().includes(query) ||
            a.account_code.toLowerCase().includes(query)
        )
      : directAccounts

    const childNodes: FilteredCategoryNode[] = []
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        const processedChild = processNode(child)
        if (processedChild) {
          childNodes.push(processedChild)
        }
      }
    }

    // Keep node if category matches, or any account matches, or any child matches
    if (catMatches || matchingAccounts.length > 0 || childNodes.length > 0) {
      // If category itself matched, show all its direct accounts; otherwise show only matching ones
      const visibleAccounts = catMatches ? directAccounts : matchingAccounts
      const totalAccountsInSubtree =
        visibleAccounts.length +
        childNodes.reduce((acc, c) => acc + c.totalAccountsInSubtree, 0)

      return {
        category: cat,
        accounts: visibleAccounts,
        children: childNodes,
        totalAccountsInSubtree,
      }
    }

    return null
  }

  function isAncestorOf(parent: AccountCategory, targetId: string): boolean {
    if (!parent.children) return false
    for (const child of parent.children) {
      if (child.id === targetId || isAncestorOf(child, targetId)) {
        return true
      }
    }
    return false
  }

  // If a target category is selected, start search from that node
  let startCategories = categories
  if (targetCategoryId) {
    const findCategory = (cats: AccountCategory[]): AccountCategory | null => {
      for (const c of cats) {
        if (c.id === targetCategoryId) return c
        if (c.children) {
          const found = findCategory(c.children)
          if (found) return found
        }
      }
      return null
    }
    const foundTarget = findCategory(categories)
    if (foundTarget) {
      startCategories = [foundTarget]
    }
  }

  const results: FilteredCategoryNode[] = []
  for (const cat of startCategories) {
    const processed = processNode(cat)
    if (processed) {
      results.push(processed)
    }
  }

  return results
}

export default function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canEdit = canWrite(role, 'accounts')

  const [viewMode, setViewMode] = useState<'tree' | 'table'>('table')
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  // Flat accounts for Table View
  const { data, isLoading } = useQuery({
    queryKey: ['accounts', page, selectedCategoryId, search],
    queryFn: () =>
      fetchAccounts({
        page,
        ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
        ...(search ? { search } : {}),
      }).then((r) => r.data),
  })

  const accounts = data?.data ?? []

  // Hierarchical categories with nested accounts for Tree View
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['account-categories'],
    queryFn: () => fetchAccountCategories().then((r) => r.data.data),
  })

  const flatCategories = useMemo(() => {
    const flattened: Array<{
      id: string
      label: string
      depth: number
      name?: string | null
      code?: string | null
    }> = []
    const walk = (cats: AccountCategory[], prefix = '') => {
      cats.forEach((c) => {
        const label = prefix ? `${prefix} > ${c.name} [${c.code}]` : `${c.name} [${c.code}]`
        flattened.push({ id: c.id, label, depth: c.depth, name: c.name, code: c.code })
        if (c.children) walk(c.children, label)
      })
    }
    walk(categories)
    return flattened
  }, [categories])

  const categoryPathMap = useMemo(() => {
    const map = new Map<string, string>()
    flatCategories.forEach((c) => {
      map.set(c.id, c.label)
    })
    return map
  }, [flatCategories])

  // Expand all by default when categories are loaded
  useEffect(() => {
    if (categories.length > 0) {
      setExpandedIds((prev) => {
        if (prev.size === 0) {
          const allIds = new Set<string>()
          flatCategories.forEach((c) => allIds.add(c.id))
          return allIds
        }
        return prev
      })
    }
  }, [categories, flatCategories])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    const allIds = new Set<string>()
    flatCategories.forEach((c) => allIds.add(c.id))
    setExpandedIds(allIds)
  }

  const handleCollapseAll = () => {
    setExpandedIds(new Set())
  }

  const filteredTree = useMemo(() => {
    return filterCategoryTree(categories, search, selectedCategoryId)
  }, [categories, search, selectedCategoryId])

  const saveAccount = useMutation({
    mutationFn: (v: AccountFormValues) => {
      return editing ? updateAccount(editing.id, v) : createAccount(v)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['account-categories'] })
      setOpen(false)
      toast.success('Account saved successfully')
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({ resolver: zodResolver(accountSchema) })

  const openCreate = (categoryId?: string) => {
    setEditing(null)
    const initialCategoryId =
      categoryId ||
      selectedCategoryId ||
      (flatCategories.length > 0 ? flatCategories[0].id : '')
    reset({
      account_code: '',
      account_name: '',
      account_category_id: initialCategoryId,
      is_active: true,
    })
    setOpen(true)
    if (initialCategoryId) {
      fetchNextAccountCode(initialCategoryId)
        .then((r) => {
          if (r.data?.code) {
            setValue('account_code', r.data.code, { shouldValidate: true })
          }
        })
        .catch(() => {})
    }
  }

  const openEdit = (acc: Account) => {
    setEditing(acc)
    let code = acc.account_code
    if (/^\d{6}$/.test(code)) {
      code = `${code.slice(0, 5)}-01-0${code.slice(5)}`
    }
    reset({
      account_code: code,
      account_name: acc.account_name,
      account_category_id: acc.account_category_id,
      is_active: acc.is_active,
    })
    setOpen(true)
  }

  const columns: ColumnDef<Account>[] = [
    {
      accessorKey: 'account_code',
      header: 'Code',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {formatAccountCode(row.original.account_code)}
        </span>
      ),
    },
    {
      accessorKey: 'account_name',
      header: 'Name',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-sm">
          {row.original.account_name}
        </span>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const catId = row.original.account_category_id
        const fullPath = catId ? categoryPathMap.get(catId) : null
        const cat = row.original.account_category

        if (fullPath) {
          return (
            <span
              className="text-xs font-medium text-foreground truncate block max-w-[320px]"
              title={fullPath}
            >
              {fullPath}
            </span>
          )
        }

        return cat ? (
          <span className="text-xs font-medium text-foreground">
            {cat.name} <span className="font-mono text-muted-foreground">[{cat.code}]</span>
          </span>
        ) : (
          '—'
        )
      },
    },
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
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: Account } }) => (
              <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
          } as ColumnDef<Account>,
        ]
      : []),
  ]

  const totalVisibleTreeAccounts = useMemo(() => {
    return filteredTree.reduce((acc, node) => acc + node.totalAccountsInSubtree, 0)
  }, [filteredTree])

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your ledger accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Bulk Upload Accounts
              </Button>
              <Button size="sm" onClick={() => openCreate()}>
                <Plus className="h-4 w-4 mr-1" /> New Account
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Bar */}
          <div className="relative w-full max-w-xs min-w-[220px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search accounts or categories…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 pr-8 h-9 text-xs rounded-xl bg-card/70 border-border/70 backdrop-blur-md shadow-2xs focus-visible:ring-primary/25"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-all active:scale-95"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <CategoryCombobox
            value={selectedCategoryId}
            onChange={(v) => {
              setSelectedCategoryId(v)
              setPage(1)
            }}
            categories={flatCategories}
            includeAllOption={true}
            allOptionLabel="All Categories"
            className="w-[240px] sm:w-[280px]"
          />

          {/* View Mode Toggle: Tree vs Table */}
          <div className="flex items-center rounded-xl border border-border/70 bg-card/70 p-0.5 backdrop-blur-md shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                viewMode === 'tree'
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Hierarchical Tree View"
            >
              <FolderTree className="h-3.5 w-3.5" />
              Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Flat Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          {/* Tree-only Expand/Collapse all buttons */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExpandAll}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                title="Expand All Categories"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Expand All</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCollapseAll}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                title="Collapse All Categories"
              >
                <ChevronsDownUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Collapse All</span>
              </Button>
            </div>
          )}
        </div>

        {/* Clear filters button */}
        {(search || selectedCategoryId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setSelectedCategoryId(null)
              setPage(1)
            }}
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg active:scale-[0.97]"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Main View Area */}
      {viewMode === 'tree' ? (
        <div className="border rounded-xl bg-card/70 backdrop-blur-md shadow-sm overflow-hidden">
          {/* Tree Header Summary */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Hierarchy
              </span>
              <span className="text-xs text-muted-foreground">
                ({totalVisibleTreeAccounts} accounts visible)
              </span>
            </div>
          </div>

          {/* Tree Content */}
          <div className="p-3 sm:p-4">
            {categoriesLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading account hierarchy…
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {search || selectedCategoryId
                    ? 'No matching accounts or categories found'
                    : 'No accounts or categories defined yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {search || selectedCategoryId
                    ? 'Try clearing the search query or category filter to view the full hierarchy.'
                    : 'Create your account categories in Settings > Account Categories or click New Account above.'}
                </p>
                {(search || selectedCategoryId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs"
                    onClick={() => {
                      setSearch('')
                      setSelectedCategoryId(null)
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5 select-none">
                {filteredTree.map((node) => (
                  <CategoryTreeNode
                    key={node.category.id}
                    node={node}
                    depth={0}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    isSearchActive={Boolean(search.trim())}
                    canEdit={canEdit}
                    openCreate={openCreate}
                    openEdit={openEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          isLoading={isLoading}
          pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
          onPageChange={setPage}
          emptyMessage="No accounts found."
        />
      )}

      {/* Account Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveAccount.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <CategoryCombobox
                value={watch('account_category_id')}
                onChange={(v) => {
                  const catId = v || ''
                  setValue('account_category_id', catId, { shouldValidate: true })
                  if (catId && !editing) {
                    fetchNextAccountCode(catId)
                      .then((r) => {
                        if (r.data?.code) {
                          setValue('account_code', r.data.code, { shouldValidate: true })
                        }
                      })
                      .catch(() => {})
                  }
                }}
                categories={flatCategories}
                placeholder="Select category…"
                includeAllOption={false}
                className="w-full"
              />
              {errors.account_category_id && (
                <p className="text-xs text-destructive">{errors.account_category_id.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="ac-code">Account Code</Label>
                {!editing && watch('account_category_id') && (
                  <span className="text-[10px] text-muted-foreground">Auto-sequenced</span>
                )}
              </div>
              <Input id="ac-code" {...register('account_code')} placeholder="e.g. 20105-01-01" />
              {errors.account_code && (
                <p className="text-xs text-destructive">{errors.account_code.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ac-name">Account Name</Label>
              <Input id="ac-name" {...register('account_name')} placeholder="e.g. Cash in Hand" />
              {errors.account_name && (
                <p className="text-xs text-destructive">{errors.account_name.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ac-active"
                type="checkbox"
                className="h-4 w-4 rounded border"
                {...register('is_active')}
              />
              <Label htmlFor="ac-active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || saveAccount.isPending}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        type="accounts"
        title="Import Chart of Accounts"
        description="Upload CSV to import ledger account codes, categories, tax settings, and opening balances."
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['accounts'] })
          qc.invalidateQueries({ queryKey: ['account-categories'] })
        }}
      />
    </div>
  )
}

function CategoryTreeNode({
  node,
  depth,
  expandedIds,
  toggleExpand,
  isSearchActive,
  canEdit,
  openCreate,
  openEdit,
}: {
  node: FilteredCategoryNode
  depth: number
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  isSearchActive: boolean
  canEdit: boolean
  openCreate: (categoryId?: string) => void
  openEdit: (acc: Account) => void
}) {
  const { category, accounts, children, totalAccountsInSubtree } = node
  const hasContent = accounts.length > 0 || children.length > 0
  const isExpanded = isSearchActive || expandedIds.has(category.id)

  return (
    <div className="space-y-0.5">
      {/* Category Row */}
      <div
        className="flex items-center group py-1.5 pr-2.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/40 transition-colors"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        <button
          type="button"
          onClick={() => toggleExpand(category.id)}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground mr-1 transition-colors"
          disabled={!hasContent}
        >
          {hasContent ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer py-0.5"
          onClick={() => hasContent && toggleExpand(category.id)}
        >
          {hasContent && isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-primary/70 shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            [{category.code}]
          </span>
          <span className="text-sm font-semibold text-foreground truncate">
            {category.name}
          </span>
          {totalAccountsInSubtree > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/40 shrink-0">
              {totalAccountsInSubtree} {totalAccountsInSubtree === 1 ? 'account' : 'accounts'}
            </span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                openCreate(category.id)
              }}
              title={`Add Account to ${category.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Account</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Sub-items (Direct Accounts & Child Categories) */}
      {isExpanded && (
        <div className="space-y-0.5">
          {/* Direct Accounts */}
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center group py-1.5 pr-2.5 rounded-lg hover:bg-muted/40 border border-transparent hover:border-border/30 transition-colors"
              style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span className="font-mono text-xs font-semibold text-primary shrink-0">
                  {formatAccountCode(acc.account_code)}
                </span>
                <span className="text-sm font-medium text-foreground truncate">
                  {acc.account_name}
                </span>
                <Badge
                  variant={acc.is_active ? 'success' : 'secondary'}
                  className="text-[10px] h-4 px-1.5 ml-1 shrink-0"
                >
                  {acc.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {canEdit && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEdit(acc)}
                    title="Edit Account"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Child Categories */}
          {children.map((childNode) => (
            <CategoryTreeNode
              key={childNode.category.id}
              node={childNode}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              isSearchActive={isSearchActive}
              canEdit={canEdit}
              openCreate={openCreate}
              openEdit={openEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

