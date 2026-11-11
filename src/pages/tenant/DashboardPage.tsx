import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary, type Activity } from '@/api/tenant'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertCircle,
  FileText,
  ArrowRight,
  Building2,
  UploadCloud,
  ChevronRight,
  BookOpen,
  Users,
  Target,
  RefreshCcw,
  PieChart,
  FolderGit2,
  Settings,
  Plus,
  Search,
  Activity as ActivityIcon,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Link } from 'react-router-dom'
import { ROLE_LABELS } from '@/utils/permissions'

type TileCategory = 'all' | 'accounts' | 'sales' | 'inventory' | 'projects' | 'settings'

interface QuickAccessTile {
  id: string
  title: string
  description: string
  to: string
  actionLabel?: string
  actionTo?: string
  category: 'accounts' | 'sales' | 'inventory' | 'projects' | 'settings'
  icon: React.ComponentType<{ className?: string }>
  colorScheme: {
    bg: string
    text: string
    borderHover: string
    glow: string
  }
}

const QUICK_ACCESS_TILES: QuickAccessTile[] = [
  // Accounts & Finance
  {
    id: 'journal-vouchers',
    title: 'Journal Vouchers',
    description: 'Create & review double-entry vouchers',
    to: '/accounts/journal-vouchers',
    actionLabel: '+ Entry',
    actionTo: '/accounts/journal-vouchers/new',
    category: 'accounts',
    icon: FileText,
    colorScheme: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      borderHover: 'hover:border-blue-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(59,130,246,0.25)]',
    },
  },
  {
    id: 'chart-of-accounts',
    title: 'Chart of Accounts',
    description: 'Hierarchical general ledger & codes',
    to: '/accounts/chart-of-accounts',
    category: 'accounts',
    icon: BookOpen,
    colorScheme: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(16,185,129,0.25)]',
    },
  },
  {
    id: 'suppliers-payables',
    title: 'Suppliers & Payables',
    description: 'Vendor statements & payment orders',
    to: '/accounts/suppliers',
    actionLabel: 'Bills',
    actionTo: '/accounts/purchase-invoices',
    category: 'accounts',
    icon: Users,
    colorScheme: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      borderHover: 'hover:border-indigo-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(99,102,241,0.25)]',
    },
  },
  {
    id: 'bank-reconciliation',
    title: 'Bank Reconciliation',
    description: 'Reconcile statements with ledger',
    to: '/accounts/bank-reconciliation',
    category: 'accounts',
    icon: RefreshCcw,
    colorScheme: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      text: 'text-cyan-600 dark:text-cyan-400',
      borderHover: 'hover:border-cyan-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(6,182,212,0.25)]',
    },
  },
  {
    id: 'financial-reports',
    title: 'Financial Reports',
    description: 'Profit & Loss, Balance Sheet, Ledger',
    to: '/accounts/reports/profit-and-loss',
    category: 'accounts',
    icon: PieChart,
    colorScheme: {
      bg: 'bg-teal-500/10 dark:bg-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
      borderHover: 'hover:border-teal-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(20,184,166,0.25)]',
    },
  },
  {
    id: 'budgets',
    title: 'Budgets & Cost Centers',
    description: 'Allocation caps and variance monitoring',
    to: '/accounts/budgets',
    category: 'accounts',
    icon: Target,
    colorScheme: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      borderHover: 'hover:border-violet-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(139,92,246,0.25)]',
    },
  },

  // Sales & Orders
  {
    id: 'sale-orders',
    title: 'Sale Orders',
    description: 'Fulfill & process commercial orders',
    to: '/sales/orders',
    actionLabel: '+ Order',
    actionTo: '/sales/orders/new',
    category: 'sales',
    icon: ShoppingCart,
    colorScheme: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(245,158,11,0.25)]',
    },
  },
  {
    id: 'customers',
    title: 'Customers Directory',
    description: 'Client profiles, ledgers & terms',
    to: '/sales/customers',
    actionLabel: '+ Client',
    actionTo: '/sales/customers/new',
    category: 'sales',
    icon: Users,
    colorScheme: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      borderHover: 'hover:border-purple-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(168,85,247,0.25)]',
    },
  },
  {
    id: 'quotations',
    title: 'Quotations & Bids',
    description: 'Prepare quotes & track customer approval',
    to: '/sales/quotations',
    category: 'sales',
    icon: FileText,
    colorScheme: {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      borderHover: 'hover:border-orange-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(249,115,22,0.25)]',
    },
  },
  {
    id: 'sale-invoices',
    title: 'Sales Invoices',
    description: 'Issue tax invoices & billing records',
    to: '/sales/invoices',
    category: 'sales',
    icon: FileText,
    colorScheme: {
      bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      borderHover: 'hover:border-yellow-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(234,179,8,0.25)]',
    },
  },
  {
    id: 'receipts',
    title: 'Customer Receipts',
    description: 'Record incoming payments & receipts',
    to: '/sales/receipts',
    category: 'sales',
    icon: DollarSign,
    colorScheme: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(16,185,129,0.25)]',
    },
  },
  {
    id: 'price-lists',
    title: 'Price Lists',
    description: 'Manage pricing tiers and customer rates',
    to: '/sales/price-lists',
    category: 'sales',
    icon: ShoppingCart,
    colorScheme: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      borderHover: 'hover:border-rose-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(244,63,94,0.25)]',
    },
  },

  // Inventory & Operations
  {
    id: 'inventory-items',
    title: 'Items & Products',
    description: 'Catalog SKUs, prices & stock levels',
    to: '/inventory/items',
    actionLabel: '+ Item',
    actionTo: '/inventory/items/new',
    category: 'inventory',
    icon: Package,
    colorScheme: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(16,185,129,0.25)]',
    },
  },
  {
    id: 'warehouses',
    title: 'Warehouses',
    description: 'Manage storage depots & bin locations',
    to: '/inventory/warehouses',
    category: 'inventory',
    icon: Building2,
    colorScheme: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      borderHover: 'hover:border-blue-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(59,130,246,0.25)]',
    },
  },
  {
    id: 'goods-receipts',
    title: 'Goods Receipts (GRN)',
    description: 'Receive inward deliveries from vendors',
    to: '/inventory/goods-receipts',
    category: 'inventory',
    icon: Package,
    colorScheme: {
      bg: 'bg-teal-500/10 dark:bg-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
      borderHover: 'hover:border-teal-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(20,184,166,0.25)]',
    },
  },
  {
    id: 'stock-transfers',
    title: 'Stock Transfers',
    description: 'Relocate items between facilities',
    to: '/inventory/transfers',
    category: 'inventory',
    icon: RefreshCcw,
    colorScheme: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      borderHover: 'hover:border-violet-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(139,92,246,0.25)]',
    },
  },
  {
    id: 'inventory-reports',
    title: 'Inventory Reports',
    description: 'Valuation, stock movement & reorder alerts',
    to: '/inventory/reports',
    category: 'inventory',
    icon: BookOpen,
    colorScheme: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      borderHover: 'hover:border-indigo-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(99,102,241,0.25)]',
    },
  },

  // Projects
  {
    id: 'all-projects',
    title: 'Projects Board',
    description: 'Track project costs, milestones & status',
    to: '/projects',
    category: 'projects',
    icon: FolderGit2,
    colorScheme: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/20',
      text: 'text-sky-600 dark:text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(14,165,233,0.25)]',
    },
  },

  // Settings & Administration
  {
    id: 'companies-settings',
    title: 'Companies & Branches',
    description: 'Multi-entity corporate identities',
    to: '/settings/companies',
    category: 'settings',
    icon: Building2,
    colorScheme: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/20',
      text: 'text-slate-600 dark:text-slate-400',
      borderHover: 'hover:border-slate-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(100,116,139,0.25)]',
    },
  },
  {
    id: 'bulk-migration',
    title: 'Bulk Data Migration',
    description: 'Import accounts, items & legacy data',
    to: '/settings/data-migration',
    category: 'settings',
    icon: UploadCloud,
    colorScheme: {
      bg: 'bg-primary/10 dark:bg-primary/20',
      text: 'text-primary',
      borderHover: 'hover:border-primary/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(99,102,241,0.25)]',
    },
  },
  {
    id: 'users-settings',
    title: 'Users & Permissions',
    description: 'Role-based access & credentials',
    to: '/settings/users',
    category: 'settings',
    icon: Users,
    colorScheme: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      borderHover: 'hover:border-violet-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(139,92,246,0.25)]',
    },
  },
  {
    id: 'fiscal-periods',
    title: 'Fiscal Periods',
    description: 'Open, monitor & close fiscal periods',
    to: '/settings/fiscal',
    category: 'settings',
    icon: Settings,
    colorScheme: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      glow: 'group-hover:shadow-[0_12px_30px_-8px_rgba(245,158,11,0.25)]',
    },
  },
]

