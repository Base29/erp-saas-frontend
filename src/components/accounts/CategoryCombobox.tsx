import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, ChevronDown, Check, X, Folder, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'

export interface CategoryOption {
  id: string
  label: string
  depth?: number
  name?: string | null
  code?: string | null
}

interface CategoryComboboxProps {
  value?: string | null
  onChange: (val: string | null) => void
  categories: CategoryOption[]
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  includeAllOption?: boolean
  allOptionLabel?: string
  className?: string
  align?: 'start' | 'end' | 'center'
}

export default function CategoryCombobox({
  value,
  onChange,
  categories,
  placeholder = 'Select category…',
  disabled,
  isLoading,
  includeAllOption = false,
  allOptionLabel = 'All Categories',
  className,
  align = 'start',
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isAllSelected = !value || value === 'all'

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(value)),
    [categories, value]
  )

  const showAllInList = useMemo(() => {
    if (!includeAllOption) return false
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return allOptionLabel.toLowerCase().includes(q) || 'all'.includes(q)
  }, [includeAllOption, search, allOptionLabel])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase().trim()
    return categories.filter((c) => {
      const label = (c.label || '').toLowerCase()
      const name = (c.name || '').toLowerCase()
      const code = (c.code || '').toLowerCase()
      return label.includes(q) || name.includes(q) || code.includes(q)
    })
  }, [categories, search])

  // Total items in list (including "All Categories" if visible)
  const totalItems = (showAllInList ? 1 : 0) + filteredCategories.length

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, totalItems - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showAllInList && selectedIndex === 0) {
        onChange(null)
        setOpen(false)
        return
      }
      const catIdx = showAllInList ? selectedIndex - 1 : selectedIndex
      if (filteredCategories[catIdx]) {
        onChange(String(filteredCategories[catIdx].id))
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-background/70 backdrop-blur-md px-3 py-1.5 text-xs font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-left transition-all duration-150 shadow-xs',
            isAllSelected && !includeAllOption && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate min-w-0 pr-1">
            {isLoading ? (
              <span className="text-muted-foreground">Loading categories…</span>
            ) : isAllSelected && includeAllOption ? (
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{allOptionLabel}</span>
              </span>
            ) : selectedCategory ? (
              <span className="flex items-center gap-1.5 truncate text-foreground font-medium" title={selectedCategory.label}>
                <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="truncate">{selectedCategory.label}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {includeAllOption && !isAllSelected && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(null)
                  }
                }}
                className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="w-[320px] sm:w-[420px] p-2 bg-popover/90 backdrop-blur-2xl border border-border/70 rounded-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] z-50"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border border-border/70 rounded-xl px-2.5 py-1.5 bg-background/80 backdrop-blur-md gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search categories by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
          {search && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSearch('')
                inputRef.current?.focus()
              }}
              className="text-muted-foreground hover:text-foreground text-xs p-0.5 rounded-md hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Count & Info Bar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] text-muted-foreground font-semibold border-b border-border/50 uppercase tracking-wider my-1">
          <span>
            {search.trim()
              ? `${filteredCategories.length} matching ${filteredCategories.length === 1 ? 'category' : 'categories'}`
              : `${categories.length} categories available`}
          </span>
          <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">Use ↑↓ keys + Enter</span>
        </div>

        {/* Scrollable Results List */}
        <div
          ref={listRef}
          role="listbox"
          className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5"
          tabIndex={-1}
        >
          {isLoading ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Loading categories…</div>
          ) : totalItems === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No matching categories found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            <>
              {/* Optional "All Categories" option */}
              {showAllInList && (
                <div
                  role="option"
                  aria-selected={isAllSelected}
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(0)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer select-none transition-all duration-150',
                    isAllSelected && 'bg-primary/10 text-primary font-semibold',
                    selectedIndex === 0 && !isAllSelected && 'bg-accent/80 text-accent-foreground',
                    selectedIndex !== 0 && !isAllSelected && 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">{allOptionLabel}</span>
                  </div>
                  {isAllSelected && <Check className="h-4 w-4 shrink-0 text-primary ml-2" />}
                </div>
              )}

              {/* Categorised Items */}
              {filteredCategories.map((c, idx) => {
                const itemIndex = showAllInList ? idx + 1 : idx
                const isSelected = String(c.id) === String(value)
                const isHighlighted = itemIndex === selectedIndex
                const depthIndent = c.depth && c.depth > 1 ? Math.min(c.depth - 1, 4) * 8 : 0

                return (
                  <div
                    key={c.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(String(c.id))
                      setOpen(false)
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    style={{ paddingLeft: `${10 + depthIndent}px` }}
                    className={cn(
                      'flex items-center justify-between pr-2.5 py-2 rounded-xl text-xs cursor-pointer select-none transition-all duration-150',
                      isSelected && 'bg-primary/10 text-primary font-semibold',
                      isHighlighted && !isSelected && 'bg-accent/80 text-accent-foreground',
                      !isHighlighted && !isSelected && 'hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <div className="truncate min-w-0">
                        <span className="truncate block font-medium text-foreground">{c.label}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary ml-2" />}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
