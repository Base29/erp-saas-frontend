import type { UserRole } from '@/store/authStore'
import { useAuthStore } from '@/store/authStore'

export const isModuleActive = (moduleKey: string): boolean =>
  useAuthStore.getState().activeModules.includes(moduleKey)

// Which roles can access each nav section
const sectionRoles: Record<string, UserRole[]> = {
  accounts: ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager', 'viewer'],
  sales: ['tenant_admin', 'sales_manager', 'sales_person', 'accountant', 'inventory_manager', 'viewer'],
  inventory: ['tenant_admin', 'inventory_manager', 'sales_manager', 'sales_person', 'accountant', 'viewer'],
  settings: ['tenant_admin'],
}

export function canAccessSection(role: UserRole | null, section: string): boolean {
  if (!role) return false
  return sectionRoles[section]?.includes(role) ?? false
}

// Write access helpers
const writeRoles: Record<string, UserRole[]> = {
  accounts: ['tenant_admin', 'accountant'],
  sales: ['tenant_admin', 'sales_manager', 'sales_person'],
  inventory: ['tenant_admin', 'inventory_manager'],
  settings: ['tenant_admin'],
}

export function canWrite(role: UserRole | null, section: string): boolean {
  if (!role) return false
  return writeRoles[section]?.includes(role) ?? false
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
