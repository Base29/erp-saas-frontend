import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Package,
  Settings,
  LogOut,
  Users,
  FileText,
  CreditCard,
  Target,
  RefreshCcw,
  PieChart,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  ChevronDown,
  Check,
  Blocks,
  Calendar,
  Percent,
  Network,
  ListOrdered,
  UserCog,
  UploadCloud,
  Search,
  FolderGit2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { tenantLogout } from '@/api/tenant'
import { canAccessSection, isModuleActive, ROLE_LABELS } from '@/utils/permissions'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { fetchCompanies, type Company } from '@/api/tenant'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GenieHeaderButton, GenieFloatingTrigger } from '@/components/genie/GenieTrigger'
import { GenieAssistantDrawer } from '@/components/genie/GenieAssistantDrawer'
import { useGenieStore } from '@/store/genieStore'

const navSections = [
  {
    section: null, // always visible
    moduleKey: null,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    icon: LayoutDashboard,
  },
  {
    section: 'accounts',
    moduleKey: 'accounts',
    items: [
      { to: '/accounts/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
      { to: '/accounts/journal-vouchers', label: 'Journal Vouchers', icon: BookOpen },
      { to: '/accounts/suppliers', label: 'Suppliers', icon: Users },
      { to: '/accounts/purchase-invoices', label: 'Purchase Invoices', icon: FileText },
      { to: '/accounts/supplier-payments', label: 'Supplier Payments', icon: CreditCard },
      { to: '/accounts/cost-centers', label: 'Cost Centers', icon: Target },
      { to: '/accounts/bank-reconciliation', label: 'Bank Reconciliation', icon: RefreshCcw },
      { to: '/accounts/budgets', label: 'Budgeting', icon: PieChart },
      { to: '/accounts/reports/general-ledger', label: 'General Ledger', icon: BookOpen },
      { to: '/accounts/reports/trial-balance', label: 'Trial Balance', icon: BookOpen },
      { to: '/accounts/reports/profit-and-loss', label: 'Profit & Loss', icon: BookOpen },
      { to: '/accounts/reports/balance-sheet', label: 'Balance Sheet', icon: BookOpen },
      { to: '/accounts/reports/cash-flow', label: 'Cash Flow', icon: BookOpen },
      { to: '/accounts/reports/equity-changes', label: 'Equity Changes', icon: BookOpen },
      { to: '/accounts/reports/customer-statement', label: 'Customer Statement', icon: BookOpen },
      { to: '/accounts/reports/supplier-statement', label: 'Supplier Statement', icon: BookOpen },
    ],
    groupLabel: 'Accounts',
    icon: BookOpen,
  },
  {
    section: 'sales',
    moduleKey: 'sales',
    items: [
      { to: '/sales/customers', label: 'Customers', icon: Users },
      { to: '/sales/price-lists', label: 'Price Lists', icon: ShoppingCart },
      { to: '/sales/quotations', label: 'Quotations', icon: FileText },
      { to: '/sales/orders', label: 'Sale Orders', icon: ShoppingCart },
      { to: '/sales/invoices', label: 'Invoices', icon: FileText },
      { to: '/sales/receipts', label: 'Receipts', icon: CreditCard },
      { to: '/sales/credit-notes', label: 'Credit Notes', icon: FileText },
      { to: '/sales/gate-passes', label: 'Gate Passes', icon: Package },
      { to: '/sales/reports', label: 'Reports', icon: BookOpen },
    ],
    groupLabel: 'Sales',
    icon: ShoppingCart,
  },
  {
    section: 'inventory',
    moduleKey: 'inventory',
    items: [
      { to: '/inventory/items', label: 'Items', icon: Package },
      { to: '/inventory/warehouses', label: 'Warehouses', icon: Building2 },
      { to: '/inventory/goods-receipts', label: 'Goods Receipts', icon: Package },
      { to: '/inventory/goods-issues', label: 'Goods Issues', icon: Package },
      { to: '/inventory/transfers', label: 'Stock Transfers', icon: RefreshCcw },
      { to: '/inventory/reports', label: 'Reports', icon: BookOpen },
    ],
    groupLabel: 'Inventory',
    icon: Package,
  },
  {
    section: 'projects',
    moduleKey: 'projects',
    items: [
      { to: '/projects', label: 'All Projects', icon: FolderGit2 },
    ],
    groupLabel: 'Projects',
    icon: FolderGit2,
  },
  {
    section: 'settings',
    moduleKey: null,
    items: [
      { to: '/settings', label: 'Overview', icon: Settings },
      { to: '/settings/companies', label: 'Companies', icon: Building2 },
      { to: '/settings/modules', label: 'Active Modules', icon: Blocks },
      { to: '/settings/fiscal', label: 'Fiscal Periods', icon: Calendar },
      { to: '/settings/tax', label: 'Tax Settings', icon: Percent },
      { to: '/settings/account-categories', label: 'Account Categories', icon: Network },
      { to: '/settings/sequences', label: 'Sequences', icon: ListOrdered },
      { to: '/settings/categories', label: 'Product Categories', icon: Package },
      { to: '/settings/customer-categories', label: 'Customer Categories', icon: Users },
      { to: '/settings/users', label: 'Users', icon: UserCog },
      { to: '/settings/data-migration', label: 'Bulk Upload & Migration', icon: UploadCloud },
    ],
    groupLabel: 'Settings',
    icon: Settings,
  },
]

export default function TenantLayout() {
  const { user, role, logout, setActiveModules, token, activeCompanyId, setActiveCompanyId } = useAuthStore()
  const { toggleOpen } = useGenieStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Accordion state: track which group labels are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navSections.forEach((section) => {
      if (section.groupLabel) {
        const isActive = section.items.some((item) => location.pathname.startsWith(item.to))
        if (isActive) {
          initial[section.groupLabel] = true
        }
      }
    })
    return initial
  })

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Re-fetch active modules on mount
  useEffect(() => {
    if (!token) return

    apiClient
      .get<{ data: string[] }>('/v1/settings/active-modules')
      .then((res) => setActiveModules(res.data.data ?? []))
      .catch(() => {})

    fetchCompanies()
      .then((res) => {
        const list = res.data.data ?? []
        setCompanies(list)
        if (!activeCompanyId && list.length > 0) {
          setActiveCompanyId(list[0].id)
        }
      })
      .catch(() => {})
  }, [token, activeCompanyId])

  useEffect(() => {
    if (activeCompanyId) {
      queryClient.invalidateQueries()
    }
  }, [activeCompanyId, queryClient])

  // Keyboard shortcut for Cmd+K / Ctrl+K to toggle Genie Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleOpen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleOpen])

  const activeCompany = companies.find((c) => c.id === activeCompanyId)

  const handleLogout = async () => {
    try {
      await tenantLogout()
    } catch {
      // ignore
    } finally {
      logout()
      navigate('/login')
    }
  }

  const SidebarContent = ({ collapsed = false, onNavItemClick = () => {} }) => (
    <>
      <div className={cn('h-16 px-4 border-b border-border/70 shrink-0 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed ? (
          <div className="flex items-center gap-2 px-1 overflow-hidden select-none">
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Genie{' '}
              <span className="bg-gradient-to-r from-primary via-indigo-500 to-purple-500 bg-clip-text text-transparent font-bold">
                Cloud
              </span>
            </span>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-base shadow-subtle select-none">
            G
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        {navSections.map((group, gi) => {
          if (group.section && !canAccessSection(role, group.section)) return null
          if (group.moduleKey && !isModuleActive(group.moduleKey)) return null

          const isExpanded = group.groupLabel ? expandedSections[group.groupLabel] : true

          return (
            <div key={gi} className="space-y-0.5">
              {group.groupLabel && !collapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection(group.groupLabel!)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors group select-none rounded-md"
                >
                  <span>{group.groupLabel}</span>
                  <ChevronDown
                    size={13}
                    className={cn('transition-transform duration-200 text-muted-foreground/60 group-hover:text-foreground', isExpanded ? 'rotate-0' : '-rotate-90')}
                  />
                </button>
              )}

              {collapsed && group.icon && (
                <div className="flex justify-center py-1">
                  <NavLink
                    to={group.items[0].to}
                    title={group.groupLabel || group.items[0].label}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center rounded-lg p-2.5 transition-all duration-150',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-subtle'
                          : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                      )
                    }
                  >
                    <group.icon className="h-4 w-4" />
                  </NavLink>
                </div>
              )}

              <div
                className={cn(
                  'space-y-0.5 overflow-hidden transition-all duration-200',
                  !isExpanded || collapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[1000px] opacity-100'
                )}
              >
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/settings' || to === '/dashboard'}
                    onClick={onNavItemClick}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-subtle font-semibold'
                          : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
                        collapsed && 'hidden'
                      )
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User & Logout Footer */}
      <div className={cn('p-3 border-t border-border/70 shrink-0 bg-card/50', collapsed && 'p-2 flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{role ? ROLE_LABELS[role] : user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              title="Logout"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background/50 overflow-hidden text-foreground relative">
      {/* Antigravity Atmospheric Mesh Orbs */}
      <div className="fixed -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl pointer-events-none -z-10 animate-pulse-slow" />
      <div className="fixed -bottom-32 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-3xl pointer-events-none -z-10 animate-float" />

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-white/40 dark:border-white/10 bg-card/75 dark:bg-card/50 backdrop-blur-2xl transition-all duration-300 relative select-none shadow-[4px_0_30px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.3)]',
          isCollapsed ? 'w-16' : 'w-56'
        )}
      >
        <SidebarContent collapsed={isCollapsed} />

        {/* Toggle Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute -right-3 top-5 h-6 w-6 rounded-full border border-border/80 shadow-subtle z-20 hidden lg:flex bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-transform active:scale-95"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </Button>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-card border-r border-border/70 z-50 transform transition-transform duration-300 lg:hidden flex flex-col shadow-xl',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute right-3 top-3 lg:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={18} />
          </Button>
        </div>
        <SidebarContent onNavItemClick={() => setIsMobileMenuOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Frosted Header */}
        <header className="glass-header h-14 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={18} />
            </Button>

            {/* Modern Company Switcher Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-background/60 hover:bg-accent/60 transition-all text-xs font-medium max-w-[210px] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Building2 size={12} />
                  </div>
                  <span className="truncate text-foreground font-semibold">
                    {activeCompany ? activeCompany.name : 'Select Company'}
                  </span>
                  <ChevronDown size={12} className="text-muted-foreground shrink-0 opacity-70 ml-auto" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 shadow-elevated">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Switch Company</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setActiveCompanyId(company.id)}
                    className="justify-between text-xs py-2 cursor-pointer"
                  >
                    <span className="truncate font-medium">{company.name}</span>
                    {activeCompanyId === company.id && <Check size={14} className="text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Search trigger button */}
            <button
              type="button"
              onClick={toggleOpen}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Ask Genie AI or Search...</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground border border-border/60">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 hidden sm:inline-flex border-border/70 hover:bg-accent text-foreground/80 hover:text-foreground"
              onClick={() => navigate('/data-migration')}
            >
              <UploadCloud className="h-3.5 w-3.5 text-primary" />
              <span>Bulk Upload</span>
            </Button>

            <GenieHeaderButton />
            <ThemeToggle />
            <NotificationBell />

            {/* User Pill / Profile */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/70">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                  {user?.name}
                </span>
                {role && (
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content with smooth animated transition */}
        <main key={location.pathname} className="flex-1 overflow-auto bg-muted/20 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Genie AI Assistant Floating Trigger & Drawer */}
      <GenieFloatingTrigger />
      <GenieAssistantDrawer />
    </div>
  )
}
