import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  SearchX,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface PaginationState {
  page: number
  per_page: number
  total: number
}

export interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  data: TData[]
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  onSortChange?: (sort_by: string, sort_dir: 'asc' | 'desc') => void
  onFilterChange?: (filters: Record<string, string>) => void
  onSearchChange?: (search: string) => void
  searchValue?: string
  isLoading?: boolean
  filterPlaceholder?: string
  filterKey?: string
  toolbarExtra?: React.ReactNode
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  emptyMessage?: string
}

export default function DataTable<TData>({
  columns,
  data,
  pagination,
  onPageChange,
  onSortChange,
  onFilterChange,
  onSearchChange,
  searchValue,
  isLoading,
  filterPlaceholder = 'Search…',
  filterKey,
  toolbarExtra,
  hasActiveFilters,
  onClearFilters,
  emptyMessage = 'No records found.',
}: DataTableProps<TData>) {
  const isServerFiltered = Boolean(onFilterChange || onSearchChange)
  const totalPages =
    pagination && pagination.per_page > 0
      ? Math.ceil(pagination.total / pagination.per_page)
      : 1
  const currentPage = pagination?.page ?? 1

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [localSearch, setLocalSearch] = useState(searchValue ?? '')
  const [globalFilter, setGlobalFilter] = useState(searchValue ?? '')

  // Keep local search in sync with external searchValue prop
  useEffect(() => {
    if (searchValue !== undefined && searchValue !== localSearch) {
      setLocalSearch(searchValue)
    }
  }, [searchValue])

  // Debounced notification to parent for server-side search
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!isServerFiltered) {
      // Client-side filtering via TanStack
      if (filterKey) {
        setColumnFilters(localSearch ? [{ id: filterKey, value: localSearch }] : [])
      } else {
        setGlobalFilter(localSearch)
      }
      return
    }

    const timer = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(localSearch)
      }
      if (filterKey && onFilterChange) {
        onFilterChange({ [filterKey]: localSearch })
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [localSearch, isServerFiltered, filterKey, onSearchChange, onFilterChange])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    manualPagination: Boolean(pagination),
    pageCount: totalPages,
    manualSorting: Boolean(onSortChange),
    manualFiltering: isServerFiltered,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: !isServerFiltered ? getFilteredRowModel() : undefined,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      if (next.length > 0 && onSortChange) {
        onSortChange(next[0].id, next[0].desc ? 'desc' : 'asc')
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
  })

  const handleClear = () => {
    setLocalSearch('')
    if (onSearchChange) {
      onSearchChange('')
    }
    if (filterKey && onFilterChange) {
      onFilterChange({ [filterKey]: '' })
    }
    if (onClearFilters) {
      onClearFilters()
    }
  }

  const isFiltered = Boolean(hasActiveFilters || localSearch.trim())

  return (
    <div className="space-y-4">
      {(filterKey || toolbarExtra || onClearFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {filterKey && (
              <div className="relative w-full max-w-xs min-w-[220px] group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder={filterPlaceholder}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs rounded-xl bg-card/70 border-border/70 backdrop-blur-md shadow-2xs focus-visible:ring-primary/25"
                />
                {localSearch && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-all active:scale-95"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {toolbarExtra}
          </div>

          {isFiltered && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg active:scale-[0.97]"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Table Glass Container with Diffused Ambient Shadow */}
      <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/85 backdrop-blur-xl shadow-elevated transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead className="bg-muted/40 backdrop-blur-md border-b border-border/70">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'px-4 py-3.5 text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground/80 select-none transition-colors',
                          canSort && 'cursor-pointer hover:text-foreground'
                        )}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="shrink-0 transition-transform duration-200">
                              {sorted === 'asc' ? (
                                <ChevronUp className="h-3.5 w-3.5 text-primary" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ChevronsUpDown className="h-3.5 w-3.5 opacity-30 hover:opacity-70 transition-opacity" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                // Smooth pulsating glass skeletons
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-4">
                        <div className="h-4 bg-muted/60 rounded-md w-3/4 backdrop-blur-sm" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center text-muted-foreground">
                    {isFiltered ? (
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                        <div className="h-11 w-11 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground shadow-subtle mb-1">
                          <SearchX className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-sm text-foreground">No matching results found</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Try adjusting your search terms or clearing active filters.
                        </p>
                        {onClearFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearFilters}
                            className="mt-2 text-xs gap-1.5 rounded-xl border-border/70 hover:bg-muted/60"
                          >
                            <X className="h-3.5 w-3.5" />
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="h-11 w-11 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/60 shadow-subtle mb-1">
                          <Inbox className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium">{emptyMessage}</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-primary/[0.03] transition-colors duration-200 group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 text-foreground/90 tabular-nums">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer with Ambient Pill Contrast */}
      {pagination && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1.5">
          <span className="font-medium">
            Page <span className="text-foreground font-semibold">{currentPage}</span> of{' '}
            <span className="text-foreground font-semibold">{totalPages}</span> ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-border/70 active:scale-[0.97]"
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-border/70 active:scale-[0.97]"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
