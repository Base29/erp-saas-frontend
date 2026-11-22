import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'

export interface SearchableSelectOption {
  value: string
  label: string
  sublabel?: string
  badge?: string
  disabled?: boolean
}

export interface SearchableSelectProps {
  value?: string | null
  onValueChange?: (value: string) => void
  onChange?: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  isLoading?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  align?: 'start' | 'end' | 'center'
  id?: string
  clearable?: boolean
}

export default function SearchableSelect({
  value,
  onValueChange,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  isLoading,
  className,
  triggerClassName,
  contentClassName,
  align = 'start',
  id,
  clearable = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (val: string) => {
    if (onValueChange) onValueChange(val)
    if (onChange) onChange(val)
    setOpen(false)
  }

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter((opt) => {
      const label = (opt.label || '').toLowerCase()
      const sub = (opt.sublabel || '').toLowerCase()
      const badge = (opt.badge || '').toLowerCase()
      const val = (opt.value || '').toLowerCase()
      return label.includes(q) || sub.includes(q) || badge.includes(q) || val.includes(q)
    })
  }, [options, search])

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
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredOptions.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[selectedIndex] && !filteredOptions[selectedIndex].disabled) {
        handleSelect(filteredOptions[selectedIndex].value)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-background/70 backdrop-blur-md px-3 py-1.5 text-xs font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-left transition-all duration-150 shadow-xs',
            !selectedOption && 'text-muted-foreground',
            triggerClassName || className
          )}
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            {isLoading ? (
              <span className="text-muted-foreground">Loading…</span>
            ) : selectedOption ? (
              <>
                <span className="truncate text-foreground font-semibold">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary shrink-0 font-medium">
                    {selectedOption.badge}
                  </span>
                )}
                {selectedOption.sublabel && (
                  <span className="text-muted-foreground text-[10px] truncate hidden md:inline">
                    {selectedOption.sublabel}
                  </span>
                )}
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {clearable && selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    handleSelect('')
                  }
                }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className={cn(
          'w-[var(--radix-dropdown-menu-trigger-width,260px)] min-w-[200px] max-w-[500px] p-2 bg-popover/95 backdrop-blur-2xl border border-border/70 rounded-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] z-50',
          contentClassName
        )}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border border-border/70 rounded-xl px-2.5 py-1.5 bg-background/80 backdrop-blur-md gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder}
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
              ? `${filteredOptions.length} matching`
              : `${options.length} options`}
          </span>
          <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">Use ↑↓ keys + Enter</span>
        </div>

        {/* Scrollable Results List */}
        <div
          ref={listRef}
          className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5"
          tabIndex={-1}
        >
          {isLoading ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Loading…</div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No matching options found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value)
              const isHighlighted = idx === selectedIndex

              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (!opt.disabled) handleSelect(opt.value)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs select-none transition-all duration-150',
                    opt.disabled && 'opacity-50 cursor-not-allowed',
                    !opt.disabled && 'cursor-pointer',
                    isSelected && 'bg-primary/10 text-primary font-semibold',
                    isHighlighted && !isSelected && 'bg-accent/80 text-accent-foreground',
                    !isHighlighted && !isSelected && 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="truncate min-w-0">
                      <span className="truncate block font-medium text-foreground">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-2" />}
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