export default function TenantDashboardPage() {
  const { user, role } = useAuthStore()

  const [tileCategory, setTileCategory] = useState<TileCategory>('all')
  const [tileSearch, setTileSearch] = useState('')
  const [happeningsFilter, setHappeningsFilter] = useState<'all' | 'sales' | 'finance' | 'inventory'>('all')
  const [happeningsSearch, setHappeningsSearch] = useState('')

  const { data: summary, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await fetchDashboardSummary()
      return response.data
    },
  })

  // Filter Quick Access Tiles based on Category and Search
  const filteredTiles = useMemo(() => {
    return QUICK_ACCESS_TILES.filter((tile) => {
      const matchesCategory = tileCategory === 'all' || tile.category === tileCategory
      const query = tileSearch.toLowerCase().trim()
      const matchesSearch =
        !query ||
        tile.title.toLowerCase().includes(query) ||
        tile.description.toLowerCase().includes(query) ||
        (tile.actionLabel && tile.actionLabel.toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })
  }, [tileCategory, tileSearch])

  // Filter Latest Happenings based on Tab & Search
  const recentActivities: Activity[] = summary?.recent_activities || []
  const filteredHappenings = useMemo(() => {
    return recentActivities.filter((act) => {
      let matchesType = true
      const lowerType = act.type.toLowerCase()
      if (happeningsFilter === 'sales') {
        matchesType = lowerType.includes('sale') || lowerType.includes('order') || lowerType.includes('quotation') || lowerType.includes('customer')
      } else if (happeningsFilter === 'finance') {
        matchesType = lowerType.includes('receipt') || lowerType.includes('voucher') || lowerType.includes('invoice') || lowerType.includes('payment') || lowerType.includes('account')
      } else if (happeningsFilter === 'inventory') {
        matchesType = lowerType.includes('item') || lowerType.includes('stock') || lowerType.includes('receipt') || lowerType.includes('transfer') || lowerType.includes('warehouse')
      }

      const query = happeningsSearch.toLowerCase().trim()
      const matchesSearch =
        !query ||
        act.reference.toLowerCase().includes(query) ||
        act.description.toLowerCase().includes(query) ||
        (act.causer_name && act.causer_name.toLowerCase().includes(query)) ||
        act.type.toLowerCase().includes(query)

      return matchesType && matchesSearch
    })
  }, [recentActivities, happeningsFilter, happeningsSearch])

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8 h-96 animate-pulse" />
          <Card className="lg:col-span-4 h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  const financials = summary?.financials
  const sales = summary?.sales
  const inventory = summary?.inventory
  const companies = summary?.companies || []

  const revenueVal = Number(financials?.revenue || 0)
  const expensesVal = Number(financials?.expenses || 0)
  const profitMarginPercent = revenueVal > 0 ? Math.round(((revenueVal - expensesVal) / revenueVal) * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header / Welcome & Quick Action Shortcuts ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.name || 'Admin'}
            </h1>
            {role && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                {ROLE_LABELS[role] || role}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tenant Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time operations, tenant activity log, and instant launch tiles for your organization.
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2 sm:self-auto self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 gap-1.5 text-xs font-medium border-border/70 hover:bg-accent"
            title="Refresh latest tenant data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link to="/settings/data-migration">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border/70 hover:bg-accent text-xs font-medium h-9"
            >
              <UploadCloud className="h-4 w-4 text-primary" />
              <span>Bulk Upload Data</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Overview Cards (Antigravity Floating Stat Tiles) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Monthly Revenue */}
        <Link to="/accounts/reports/profit-and-loss" className="block group stagger-1">
          <Card className="hover:border-emerald-500/50 hover:shadow-[0_20px_45px_-10px_rgba(16,185,129,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Revenue
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 shadow-xs transition-all duration-300">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(financials?.revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Total revenue this month
                </span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Monthly Profit */}
        <Link to="/accounts/reports/profit-and-loss" className="block group stagger-2">
          <Card className="hover:border-blue-500/50 hover:shadow-[0_20px_45px_-10px_rgba(59,130,246,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Profit
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 shadow-xs transition-all duration-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(financials?.net_profit)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" /> Net profit after expenses
                </span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Sales Orders */}
        <Link to="/sales/orders" className="block group stagger-3">
          <Card className="hover:border-amber-500/50 hover:shadow-[0_20px_45px_-10px_rgba(245,158,11,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sales Orders
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 shadow-xs transition-all duration-300">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {sales?.total_orders ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" /> New orders this month
                </span>
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  {sales?.pending_quotations ? `${sales.pending_quotations} quotes pending` : 'Active'}
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Low Stock Items */}
        <Link to="/inventory/reports" className="block group stagger-4">
          <Card className="hover:border-rose-500/50 hover:shadow-[0_20px_45px_-10px_rgba(244,63,94,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Low Stock Items
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/20 shadow-xs transition-all duration-300">
                <AlertCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {inventory?.low_stock_items ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" /> Items below reorder level
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {inventory?.total_items ? `of ${inventory.total_items} items` : ''}
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── High-Speed Quick Actions Row ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </h2>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Direct creation shortcuts
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150 group"
            asChild
          >
            <Link to="/accounts/journal-vouchers/new">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">New Voucher</div>
                <div className="text-[11px] text-muted-foreground">Create a journal entry</div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150 group"
            asChild
          >
            <Link to="/sales/orders/new">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">New Sale Order</div>
                <div className="text-[11px] text-muted-foreground">Process a customer order</div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150 group"
            asChild
          >
            <Link to="/inventory/items/new">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">Add Item</div>
                <div className="text-[11px] text-muted-foreground">Register new product</div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150 group"
            asChild
          >
            <Link to="/sales/customers/new">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">New Customer</div>
                <div className="text-[11px] text-muted-foreground">Grow your client base</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Tenant Quick Access Tiles (Comprehensive Domain Launchpad) ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Quick Access Launchpad
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jump directly to any module, workspace, or feature across your tenant.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search access tiles..."
              value={tileSearch}
              onChange={(e) => setTileSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'accounts', label: 'Finance & Accounts' },
            { id: 'sales', label: 'Sales & Orders' },
            { id: 'inventory', label: 'Inventory & Stock' },
            { id: 'projects', label: 'Projects' },
            { id: 'settings', label: 'Settings & Admin' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTileCategory(cat.id as TileCategory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                tileCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tiles Grid */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTiles.map((tile) => {
            const IconComponent = tile.icon
            return (
              <div
                key={tile.id}
                className={`group relative flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-card/75 dark:bg-card/60 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 ${tile.colorScheme.borderHover} ${tile.colorScheme.glow}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-xl ${tile.colorScheme.bg} ${tile.colorScheme.text} group-hover:scale-105 transition-transform`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    {tile.actionTo && (
                      <Link
                        to={tile.actionTo}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-muted/80 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors shrink-0"
                        title={tile.actionLabel || 'Create New'}
                      >
                        <Plus className="h-3 w-3" />
                        <span>{tile.actionLabel}</span>
                      </Link>
                    )}
                  </div>
                  <div>
                    <Link to={tile.to} className="block group-hover:text-primary transition-colors">
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground flex items-center justify-between">
                        <span>{tile.title}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                    </Link>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {tile.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
                  <Link
                    to={tile.to}
                    className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span>Open Module</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <span className="text-[10px] uppercase font-mono text-muted-foreground/60">
                    {tile.category}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {filteredTiles.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-border/70 rounded-xl bg-card/40">
            <Search className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium text-foreground">No quick access tiles match your filter</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term or category.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTileCategory('all')
                setTileSearch('')
              }}
              className="mt-3 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* ── Main Dual Section: Latest Happenings & Tenant Overview ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Latest Happenings on Tenant (Main Stream) */}
        <Card className="lg:col-span-8 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">Latest Happenings</CardTitle>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Live Stream
                  </span>
                </div>
                <CardDescription className="mt-1">
                  Chronological audit feed of orders, vouchers, inventory movements, and status transitions.
                </CardDescription>
              </div>

              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary font-medium" asChild>
                <Link to="/activities" className="flex items-center gap-1.5">
                  View Full Audit Trail <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            {/* Filter and Search within Happenings */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3">
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: 'all', label: 'All Happenings' },
                  { id: 'sales', label: 'Orders & Sales' },
                  { id: 'finance', label: 'Finance & Vouchers' },
                  { id: 'inventory', label: 'Inventory & Items' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHappeningsFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      happeningsFilter === tab.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-52">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Filter events..."
                  value={happeningsSearch}
                  onChange={(e) => setHappeningsSearch(e.target.value)}
                  className="pl-7 h-7 text-xs bg-background/60"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 flex-1">
            <div className="space-y-3">
              {filteredHappenings.length > 0 ? (
                filteredHappenings.map((activity) => {
                  const isOrder = activity.type.toLowerCase().includes('order') || activity.type.toLowerCase().includes('sale')
                  const isReceipt = activity.type.toLowerCase().includes('receipt') || activity.type.toLowerCase().includes('payment')
                  const isVoucher = activity.type.toLowerCase().includes('voucher') || activity.type.toLowerCase().includes('invoice')
                  const isItem = activity.type.toLowerCase().includes('item') || activity.type.toLowerCase().includes('stock')

                  return (
                    <div
                      key={activity.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/40 hover:border-primary/30 transition-all duration-150"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 p-2 rounded-xl shrink-0 transition-colors ${
                          isOrder
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : isReceipt
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isVoucher
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : isItem
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isOrder ? (
                            <ShoppingCart className="h-4 w-4" />
                          ) : isReceipt ? (
                            <DollarSign className="h-4 w-4" />
                          ) : isVoucher ? (
                            <FileText className="h-4 w-4" />
                          ) : isItem ? (
                            <Package className="h-4 w-4" />
                          ) : (
                            <ActivityIcon className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {activity.reference}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70">•</span>
                            <span className="text-[11px] font-medium text-foreground/80">
                              {activity.type}
                            </span>
                            <StatusBadge status={activity.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                            <span>By: <span className="text-foreground/90 font-medium">{activity.causer_name || 'System'}</span></span>
                            <span>•</span>
                            <time>{formatDate(activity.date)}</time>
                          </div>
                        </div>
                      </div>

                      {/* Right amount & action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 shrink-0">
                        {activity.amount !== null && activity.amount !== undefined && (
                          <div className="font-semibold text-xs sm:text-sm text-foreground tabular-nums">
                            {formatCurrency(activity.amount)}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                          <span>Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/60 rounded-xl">
                  <div className="p-3 bg-muted rounded-full mb-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">No recent happenings match your criteria.</p>
                  {(happeningsFilter !== 'all' || happeningsSearch) && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setHappeningsFilter('all')
                        setHappeningsSearch('')
                      }}
                      className="text-xs mt-1"
                    >
                      Clear happenings filter
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Financial Performance & Multi-Company Directory */}
        <div className="lg:col-span-4 space-y-6">
          {/* Financial Summary Widget */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Financial Summary</CardTitle>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {profitMarginPercent}% Margin
                </span>
              </div>
              <CardDescription>Revenue vs. operating costs this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-foreground">Revenue</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(financials?.revenue)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: financials?.revenue ? '100%' : '0%' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-foreground">Expenses</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(financials?.expenses)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-700"
                      style={{
                        width: financials?.revenue
                          ? `${Math.min((financials.expenses / financials.revenue) * 100, 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-semibold text-foreground">Net Profit</span>
                    <span
                      className={`text-base sm:text-lg font-bold tabular-nums ${
                        financials?.net_profit && financials.net_profit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(financials?.net_profit)}
                    </span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs font-medium" asChild>
                  <Link to="/accounts/reports/profit-and-loss" className="flex items-center justify-center gap-1.5">
                    View Complete P&L Statement <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Companies Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Your Companies</CardTitle>
                <CardDescription>Multi-entity structure under this tenant.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <Link to="/settings/companies">Manage All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {companies.length > 0 ? (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 hover:bg-accent/40 transition-all duration-150 group"
                    >
                      <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs truncate text-foreground">{company.name}</h4>
                        <p className="text-[11px] text-muted-foreground truncate">{company.email || 'No email set'}</p>
                        {company.registration_number && (
                          <p className="text-[10px] mt-0.5 text-muted-foreground/80 font-mono">
                            REG: {company.registration_number}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center border-2 border-dashed border-border/60 rounded-xl">
                    <Building2 className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">No companies found.</p>
                    <Button variant="link" size="sm" className="text-xs mt-1" asChild>
                      <Link to="/settings/companies">Create your first company</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
