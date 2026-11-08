import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, ChevronDown, Check, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Account } from '@/api/tenant'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'

interface AccountComboboxProps {
  value?: string
  onChange: (val: string) => void
  accounts: Account[]
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  filterType?: 'expense' | 'asset' | 'all'
  className?: string
}

export default function AccountCombobox({
  value,
  onChange,
  accounts,
  placeholder = 'Select account…',
  disabled,
  isLoading,
  filterType = 'all',
  className,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(value)),
    [accounts, value]
  )

  const baseAccounts = useMemo(() => {
    if (filterType === 'expense') {
      return accounts.filter((a) => {
        const catName = a.account_category?.name?.toLowerCase() || ''
        const code = a.account_code || ''
        return (
          catName.includes('expense') ||
          catName.includes('cost') ||
          catName.includes('operating') ||
          catName.includes('overhead') ||
          code.startsWith('5') ||
          code.startsWith('6') ||
          code.startsWith('2')
        )
      })
    }
    if (filterType === 'asset') {
      return accounts.filter((a) => {
        const catName = a.account_category?.name?.toLowerCase() || ''
        const code = a.account_code || ''
        return catName.includes('asset') || code.startsWith('1') || code.startsWith('3')
      })
    }
    return accounts
  }, [accounts, filterType])

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return baseAccounts
    const q = search.toLowerCase().trim()
    return baseAccounts.filter((a) => {
      const code = (a.account_code || '').toLowerCase()
      const name = (a.account_name || '').toLowerCase()
      const cat = (a.account_category?.name || '').toLowerCase()
      return code.includes(q) || name.includes(q) || cat.includes(q)
    })
  }, [baseAccounts, search])

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
      setSelectedIndex((prev) => Math.min(prev + 1, filteredAccounts.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredAccounts[selectedIndex]) {
        onChange(String(filteredAccounts[selectedIndex].id))
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-background/70 backdrop-blur-md px-3 py-1.5 text-xs font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-left transition-all duration-150 shadow-xs',
            !selectedAccount && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            {isLoading ? (
              <span className="text-muted-foreground">Loading accounts…</span>
            ) : selectedAccount ? (
              <>
                <span className="font-mono font-bold text-primary shrink-0">
                  {selectedAccount.account_code}
                </span>
                <span className="truncate text-foreground font-semibold">
                  {selectedAccount.account_name}
                </span>
                {selectedAccount.account_category && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary shrink-0 font-medium">
                    {selectedAccount.account_category.name}
                  </span>
                )}
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-2" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[360px] sm:w-[420px] p-2 bg-popover/90 backdrop-blur-2xl border border-border/70 rounded-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] z-50"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border border-border/70 rounded-xl px-2.5 py-1.5 bg-background/80 backdrop-blur-md gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              filterType === 'expense'
                ? 'Search expense by code or name (e.g. 5210, Utilities)…'
                : 'Search accounts by code, name, category…'
            }
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
              ? `${filteredAccounts.length} matching ${filteredAccounts.length === 1 ? 'account' : 'accounts'}`
              : `${baseAccounts.length} accounts available`}
          </span>
          <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">Use ↑↓ keys + Enter</span>
        </div>

        {/* Scrollable Results List */}
        <div
          ref={listRef}
          className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5"
          tabIndex={-1}
        >
          {isLoading ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Loading accounts…</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No matching accounts found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredAccounts.map((a, idx) => {
              const isSelected = String(a.id) === String(value)
              const isHighlighted = idx === selectedIndex

              return (
                <div
                  key={a.id}
                  onClick={() => {
                    onChange(String(a.id))
                    setOpen(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer select-none transition-all duration-150',
                    isSelected && 'bg-primary/10 text-primary font-semibold',
                    isHighlighted && !isSelected && 'bg-accent/80 text-accent-foreground',
                    !isHighlighted && !isSelected && 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="font-mono font-bold text-primary shrink-0 w-16">
                      {a.account_code}
                    </span>
                    <div className="truncate min-w-0">
                      <span className="truncate block font-medium text-foreground">{a.account_name}</span>
                      {a.account_category && (
                        <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Tag className="h-2.5 w-2.5 shrink-0 opacity-60" />
                          {a.account_category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary ml-2" />}
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
