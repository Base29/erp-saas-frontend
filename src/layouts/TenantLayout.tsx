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
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { tenantLogout } from '@/api/tenant'
import { canAccessSection, isModuleActive, ROLE_LABELS } from '@/utils/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const navSections = [
  {
    section: null, // always visible
    moduleKey: null,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'accounts',
    moduleKey: 'accounts',
    items: [
      { to: '/accounts/chart-of-accounts',          label: 'Chart of Accounts', icon: BookOpen },
      { to: '/accounts/journal-vouchers',            label: 'Journal Vouchers',  icon: BookOpen },
      { to: '/accounts/suppliers',                  label: 'Suppliers',         icon: Users },
      { to: '/accounts/purchase-invoices',           label: 'Purchase Invoices',  icon: FileText },
      { to: '/accounts/supplier-payments',           label: 'Supplier Payments',  icon: CreditCard },
      { to: '/accounts/cost-centers',               label: 'Cost Centers',      icon: Target },
      { to: '/accounts/bank-reconciliation',         label: 'Bank Reconciliation', icon: RefreshCcw },
      { to: '/accounts/budgets',                    label: 'Budgeting',         icon: PieChart },
      { to: '/accounts/reports/general-ledger',      label: 'General Ledger',    icon: BookOpen },
      { to: '/accounts/reports/trial-balance',       label: 'Trial Balance',     icon: BookOpen },
      { to: '/accounts/reports/profit-and-loss',     label: 'Profit & Loss',     icon: BookOpen },
      { to: '/accounts/reports/balance-sheet',       label: 'Balance Sheet',     icon: BookOpen },
      { to: '/accounts/reports/cash-flow',           label: 'Cash Flow',         icon: BookOpen },
      { to: '/accounts/reports/equity-changes',      label: 'Equity Changes',    icon: BookOpen },
      { to: '/accounts/reports/customer-statement',  label: 'Customer Statement', icon: BookOpen },
    ],
    groupLabel: 'Accounts',
  },
  {
    section: 'sales',
    moduleKey: 'sales',
    items: [
      { to: '/sales/customers', label: 'Customers', icon: ShoppingCart },
      { to: '/sales/price-lists', label: 'Price Lists', icon: ShoppingCart },
      { to: '/sales/quotations', label: 'Quotations', icon: ShoppingCart },
      { to: '/sales/orders', label: 'Sale Orders', icon: ShoppingCart },
      { to: '/sales/invoices', label: 'Invoices', icon: ShoppingCart },
      { to: '/sales/receipts', label: 'Receipts', icon: ShoppingCart },
      { to: '/sales/credit-notes', label: 'Credit Notes', icon: ShoppingCart },
      { to: '/sales/gate-passes', label: 'Gate Passes', icon: ShoppingCart },
      { to: '/sales/reports', label: 'Reports', icon: ShoppingCart },
    ],
    groupLabel: 'Sales',
  },
  {
    section: 'inventory',
    moduleKey: 'inventory',
    items: [
      { to: '/inventory/items', label: 'Items', icon: Package },
      { to: '/inventory/warehouses', label: 'Warehouses', icon: Package },
      { to: '/inventory/goods-receipts', label: 'Goods Receipts', icon: Package },
      { to: '/inventory/goods-issues', label: 'Goods Issues', icon: Package },
      { to: '/inventory/transfers', label: 'Stock Transfers', icon: Package },
      { to: '/inventory/reports', label: 'Reports', icon: Package },
    ],
    groupLabel: 'Inventory',
  },
  {
    section: 'settings',
    moduleKey: null,
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
    groupLabel: 'Settings',
  },
]

export default function TenantLayout() {
  const { user, role, logout, setActiveModules, token, activeCompanyId, setActiveCompanyId } = useAuthStore()
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
    // By default, expand the section that contains the current path
    const initial: Record<string, boolean> = {}
    navSections.forEach(section => {
      if (section.groupLabel) {
        const isActive = section.items.some(item => location.pathname.startsWith(item.to))
        if (isActive) {
          initial[section.groupLabel] = true
        }
      }
    })
    return initial
  })

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Re-fetch active modules on mount
  useEffect(() => {
    if (!token) return
    
    apiClient.get<{ data: string[] }>('/v1/settings/active-modules')
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

  const activeCompany = companies.find(c => c.id === activeCompanyId)

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
      <div className={cn("px-6 py-5 border-b shrink-0 flex items-center justify-between", collapsed && "px-4 justify-center")}>
        {!collapsed && (
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider overflow-hidden text-nowrap">
            Genie Cloud
          </span>
        )}
        {collapsed && (
          <span className="text-xl font-bold text-primary">G</span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navSections.map((group, gi) => {
          if (group.section && !canAccessSection(role, group.section)) return null
          if (group.moduleKey && !isModuleActive(group.moduleKey)) return null
          
          const isExpanded = group.groupLabel ? expandedSections[group.groupLabel] : true

          return (
            <div key={gi} className="space-y-1">
              {group.groupLabel && !collapsed && (
                <button 
                  onClick={() => toggleSection(group.groupLabel!)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <span>{group.groupLabel}</span>
                  <ChevronDown 
                    size={12} 
                    className={cn("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")} 
                  />
                </button>
              )}
              
              <div 
                className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-300",
                  !isExpanded && !collapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
                )}
              >
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onNavItemClick}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        collapsed && "justify-center px-2"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className={cn("px-3 py-4 border-t shrink-0", collapsed && "px-2")}>
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start gap-3", collapsed && "justify-center")}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300 relative",
          isCollapsed ? "w-16" : "w-56"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
        
        {/* Toggle Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border shadow-sm z-10 hidden lg:flex"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </Button>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-card border-r z-50 transform transition-transform duration-300 lg:hidden flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-4 top-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </Button>
        </div>
        <SidebarContent onNavItemClick={() => setIsMobileMenuOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-medium max-w-[200px] truncate">
                  <Building2 size={16} className="text-primary shrink-0" />
                  <span className="truncate">{activeCompany ? activeCompany.name : 'Select Company'}</span>
                  <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setActiveCompanyId(company.id)}
                    className="justify-between"
                  >
                    {company.name}
                    {activeCompanyId === company.id && <Check size={14} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium hidden sm:inline-block">{user?.name}</span>
              {role && (
                <Badge variant="secondary" className="text-[10px] lg:text-xs">
                  {ROLE_LABELS[role]}
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


