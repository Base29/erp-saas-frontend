import type { UserRole } from '@/store/authStore'
import { useAuthStore } from '@/store/authStore'

export const isModuleActive = (moduleKey: string): boolean =>
  useAuthStore.getState().activeModules.includes(moduleKey)

// Which roles can access each nav section
const sectionRoles: Record<string, UserRole[]> = {
  accounts: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager', 'viewer'],
  sales: ['tenant_admin', 'sales_manager', 'sales_person', 'accountant', 'inventory_manager', 'viewer'],
  inventory: ['tenant_admin', 'inventory_manager', 'sales_manager', 'sales_person', 'accountant', 'viewer'],
  projects: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager', 'viewer'],
  procurement: ['tenant_admin', 'accountant', 'inventory_manager', 'sales_manager', 'viewer'],
  reports: ['tenant_admin', 'accountant', 'sales_manager', 'sales_person', 'inventory_manager', 'viewer'],
  settings: ['tenant_admin'],
}

export function canAccessSection(role: UserRole | null, section: string): boolean {
  if (!role) return false
  if (!sectionRoles[section]) return false
  if (role === 'tenant_admin' || role === 'super_admin') return true
  const permissions = useAuthStore.getState().permissions
  if (permissions.length > 0) {
    if (permissions.includes('*') || permissions.includes(`${section}.read`) || permissions.includes(`${section}.*`)) {
      return true
    }
  }
  return sectionRoles[section]?.includes(role) ?? false
}

// Write access helpers
const writeRoles: Record<string, UserRole[]> = {
  accounts: ['tenant_admin', 'accountant'],
  sales: ['tenant_admin', 'sales_manager', 'sales_person'],
  inventory: ['tenant_admin', 'inventory_manager'],
  projects: ['tenant_admin', 'accountant', 'sales_manager'],
  procurement: ['tenant_admin', 'accountant', 'inventory_manager'],
  settings: ['tenant_admin'],
}

export function canWrite(role: UserRole | null, section: string): boolean {
  if (!role) return false
  if (!writeRoles[section]) return false
  if (role === 'tenant_admin' || role === 'super_admin') return true
  const permissions = useAuthStore.getState().permissions
  if (permissions.length > 0) {
    if (permissions.includes('*') || permissions.includes(`${section}.write`) || permissions.includes(`${section}.*`)) {
      return true
    }
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
