import { useMemo } from 'react'
import { Outlet, useLocation, Link, NavLink } from 'react-router-dom'
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
  Settings2,
  UploadCloud,
  ChevronLeft,
  LayoutGrid,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

interface Category {
  title: string
  tabs: readonly Tab[]
}

export const SETTINGS_CATEGORIES: readonly Category[] = [
  {
    title: 'Organization',
    tabs: [
      { id: 'companies', label: 'Companies', icon: Building2, description: 'Manage your companies and branches' },
      { id: 'modules', label: 'Active Modules', icon: Blocks, description: 'Enable or disable ERP modules' },
    ]
  },
  {
    title: 'Finance',
    tabs: [
      { id: 'fiscal', label: 'Fiscal Periods', icon: Calendar, description: 'Define financial years and periods' },
      { id: 'tax', label: 'Tax Settings', icon: Percent, description: 'Configure tax rates and rules' },
      { id: 'account-categories', label: 'Account Categories', icon: Network, description: 'Manage chart of accounts hierarchy' },
      { id: 'sequences', label: 'Sequences', icon: ListOrdered, description: 'Document numbering patterns' },
      { id: 'data-migration', label: 'Bulk Upload & Migration', icon: UploadCloud, description: 'Bulk import chart of accounts, bank statements, and transactions' },
    ]
  },
  {
    title: 'Master Data',
    tabs: [
      { id: 'categories', label: 'Product Categories', icon: Package, description: 'Organize your products and services' },
      { id: 'customer-categories', label: 'Customer Categories', icon: Users, description: 'Segment your customers' },
    ]
  },
  {
    title: 'Administration',
    tabs: [
      { id: 'users', label: 'Users', icon: UserCog, description: 'User roles and permissions' },
    ]
  }
]

export default function SettingsPage() {
  const location = useLocation()

  const allTabs = useMemo(() => SETTINGS_CATEGORIES.flatMap(c => c.tabs), [])

  const currentTab = useMemo(() => {
    // The path will be something like /settings/companies or /settings
    const pathParts = location.pathname.split('/').filter(Boolean)
    const lastPart = pathParts[pathParts.length - 1]
    if (lastPart === 'settings') return null
    return allTabs.find(t => t.id === lastPart)
  }, [location.pathname, allTabs])

  const isOverview = !currentTab
  const TabIcon = currentTab?.icon

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="flex-none p-4 sm:p-6 border-b border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-primary/10 rounded-xl shadow-subtle shrink-0">
              {TabIcon ? (
                <TabIcon className="h-6 w-6 text-primary" />
              ) : (
                <Settings2 className="h-6 w-6 text-primary animate-spin-slow" />
              )}
            </div>
            <div>
              {/* Breadcrumb back to overview when on a sub-setting */}
              {!isOverview && (
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-0.5 group"
                >
                  <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>All Settings</span>
                </Link>
              )}
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {currentTab?.label || 'Platform Settings'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {currentTab?.description || 'Quick access tiles and configuration options for all system settings on the platform.'}
              </p>
            </div>
          </div>

          <div id="settings-header-actions" className="flex items-center gap-2 self-end sm:self-center" />
        </div>

        {/* Sub-navigation bar when viewing a sub-setting */}
        {!isOverview && (
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
            <Link
              to="/settings"
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Overview
            </Link>
            <span className="text-border">|</span>
            {allTabs.map((t) => {
              const Icon = t.icon
              const isActive = t.id === currentTab?.id
              return (
                <NavLink
                  key={t.id}
                  to={`/settings/${t.id}`}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </NavLink>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-background/30 backdrop-blur-sm">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
