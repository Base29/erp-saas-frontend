import { useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
  LucideIcon
} from 'lucide-react'

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

const CATEGORIES: readonly Category[] = [
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

  const currentTab = useMemo(() => {
    const allTabs = CATEGORIES.flatMap(c => c.tabs)
    // The path will be something like /settings/companies
    const pathParts = location.pathname.split('/')
    const lastPart = pathParts[pathParts.length - 1]
    return allTabs.find(t => t.id === lastPart)
  }, [location.pathname])

  const TabIcon = currentTab?.icon

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="flex-none p-6 border-b bg-background">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              {TabIcon ? (
                <TabIcon className="h-6 w-6 text-primary" />
              ) : (
                <Settings2 className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {currentTab?.label || 'Settings'}
              </h1>
              {currentTab?.description && (
                <p className="text-sm text-muted-foreground">
                  {currentTab.description}
                </p>
              )}
            </div>
          </div>
          <div id="settings-header-actions" className="flex items-center gap-2" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto p-8">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
