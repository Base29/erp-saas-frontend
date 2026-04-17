import { useState } from 'react'
import FiscalPeriodsTab from './FiscalPeriodsTab'
import TaxSettingsTab from './TaxSettingsTab'
import SequencesTab from './SequencesTab'
import UsersTab from './UsersTab'
import ActiveModulesTab from './ActiveModulesTab'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'fiscal', label: 'Fiscal Periods' },
  { id: 'tax', label: 'Tax Settings' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'users', label: 'Users' },
  { id: 'modules', label: 'Active Modules' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('fiscal')

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="border-b flex gap-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'fiscal' && <FiscalPeriodsTab />}
        {tab === 'tax' && <TaxSettingsTab />}
        {tab === 'sequences' && <SequencesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'modules' && <ActiveModulesTab />}
      </div>
    </div>
  )
}
