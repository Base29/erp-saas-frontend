import { useState } from 'react'
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
  ChevronRight,
  LucideIcon
} from 'lucide-react'
import FiscalPeriodsTab from './FiscalPeriodsTab'
import TaxSettingsTab from './TaxSettingsTab'
import SequencesTab from './SequencesTab'
import UsersTab from './UsersTab'
import ActiveModulesTab from './ActiveModulesTab'
import ProductCategoriesTab from './ProductCategoriesTab'
import CustomerCategoriesTab from './CustomerCategoriesTab'
import CompaniesTab from './CompaniesTab'
import AccountCategoriesTab from './AccountCategoriesTab'
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

type TabId = 'companies' | 'modules' | 'fiscal' | 'tax' | 'account-categories' | 'sequences' | 'categories' | 'customer-categories' | 'users'

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('companies')

  const allTabs = CATEGORIES.flatMap(c => c.tabs)
  const currentTab = allTabs.find(t => t.id === tab)
  const TabIcon = currentTab?.icon

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="flex-none p-6 border-b bg-background">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure and manage your organization preferences.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background/50 overflow-y-auto hidden md:block">
          <nav className="p-4 space-y-8">
            {CATEGORIES.map((category) => (
              <div key={category.title} className="space-y-2">
                <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {category.title}
                </h2>
                <div className="space-y-1">
                  {category.tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id as TabId)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all group',
                        tab === t.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <t.icon className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          tab === t.id ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground'
                        )} />
                        <span>{t.label}</span>
                      </div>
                      {tab === t.id && <ChevronRight className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background/30 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto p-8">
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {TabIcon && <TabIcon className="h-5 w-5 text-muted-foreground" />}
                {currentTab?.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentTab?.description}
              </p>
              <div className="h-px bg-border mt-6" />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {tab === 'fiscal' && <FiscalPeriodsTab />}
              {tab === 'tax' && <TaxSettingsTab />}
              {tab === 'sequences' && <SequencesTab />}
              {tab === 'users' && <UsersTab />}
              {tab === 'categories' && <ProductCategoriesTab />}
              {tab === 'customer-categories' && <CustomerCategoriesTab />}
              {tab === 'companies' && <CompaniesTab />}
              {tab === 'account-categories' && <AccountCategoriesTab />}
              {tab === 'modules' && <ActiveModulesTab />}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex-none border-t bg-background overflow-x-auto">
        <div className="flex p-2 gap-1">
          {allTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as TabId)}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
