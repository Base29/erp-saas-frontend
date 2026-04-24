import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Package,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { tenantLogout } from '@/api/tenant'
import { canAccessSection, isModuleActive, ROLE_LABELS } from '@/utils/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import NotificationBell from '@/components/NotificationBell'
import apiClient from '@/api/client'
import { fetchCompanies, type Company } from '@/api/tenant'
import { Building2, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
      { to: '/accounts/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
      { to: '/accounts/journal-vouchers', label: 'Journal Vouchers', icon: BookOpen },
      { to: '/accounts/reports', label: 'Reports', icon: BookOpen },
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
  const [companies, setCompanies] = useState<Company[]>([])

  // Re-fetch active modules on mount so newly activated modules appear
  // without requiring a logout/login cycle.
  useEffect(() => {
    if (!token) return
    
    // Fetch active modules
    apiClient.get<{ data: string[] }>('/v1/settings/active-modules')
      .then((res) => setActiveModules(res.data.data ?? []))
      .catch(() => {})

    // Fetch companies
    fetchCompanies()
      .then((res) => {
        const list = res.data.data ?? []
        setCompanies(list)
        // Set default company if none selected
        if (!activeCompanyId && list.length > 0) {
          setActiveCompanyId(list[0].id)
        }
      })
      .catch(() => {})
  }, [token, activeCompanyId])

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r bg-card overflow-y-auto">
        <div className="px-6 py-5 border-b shrink-0">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Genie Cloud
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4">
          {navSections.map((group, gi) => {
            if (group.section && !canAccessSection(role, group.section)) return null
            // Hide module sections when the module is not active for this tenant
            if (group.moduleKey && !isModuleActive(group.moduleKey)) return null
            return (
              <div key={gi}>
                {group.groupLabel && (
                  <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.groupLabel}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-medium">
                  <Building2 size={16} className="text-primary" />
                  {activeCompany ? activeCompany.name : 'Select Company'}
                  <ChevronDown size={14} className="text-muted-foreground" />
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
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user?.name}</span>
              {role && (
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[role]}
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
