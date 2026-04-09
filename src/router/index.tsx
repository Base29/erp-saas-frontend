import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import PlatformLayout from '@/layouts/PlatformLayout'

// Platform pages
import PlatformLoginPage from '@/pages/platform/LoginPage'
import TenantsPage from '@/pages/platform/TenantsPage'
import TenantDetailPage from '@/pages/platform/TenantDetailPage'
import PlatformDashboardPage from '@/pages/platform/DashboardPage'

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
  // Tenant routes (placeholder — Phase 8 will fill these)
  {
    path: '/login',
    element: <div className="p-8 text-center text-muted-foreground">Tenant login — Phase 8</div>,
  },
  {
    path: '/',
    element: <TenantProtectedRoute />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
    ],
  },
  // Fallback
  { path: '*', element: <Navigate to="/platform/login" replace /> },
])
