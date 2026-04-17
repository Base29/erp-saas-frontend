import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'
import apiClient from '@/api/client'

// All known modules in display order
const ALL_MODULES = [
  { key: 'accounts', label: 'Accounts', description: 'Double-entry accounting, chart of accounts, journal vouchers, and financial reports.' },
  { key: 'inventory', label: 'Inventory', description: 'Stock management, goods receipts, goods issues, stock transfers, and inventory reports.' },
  { key: 'sales', label: 'Sales', description: 'Quotations, sale orders, invoices, receipts, credit notes, and sales reports.' },
]

export default function ActiveModulesTab() {
  const { activeModules, setActiveModules, token } = useAuthStore()

  // Always fetch fresh data when this tab is opened
  useEffect(() => {
    if (!token) return
    apiClient.get<{ data: string[] }>('/v1/settings/active-modules')
      .then((res) => setActiveModules(res.data.data ?? []))
      .catch(() => {/* non-fatal */})
  }, [])

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Modules are managed by your platform administrator. Contact them to activate or deactivate modules.
      </p>

      <div className="rounded-md border divide-y">
        {ALL_MODULES.map((mod) => {
          const active = activeModules.includes(mod.key)
          return (
            <div key={mod.key} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{mod.label}</span>
                  <Badge variant={active ? 'default' : 'secondary'} className="text-xs">
                    {active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
              </div>
              <div className="shrink-0">
                {active
                  ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                  : <XCircle className="h-5 w-5 text-muted-foreground/40" />
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
