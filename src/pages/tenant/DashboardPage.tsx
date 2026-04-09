import { useAuthStore } from '@/store/authStore'
import { ROLE_LABELS } from '@/utils/permissions'
import type { UserRole } from '@/store/authStore'

export default function TenantDashboardPage() {
  const { user, role } = useAuthStore()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Welcome, {user?.name}</h1>
      <p className="text-sm text-muted-foreground">
        {role ? ROLE_LABELS[role as UserRole] : ''} — select a module from the sidebar to get started.
      </p>
    </div>
  )
}
