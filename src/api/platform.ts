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
