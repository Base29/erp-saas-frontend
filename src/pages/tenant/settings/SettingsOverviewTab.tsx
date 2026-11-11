import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { ROLE_LABELS } from '@/utils/permissions'
import { useTheme } from '@/components/ThemeProvider'
import {
  fetchCompanies,
  fetchFiscalPeriods,
  fetchTaxSettings,
  fetchSequences,
  fetchUsers,
  fetchProductCategories,
  fetchCustomerCategories,
} from '@/api/tenant'
import {
  Building2,
  Blocks,
  Calendar,
  Percent,
  Network,
  ListOrdered,
  Package,
  Users,
  UserCog,
  UploadCloud,
  BookOpen,
  Target,
  ShoppingCart,
  FileText,
  Palette,
  Sun,
  Moon,
  Laptop,
  Search,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Sparkles,
  LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SettingCategoryKey = 'all' | 'organization' | 'finance' | 'master_data' | 'data_management' | 'administration' | 'system'

export interface SettingTileDefinition {
  id: string
  title: string
  subtitle: string
  description: string
  to: string
  category: SettingCategoryKey
  categoryLabel: string
  icon: LucideIcon
  colorClass: string
  bgClass: string
  borderHover: string
  tags: string[]
  keywords: string[]
  isExternalLink?: boolean
  isInteractiveTheme?: boolean
}

export const SETTING_TILES: SettingTileDefinition[] = [
  // Organization
  {
    id: 'companies',
    title: 'Companies & Branches',
    subtitle: 'Legal entities & multi-company configuration',
    description: 'Manage legal company structures, subsidiary branches, tax numbers (NTN/TRN), currencies, addresses, and registration details.',
    to: '/settings/companies',
    category: 'organization',
    categoryLabel: 'Organization',
    icon: Building2,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    borderHover: 'hover:border-indigo-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)]',
    tags: ['Multi-Entity', 'Tax ID', 'Branches'],
    keywords: ['companies', 'branches', 'legal entity', 'address', 'tax number', 'currency', 'registration', 'ntn', 'trn'],
  },
  {
    id: 'modules',
    title: 'Active Modules',
    subtitle: 'Enterprise feature flags & entitlements',
    description: 'Control tenant-wide module activations for Accounts, Sales, Inventory, Procurement, and Project Management.',
    to: '/settings/modules',
    category: 'organization',
    categoryLabel: 'Organization',
    icon: Blocks,
    colorClass: 'text-violet-500',
    bgClass: 'bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    borderHover: 'hover:border-violet-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.2)]',
    tags: ['Accounts', 'Inventory', 'Sales', 'Projects'],
    keywords: ['modules', 'features', 'entitlements', 'active', 'toggle', 'accounts', 'inventory', 'sales', 'projects'],
  },

  // Finance & Accounting
  {
    id: 'fiscal',
    title: 'Fiscal Periods',
    subtitle: 'Accounting years & monthly period closing',
    description: 'Set up financial calendars, manage open/locked accounting months, and enforce audit-compliant fiscal year closing rules.',
    to: '/settings/fiscal',
    category: 'finance',
    categoryLabel: 'Finance & Accounting',
    icon: Calendar,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    borderHover: 'hover:border-emerald-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]',
    tags: ['Financial Year', 'Period Locking', 'Closing'],
    keywords: ['fiscal', 'fiscal periods', 'calendar', 'dates', 'financial year', 'closing', 'lock dates', 'accounting periods'],
  },
  {
    id: 'tax',
    title: 'Tax Settings & Rates',
    subtitle: 'Sales tax, VAT & deduction rules',
    description: 'Configure standard and reduced VAT/Sales tax rates, active tax authorities, default transaction codes, and input/output tax deductions.',
    to: '/settings/tax',
    category: 'finance',
    categoryLabel: 'Finance & Accounting',
    icon: Percent,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    borderHover: 'hover:border-amber-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.2)]',
    tags: ['Sales Tax', 'VAT / GST', 'Withholding'],
    keywords: ['tax', 'tax settings', 'vat', 'gst', 'rates', 'sales tax', 'percentage', 'deduction', 'tax codes'],
  },
  {
    id: 'account-categories',
    title: 'Account Categories',
    subtitle: 'Chart of accounts structural hierarchy',
    description: 'Define classification trees across Assets, Liabilities, Equity, Revenue, and Expense classes with code ranges and parent groupings.',
    to: '/settings/account-categories',
    category: 'finance',
    categoryLabel: 'Finance & Accounting',
    icon: Network,
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    borderHover: 'hover:border-cyan-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.2)]',
    tags: ['CoA Tree', 'Assets & Liabilities', 'Classes'],
    keywords: ['account categories', 'chart of accounts', 'coa', 'hierarchy', 'classes', 'balance sheet', 'profit and loss'],
  },
  {
    id: 'sequences',
    title: 'Sequences & Numbering',
    subtitle: 'Auto-increment numbering patterns',
    description: 'Establish standard document prefixes, suffixes, padding lengths, and yearly/monthly reset rules for invoices, vouchers, and receipts.',
    to: '/settings/sequences',
    category: 'finance',
    categoryLabel: 'Finance & Accounting',
    icon: ListOrdered,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
    borderHover: 'hover:border-rose-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.2)]',
    tags: ['Document Prefixes', 'Auto-Increment', 'Formats'],
    keywords: ['sequences', 'numbering', 'prefix', 'invoice numbers', 'voucher numbers', 'padding', 'serial', 'reset rule'],
  },
  {
    id: 'chart-of-accounts',
    title: 'Chart of Accounts Ledger',
    subtitle: 'General ledger account configuration',
    description: 'Configure and review individual general ledger account codes, opening balances, sub-ledgers, and financial statement allocations.',
    to: '/accounts/chart-of-accounts',
    category: 'finance',
    categoryLabel: 'Finance & Accounting',
    icon: BookOpen,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
    borderHover: 'hover:border-blue-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)]',
    tags: ['General Ledger', 'Account Codes', 'Opening Balances'],
    keywords: ['chart of accounts', 'gl', 'ledger', 'account codes', 'opening balance', 'coa', 'accounts'],
  },
  {
    id: 'cost-centers',
    title: 'Cost Centers & Allocation',
    subtitle: 'Departmental & project cost units',
    description: 'Define cost centers, departmental units, and expense allocation codes to segment operational costs and track profitability.',
    to: '/accounts/cost-centers',
    category: 'finance',
    categoryLabel: 'Finance & Accounting',
    icon: Target,
    colorClass: 'text-fuchsia-500',
    bgClass: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
    borderHover: 'hover:border-fuchsia-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(217,70,239,0.2)]',
    tags: ['Cost Centers', 'Departments', 'Expense Allocation'],
    keywords: ['cost centers', 'cost center', 'department', 'allocation', 'profit center', 'budget units'],
  },

  // Master Data & Catalog
  {
    id: 'categories',
    title: 'Product Categories',
    subtitle: 'Item classification & inventory taxonomy',
    description: 'Organize raw materials, manufactured items, and services into categories for inventory valuation and revenue reporting.',
    to: '/settings/categories',
    category: 'master_data',
    categoryLabel: 'Master Data',
    icon: Package,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-600/10 dark:bg-amber-600/15 text-amber-600 dark:text-amber-400',
    borderHover: 'hover:border-amber-600/40 group-hover:shadow-[0_20px_40px_-15px_rgba(217,119,6,0.2)]',
    tags: ['Item Categories', 'Inventory Groups', 'Catalog'],
    keywords: ['product categories', 'categories', 'items', 'products', 'inventory categories', 'catalog', 'stock taxonomy'],
  },
  {
    id: 'customer-categories',
    title: 'Customer Categories',
    subtitle: 'Customer segmentation & market groups',
    description: 'Segment customer accounts into wholesale, retail, institutional, or export tiers with tailored credit and pricing policies.',
    to: '/settings/customer-categories',
    category: 'master_data',
    categoryLabel: 'Master Data',
    icon: Users,
    colorClass: 'text-teal-500',
    bgClass: 'bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400',
    borderHover: 'hover:border-teal-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.2)]',
    tags: ['Segmentation', 'Wholesale & Retail', 'Tiers'],
    keywords: ['customer categories', 'customer segmentation', 'clients', 'tiers', 'wholesale', 'retail', 'customer groups'],
  },
  {
    id: 'price-lists',
    title: 'Price Lists & Rates',
    subtitle: 'Customer pricing tiers & margin schedules',
    description: 'Manage standard, wholesale, and distributor price lists with currency-specific item rates and bulk pricing rules.',
    to: '/sales/price-lists',
    category: 'master_data',
    categoryLabel: 'Master Data',
    icon: ShoppingCart,
    colorClass: 'text-sky-500',
    bgClass: 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
    borderHover: 'hover:border-sky-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(14,165,233,0.2)]',
    tags: ['Price Lists', 'Volume Discounts', 'Margin Rules'],
    keywords: ['price lists', 'pricing', 'discounts', 'wholesale prices', 'retail prices', 'rates', 'currency pricing'],
  },
  {
    id: 'warehouses',
    title: 'Warehouses & Locations',
    subtitle: 'Physical storage hubs & depots',
    description: 'Manage multiple warehouses, regional storage hubs, distribution depots, and internal stock transfer locations.',
    to: '/inventory/warehouses',
    category: 'master_data',
    categoryLabel: 'Master Data',
    icon: Building2,
    colorClass: 'text-indigo-400',
    bgClass: 'bg-indigo-400/10 dark:bg-indigo-400/15 text-indigo-500 dark:text-indigo-300',
    borderHover: 'hover:border-indigo-400/40 group-hover:shadow-[0_20px_40px_-15px_rgba(129,140,248,0.2)]',
    tags: ['Storage Hubs', 'Fulfillment', 'Stock Depots'],
    keywords: ['warehouses', 'warehouse', 'locations', 'storage', 'depots', 'fulfillment', 'stock locations'],
  },

  // Data Management & Migration
  {
    id: 'data-migration',
    title: 'Bulk Upload & Migration',
    subtitle: 'CSV batch import & template center',
    description: 'Download verified CSV templates and batch import Chart of Accounts, Bank Statements, Opening Balances, and Master Data.',
    to: '/settings/data-migration',
    category: 'data_management',
    categoryLabel: 'Data Management',
    icon: UploadCloud,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-600 dark:text-emerald-400',
    borderHover: 'hover:border-emerald-600/40 group-hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.2)]',
    tags: ['CSV Import', 'Templates', 'Batch Processing'],
    keywords: ['bulk upload', 'data migration', 'csv', 'import', 'export', 'templates', 'batch upload', 'migration', 'opening balances'],
  },

  // Administration & Security
  {
    id: 'users',
    title: 'Users & Permissions',
    subtitle: 'Team members & RBAC access control',
    description: 'Invite team members, assign granular security roles (Admin, Accountant, Sales, Inventory, Viewer), and manage security status.',
    to: '/settings/users',
    category: 'administration',
    categoryLabel: 'Administration',
    icon: UserCog,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-600/10 dark:bg-purple-600/15 text-purple-600 dark:text-purple-400',
    borderHover: 'hover:border-purple-600/40 group-hover:shadow-[0_20px_40px_-15px_rgba(147,51,234,0.2)]',
    tags: ['RBAC Security', 'Team Invites', 'Role Assignments'],
    keywords: ['users', 'user management', 'roles', 'permissions', 'rbac', 'team', 'invites', 'access control', 'passwords'],
  },
  {
    id: 'activities',
    title: 'Audit & Recent Activities',
    subtitle: 'System event logs & user action history',
    description: 'Inspect full audit trails, record modification logs, approval history, financial status changes, and user timestamps.',
    to: '/activities',
    category: 'administration',
    categoryLabel: 'Administration',
    icon: FileText,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-600/10 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400',
    borderHover: 'hover:border-blue-600/40 group-hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.2)]',
    tags: ['Audit Trail', 'Event Logs', 'Compliance'],
    keywords: ['activities', 'audit', 'logs', 'audit trail', 'history', 'recent activities', 'events', 'compliance'],
  },

  // System & Preferences
  {
    id: 'appearance',
    title: 'Theme & Appearance',
    subtitle: 'Visual preferences & interface mode',
    description: 'Switch between light mode, dark mode, or follow your operating system appearance with immediate live preview.',
    to: '#',
    category: 'system',
    categoryLabel: 'System Preferences',
    icon: Palette,
    colorClass: 'text-pink-500',
    bgClass: 'bg-pink-500/10 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400',
    borderHover: 'hover:border-pink-500/40 group-hover:shadow-[0_20px_40px_-15px_rgba(236,72,153,0.2)]',
    tags: ['Dark Mode', 'Light Mode', 'Adaptive UI'],
    keywords: ['theme', 'appearance', 'dark mode', 'light mode', 'display', 'ui', 'color scheme'],
    isInteractiveTheme: true,
  },
]

