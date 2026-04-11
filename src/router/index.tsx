import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import PlatformLayout from '@/layouts/PlatformLayout'
import TenantLayout from '@/layouts/TenantLayout'

// Platform pages
import PlatformLoginPage from '@/pages/platform/LoginPage'
import TenantsPage from '@/pages/platform/TenantsPage'
import TenantDetailPage from '@/pages/platform/TenantDetailPage'
import PlatformDashboardPage from '@/pages/platform/DashboardPage'

// Tenant pages
import TenantLoginPage from '@/pages/tenant/LoginPage'
import TenantDashboardPage from '@/pages/tenant/DashboardPage'
import SettingsPage from '@/pages/tenant/settings/SettingsPage'

// Accounts pages
import ChartOfAccountsPage from '@/pages/tenant/accounts/ChartOfAccountsPage'
import JournalVouchersPage from '@/pages/tenant/accounts/JournalVouchersPage'
import JournalVoucherFormPage from '@/pages/tenant/accounts/JournalVoucherFormPage'
import JournalVoucherDetailPage from '@/pages/tenant/accounts/JournalVoucherDetailPage'
import AccountsReportsPage from '@/pages/tenant/accounts/AccountsReportsPage'

// Inventory pages
import ItemsPage from '@/pages/tenant/inventory/ItemsPage'
import WarehousesPage from '@/pages/tenant/inventory/WarehousesPage'
import GoodsReceiptsPage from '@/pages/tenant/inventory/GoodsReceiptsPage'
import GoodsIssuesPage from '@/pages/tenant/inventory/GoodsIssuesPage'
import StockTransfersPage from '@/pages/tenant/inventory/StockTransfersPage'
import InventoryReportsPage from '@/pages/tenant/inventory/InventoryReportsPage'

// Sales pages
import CustomersPage from '@/pages/tenant/sales/CustomersPage'
import PriceListsPage from '@/pages/tenant/sales/PriceListsPage'
import QuotationsPage from '@/pages/tenant/sales/QuotationsPage'
import SaleOrdersPage from '@/pages/tenant/sales/SaleOrdersPage'
import SaleInvoicesPage from '@/pages/tenant/sales/SaleInvoicesPage'
import ReceiptsPage from '@/pages/tenant/sales/ReceiptsPage'
import CreditNotesPage from '@/pages/tenant/sales/CreditNotesPage'
import GatePassesPage from '@/pages/tenant/sales/GatePassesPage'
import SalesReportsPage from '@/pages/tenant/sales/SalesReportsPage'

// Guards
function PlatformProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const isPlatform = useAuthStore((s) => s.isPlatform)
  if (!token || !isPlatform) return <Navigate to="/platform/login" replace />
  return <Outlet />
}

function TenantProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const isPlatform = useAuthStore((s) => s.isPlatform)
  if (!token || isPlatform) return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  // Platform routes
  {
    path: '/platform/login',
    element: <PlatformLoginPage />,
  },
  {
    path: '/platform',
    element: <PlatformProtectedRoute />,
    children: [
      {
        element: <PlatformLayout />,
        children: [
          { index: true, element: <Navigate to="/platform/dashboard" replace /> },
          { path: 'dashboard', element: <PlatformDashboardPage /> },
          { path: 'tenants', element: <TenantsPage /> },
          { path: 'tenants/:id', element: <TenantDetailPage /> },
        ],
      },
    ],
  },

  // Tenant routes
  {
    path: '/login',
    element: <TenantLoginPage />,
  },
  {
    path: '/',
    element: <TenantProtectedRoute />,
    children: [
      {
        element: <TenantLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <TenantDashboardPage /> },
          { path: 'settings', element: <SettingsPage /> },
          // Accounts module
          { path: 'accounts/chart-of-accounts', element: <ChartOfAccountsPage /> },
          { path: 'accounts/journal-vouchers', element: <JournalVouchersPage /> },
          { path: 'accounts/journal-vouchers/new', element: <JournalVoucherFormPage /> },
          { path: 'accounts/journal-vouchers/:id', element: <JournalVoucherDetailPage /> },
          { path: 'accounts/journal-vouchers/:id/edit', element: <JournalVoucherFormPage /> },
          { path: 'accounts/reports', element: <AccountsReportsPage /> },
          // Inventory module
          { path: 'inventory/items', element: <ItemsPage /> },
          { path: 'inventory/warehouses', element: <WarehousesPage /> },
          { path: 'inventory/goods-receipts', element: <GoodsReceiptsPage /> },
          { path: 'inventory/goods-issues', element: <GoodsIssuesPage /> },
          { path: 'inventory/transfers', element: <StockTransfersPage /> },
          { path: 'inventory/reports', element: <InventoryReportsPage /> },
          // Sales module
          { path: 'sales/customers', element: <CustomersPage /> },
          { path: 'sales/price-lists', element: <PriceListsPage /> },
          { path: 'sales/quotations', element: <QuotationsPage /> },
          { path: 'sales/orders', element: <SaleOrdersPage /> },
          { path: 'sales/invoices', element: <SaleInvoicesPage /> },
          { path: 'sales/receipts', element: <ReceiptsPage /> },
          { path: 'sales/credit-notes', element: <CreditNotesPage /> },
          { path: 'sales/gate-passes', element: <GatePassesPage /> },
          { path: 'sales/reports', element: <SalesReportsPage /> },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/platform/login" replace /> },
])
