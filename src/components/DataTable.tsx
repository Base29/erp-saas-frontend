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
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, X, SearchX } from 'lucide-react'
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
  emptyMessage = 'No results found.',
}: DataTableProps<TData>) {
  const isServerFiltered = Boolean(onFilterChange || onSearchChange)
  const totalPages = pagination && pagination.per_page > 0
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
    <div className="space-y-3">
      {(filterKey || toolbarExtra || onClearFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {filterKey && (
              <div className="relative w-full max-w-xs min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={filterPlaceholder}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm"
                />
                {localSearch && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
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
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left font-medium text-muted-foreground',
                        canSort && 'cursor-pointer select-none hover:text-foreground'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="ml-1">
                            {sorted === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : sorted === 'desc' ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-40" />
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
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading…</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  {isFiltered ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SearchX className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">No matching results found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search terms or clearing active filters.
                      </p>
                      {onClearFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onClearFilters}
                          className="mt-2 text-xs gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span>{emptyMessage}</span>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