const CATEGORY_TABS: { key: SettingCategoryKey; label: string }[] = [
  { key: 'all', label: 'All Settings' },
  { key: 'organization', label: 'Organization' },
  { key: 'finance', label: 'Finance & Accounting' },
  { key: 'master_data', label: 'Master Data' },
  { key: 'data_management', label: 'Data Migration' },
  { key: 'administration', label: 'Administration' },
  { key: 'system', label: 'Preferences' },
]

export default function SettingsOverviewTab() {
  const { user, role, activeModules } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<SettingCategoryKey>('all')

  // Live summary queries for badges
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 1],
    queryFn: () => fetchCompanies({ per_page: 50 }).then((r) => r.data),
    staleTime: 60000,
  })

  const { data: fiscalData } = useQuery({
    queryKey: ['fiscal-periods', 1],
    queryFn: () => fetchFiscalPeriods({ per_page: 50 }).then((r) => r.data),
    staleTime: 60000,
  })

  const { data: taxData } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => fetchTaxSettings().then((r) => r.data),
    staleTime: 60000,
  })

  const { data: sequencesData } = useQuery({
    queryKey: ['sequences', 1],
    queryFn: () => fetchSequences({ per_page: 50 }).then((r) => r.data),
    staleTime: 60000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['tenant-users', { page: 1 }],
    queryFn: () => fetchUsers({ page: 1 }).then((r) => r.data),
    staleTime: 60000,
  })

  const { data: prodCatsData } = useQuery({
    queryKey: ['product-categories', 1],
    queryFn: () => fetchProductCategories().then((r) => r.data),
    staleTime: 60000,
  })

  const { data: custCatsData } = useQuery({
    queryKey: ['customer-categories', 1],
    queryFn: () => fetchCustomerCategories().then((r) => r.data),
    staleTime: 60000,
  })

  // Format live metrics
  const getBadgeValue = (id: string): string | null => {
    switch (id) {
      case 'companies':
        if (companiesData?.total !== undefined) {
          return `${companiesData.total} ${companiesData.total === 1 ? 'Entity' : 'Entities'}`
        }
        return 'Multi-Entity'
      case 'modules':
        return `${activeModules.length} Modules Active`
      case 'fiscal':
        if (fiscalData?.total !== undefined) {
          return `${fiscalData.total} ${fiscalData.total === 1 ? 'Period' : 'Periods'}`
        }
        return 'Calendar Setup'
      case 'tax':
        if (taxData?.data) {
          const active = taxData.data.find((t) => t.is_active)
          return active ? `${active.rate_percentage}% ${active.name}` : `${taxData.data.length} Rates`
        }
        return 'Tax Rules'
      case 'sequences':
        if (sequencesData?.total !== undefined) {
          return `${sequencesData.total} Sequences`
        }
        return 'Numbering'
      case 'users':
        if (usersData?.total !== undefined) {
          return `${usersData.total} ${usersData.total === 1 ? 'User' : 'Users'}`
        }
        return 'Access Control'
      case 'categories':
        if (prodCatsData?.total !== undefined) {
          return `${prodCatsData.total} Categories`
        }
        return 'Item Groups'
      case 'customer-categories':
        if (custCatsData?.total !== undefined) {
          return `${custCatsData.total} Segments`
        }
        return 'Customer Tiers'
      case 'data-migration':
        return 'CSV Ready'
      case 'appearance':
        return theme === 'dark' ? 'Dark Mode' : theme === 'light' ? 'Light Mode' : 'System Theme'
      default:
        return null
    }
  }

  // Filter tiles based on search and category
  const filteredTiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SETTING_TILES.filter((tile) => {
      // Category check
      if (activeCategory !== 'all' && tile.category !== activeCategory) {
        return false
      }
      // Query check
      if (!q) return true
      const matchesTitle = tile.title.toLowerCase().includes(q)
      const matchesSubtitle = tile.subtitle.toLowerCase().includes(q)
      const matchesDescription = tile.description.toLowerCase().includes(q)
      const matchesCategory = tile.categoryLabel.toLowerCase().includes(q)
      const matchesKeywords = tile.keywords.some((k) => k.toLowerCase().includes(q))
      const matchesTags = tile.tags.some((t) => t.toLowerCase().includes(q))

      return matchesTitle || matchesSubtitle || matchesDescription || matchesCategory || matchesKeywords || matchesTags
    })
  }, [search, activeCategory])

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SETTING_TILES.length }
    for (const t of SETTING_TILES) {
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    return counts
  }, [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Antigravity Ambient Glass Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/50 dark:border-white/10 bg-gradient-to-br from-card/90 via-card/60 to-primary/5 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.12)]">
        {/* Decorative Ambient Background Spheres */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-purple-500/10 dark:bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Platform Control Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Platform Settings & Quick Access
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Centrally configure legal entities, fiscal policies, tax compliance rules, document sequences, master catalog classifications, and user security permissions across Genie Cloud.
            </p>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2.5 rounded-xl bg-background/70 border border-border/80 backdrop-blur-md shadow-subtle flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Platform Status</p>
                <p className="text-xs font-semibold text-foreground">Operational</p>
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-background/70 border border-border/80 backdrop-blur-md shadow-subtle flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Signed In As</p>
                <p className="text-xs font-semibold text-foreground">{role ? ROLE_LABELS[role] : user?.name}</p>
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-background/70 border border-border/80 backdrop-blur-md shadow-subtle flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Settings</p>
                <p className="text-xs font-semibold text-foreground">{SETTING_TILES.length} Modules</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Shortcuts Bar */}
        <div className="mt-6 pt-5 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">Quick Shortcuts:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg border-border/80 shadow-xs" asChild>
              <Link to="/settings/companies">
                <Plus className="h-3 w-3 text-primary" /> Add Company
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg border-border/80 shadow-xs" asChild>
              <Link to="/settings/users">
                <Plus className="h-3 w-3 text-purple-500" /> Invite User
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg border-border/80 shadow-xs" asChild>
              <Link to="/settings/fiscal">
                <Plus className="h-3 w-3 text-emerald-500" /> Fiscal Period
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg border-border/80 shadow-xs" asChild>
              <Link to="/settings/data-migration">
                <UploadCloud className="h-3.5 w-3.5 text-blue-500" /> Bulk Import
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search settings (e.g. tax, sequences, companies, users)..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-border/80 bg-background/80 dark:bg-background/50 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all shadow-subtle"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">
            Showing <span className="font-bold text-foreground">{filteredTiles.length}</span> of {SETTING_TILES.length} settings
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-subtle font-semibold'
                    : 'bg-background/60 hover:bg-accent/70 text-muted-foreground hover:text-foreground border border-border/60'
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Access Tiles Grid */}
      {filteredTiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTiles.map((tile) => {
            const Icon = tile.icon
            const liveBadge = getBadgeValue(tile.id)

            if (tile.isInteractiveTheme) {
              return (
                <div
                  key={tile.id}
                  className={cn(
                    'group relative rounded-2xl p-5 border border-white/60 dark:border-white/10 bg-card/85 dark:bg-card/65 backdrop-blur-xl shadow-subtle transition-all duration-300 flex flex-col justify-between',
                    tile.borderHover
                  )}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('p-3 rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105', tile.bgClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[11px] font-medium border-border/80">
                        {tile.categoryLabel}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {tile.title}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{tile.subtitle}</p>
                    </div>

                    <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-3">
                      {tile.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/60 space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-semibold text-foreground capitalize">{liveBadge}</span>
                    </div>

                    {/* Interactive 3-way Theme Switcher Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-background/80 border border-border/70">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          theme === 'light' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sun className="h-3.5 w-3.5" /> Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          theme === 'dark' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Moon className="h-3.5 w-3.5" /> Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          theme === 'system' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Laptop className="h-3.5 w-3.5" /> Auto
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={tile.id}
                to={tile.to}
                className={cn(
                  'group relative rounded-2xl p-5 border border-white/60 dark:border-white/10 bg-card/85 dark:bg-card/65 backdrop-blur-xl shadow-subtle hover:-translate-y-1 hover:shadow-elevated transition-all duration-300 flex flex-col justify-between outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  tile.borderHover
                )}
              >
                <div className="space-y-3.5">
                  {/* Tile Header: Icon & Category/Live Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn('p-3 rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105', tile.bgClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {tile.categoryLabel}
                      </span>
                      {liveBadge && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border/70 bg-background/80 backdrop-blur-xs text-foreground"
                        >
                          {liveBadge}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{tile.title}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{tile.subtitle}</p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-3">
                    {tile.description}
                  </p>
                </div>

                {/* Footer Tags & Action Pill */}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                    {tile.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent/60 text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 group-hover:underline shrink-0">
                    Manage <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center border-2 border-dashed border-border/70 rounded-2xl bg-card/40 backdrop-blur-md p-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No settings found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            We couldn't find any platform settings matching &quot;{search}&quot;. Try searching for companies, tax, users, fiscal periods, or sequences.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('')
                setActiveCategory('all')
              }}
              className="text-xs rounded-lg"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
