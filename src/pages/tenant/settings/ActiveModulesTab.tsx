import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'
import apiClient from '@/api/client'

interface ModuleInfo {
  key: string
  label: string
  description: string
  is_core?: boolean
  is_active?: boolean
}

// Fallback modules if API is loading or unavailable
const FALLBACK_MODULES: ModuleInfo[] = [
  { key: 'accounts', label: 'Accounts', description: 'Double-entry accounting, chart of accounts, journal vouchers, and financial reports.', is_core: true },
  { key: 'inventory', label: 'Inventory', description: 'Stock management, goods receipts, goods issues, stock transfers, and inventory reports.', is_core: true },
  { key: 'sales', label: 'Sales', description: 'Quotations, sale orders, invoices, receipts, credit notes, and sales reports.', is_core: true },
  { key: 'procurement', label: 'Procurement', description: 'Purchase requests, request for proposals (RFP), sealed bidding, vendor evaluation, and purchase orders.', is_core: true },
  { key: 'projects', label: 'Projects', description: 'Lightweight project management integrated with Accounts module for project accounting, budgeting, and profitability reporting.', is_core: false },
]

export default function ActiveModulesTab() {
  const { activeModules, setActiveModules, token } = useAuthStore()
  const [modulesList, setModulesList] = useState<ModuleInfo[]>(FALLBACK_MODULES)

  // Always fetch fresh data when this tab is opened
  useEffect(() => {
    if (!token) return

    // 1. Fetch all available modules with metadata
    apiClient.get<{ data: ModuleInfo[] }>('/v1/settings/modules')
      .then((res) => {
        if (res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setModulesList(res.data.data)
        }
      })
      .catch(() => {
        // Fallback to static list
      })

    // 2. Refresh active module keys in authStore
    apiClient.get<{ data: string[] }>('/v1/settings/active-modules')
      .then((res) => setActiveModules(res.data.data ?? []))
      .catch(() => {/* non-fatal */})
  }, [token, setActiveModules])

  return (
    <div className="space-y-3 max-w-2xl pt-4">
      <div className="rounded-md border divide-y">
        {modulesList.map((mod) => {
          const active = activeModules.includes(mod.key) || Boolean(mod.is_active)
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
