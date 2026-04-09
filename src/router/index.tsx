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
          // Accounts, Sales, Inventory pages added in Phases 9–11
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/platform/login" replace /> },
])
