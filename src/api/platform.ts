import apiClient from './client'

export interface Tenant {
  id: string
  name: string
  subdomain: string
  db_name: string
  status: 'pending' | 'active' | 'suspended' | 'provisioning_failed'
  plan_name: string | null
  created_at: string
  updated_at: string
}

export interface ProvisioningLog {
  id: number
  tenant_id: string
  step: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message: string | null
  created_at: string
}

export interface PlatformDashboard {
  total_tenants: number
  active_tenants: number
  recent_provisioning_events: ProvisioningLog[]
}

export interface CreateTenantPayload {
  name: string
  subdomain: string
  plan_name?: string
}

// Auth
export const platformLogin = (email: string, password: string) =>
  apiClient.post<{ token: string; user: { id: number; name: string; email: string } }>(
    '/platform/v1/auth/login',
    { email, password }
  )

export const platformLogout = () => apiClient.post('/platform/v1/auth/logout')

// Tenants
export const fetchTenants = () => apiClient.get<{ data: Tenant[] }>('/platform/v1/tenants')

export const fetchTenant = (id: string) =>
  apiClient.get<{ data: Tenant }>(`/platform/v1/tenants/${id}`)

export const createTenant = (payload: CreateTenantPayload) =>
  apiClient.post<{ data: Tenant }>('/platform/v1/tenants', payload)

export const suspendTenant = (id: string) =>
  apiClient.patch<{ data: Tenant }>(`/platform/v1/tenants/${id}/suspend`)

export const reactivateTenant = (id: string) =>
  apiClient.patch<{ data: Tenant }>(`/platform/v1/tenants/${id}/reactivate`)

export const fetchProvisioningLogs = (tenantId: string) =>
  apiClient.get<{ data: ProvisioningLog[] }>(`/platform/v1/tenants/${tenantId}/provisioning-logs`)

// Dashboard
export const fetchPlatformDashboard = () =>
  apiClient.get<{ data: PlatformDashboard }>('/platform/v1/dashboard')

// Module management
export interface Module {
  id: string
  module_key: string
  display_name: string
  version: string
  description: string | null
  is_core: boolean
  is_available: boolean
}

export interface TenantModule extends Module {
  is_active: boolean
  activated_at: string | null
  activated_by: string | null
  deactivated_at: string | null
  deactivated_by: string | null
}

export interface ModuleActivationHistory {
  id: string
  action: 'activated' | 'deactivated'
  performed_by: string
  performed_at: string
  notes: string | null
}

export const fetchModules = () =>
  apiClient.get<{ data: Module[] }>('/platform/v1/modules')

export const fetchTenantModules = (tenantId: string) =>
  apiClient.get<{ data: TenantModule[] }>(`/platform/v1/tenants/${tenantId}/modules`)

export const activateTenantModule = (tenantId: string, moduleKey: string) =>
  apiClient.post(`/platform/v1/tenants/${tenantId}/modules/${moduleKey}/activate`)

export const deactivateTenantModule = (tenantId: string, moduleKey: string) =>
  apiClient.post(`/platform/v1/tenants/${tenantId}/modules/${moduleKey}/deactivate`)

export const fetchModuleHistory = (tenantId: string, moduleKey: string) =>
  apiClient.get<{ data: ModuleActivationHistory[] }>(
    `/platform/v1/tenants/${tenantId}/modules/${moduleKey}/history`
  )
