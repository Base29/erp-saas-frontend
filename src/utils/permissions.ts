import type { UserRole } from '@/store/authStore'
import { useAuthStore } from '@/store/authStore'

export const isModuleActive = (moduleKey: string): boolean =>
  useAuthStore.getState().activeModules.includes(moduleKey)

export const isExtensionActive = (extensionKey: string): boolean =>
  useAuthStore.getState().activeModules.includes(extensionKey)

// Which roles can access each nav section
const sectionRoles: Record<string, UserRole[]> = {
  accounts: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager', 'viewer'],
  sales: ['tenant_admin', 'sales_manager', 'sales_person', 'accountant', 'inventory_manager', 'viewer'],
  inventory: ['tenant_admin', 'inventory_manager', 'sales_manager', 'sales_person', 'accountant', 'viewer'],
  projects: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager', 'viewer'],
  procurement: ['tenant_admin', 'accountant', 'inventory_manager', 'sales_manager', 'viewer'],
  manufacturing: ['tenant_admin', 'accountant', 'inventory_manager', 'viewer'],
  plastics_molding: ['tenant_admin', 'accountant', 'inventory_manager', 'viewer'],
  reports: ['tenant_admin', 'accountant', 'sales_manager', 'sales_person', 'inventory_manager', 'viewer'],
  settings: ['tenant_admin'],
  genie: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager', 'viewer'],
}

export function canAccessSection(role: UserRole | null, section: string): boolean {
  if (!role) return false
  if (!sectionRoles[section]) return false
  if (role === 'tenant_admin' || role === 'super_admin') return true

  const { user, permissions } = useAuthStore.getState()

  // When a user is authenticated, dynamic RBAC permissions take precedence
  if (user) {
    if (permissions.includes('*') || permissions.includes(`${section}.*`)) {
      return true
    }

    // Reports section is accessible if user has access to any reporting domain
    if (section === 'reports') {
      return (
        permissions.some(
          (p) =>
            p.startsWith('accounts.') ||
            p.startsWith('sales.') ||
            p.startsWith('inventory.') ||
            p.startsWith('reports.') ||
            p.startsWith('audit.')
        )
      )
    }

    // Check if user has ANY permission for this section (e.g. 'accounts.read', 'accounts.coa.view', etc.)
    return permissions.some(
      (p) => p === section || p === `${section}.read` || p.startsWith(`${section}.`)
    )
  }

  // Fallback for unauthenticated contexts or unit tests without an active user session
  return sectionRoles[section]?.includes(role) ?? false
}

// Write access helpers
const writeRoles: Record<string, UserRole[]> = {
  accounts: ['tenant_admin', 'accountant'],
  sales: ['tenant_admin', 'sales_manager', 'sales_person'],
  inventory: ['tenant_admin', 'inventory_manager'],
  projects: ['tenant_admin', 'accountant', 'sales_manager'],
  procurement: ['tenant_admin', 'accountant', 'inventory_manager'],
  manufacturing: ['tenant_admin', 'accountant', 'inventory_manager'],
  plastics_molding: ['tenant_admin', 'accountant', 'inventory_manager'],
  settings: ['tenant_admin'],
  genie: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager'],
}

export function canWrite(role: UserRole | null, section: string): boolean {
  if (!role) return false
  if (!writeRoles[section]) return false
  if (role === 'tenant_admin' || role === 'super_admin') return true

  const { user, permissions } = useAuthStore.getState()

  if (user) {
    if (permissions.includes('*') || permissions.includes(`${section}.*`) || permissions.includes(`${section}.write`)) {
      return true
    }
    return permissions.some(
      (p) =>
        p.startsWith(`${section}.`) &&
        (p.endsWith('.write') ||
          p.endsWith('.create') ||
          p.endsWith('.edit') ||
          p.endsWith('.manage') ||
          p.endsWith('.post'))
    )
  }

  return writeRoles[section]?.includes(role) ?? false
}

export function hasPermission(permission: string): boolean {
  const { role, permissions } = useAuthStore.getState()
  if (!role) return false
  if (role === 'tenant_admin' || role === 'super_admin') return true
  if (permissions.includes('*') || permissions.includes(permission)) return true
  if (permission.includes('.')) {
    const [mod] = permission.split('.')
    if (permissions.includes(`${mod}.*`)) return true
  }
  return false
}

// Approval actions
export function canApprove(role: UserRole | null): boolean {
  if (!role) return false
  if (hasPermission('approvals.act') || hasPermission('procurement.po.approve') || hasPermission('procurement.write')) return true
  return ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager'].includes(role)
}

export function canSubmitForApproval(role: UserRole | null): boolean {
  if (!role) return false
  return role !== 'viewer'
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  accountant: 'Accountant',
  sales_manager: 'Sales Manager',
  sales_person: 'Sales Person',
  inventory_manager: 'Inventory Manager',
  viewer: 'Viewer',
}
