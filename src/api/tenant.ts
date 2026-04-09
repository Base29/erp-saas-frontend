import apiClient from './client'
import type { AuthUser } from '@/store/authStore'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const tenantLogin = (email: string, password: string) =>
  apiClient.post<{ token: string; user: AuthUser }>('/v1/auth/login', { email, password })

export const tenantLogout = () => apiClient.post('/v1/auth/logout')

export const tenantMe = () => apiClient.get<{ data: AuthUser }>('/v1/auth/me')

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number
  type: string
  title: string
  body: string | null
  related_model_type: string | null
  related_model_id: number | null
  is_read: boolean
  created_at: string
}

export const fetchUnreadCount = () =>
  apiClient.get<{ data: { count: number } }>('/v1/notifications/unread-count')

export const fetchNotifications = () =>
  apiClient.get<{ data: Notification[] }>('/v1/notifications')

export const markNotificationRead = (id: number) =>
  apiClient.post(`/v1/notifications/${id}/read`)

// ── Fiscal Periods ────────────────────────────────────────────────────────────
export interface FiscalPeriod {
  id: number
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}

export const fetchFiscalPeriods = () =>
  apiClient.get<{ data: FiscalPeriod[] }>('/v1/settings/fiscal-periods')

export const createFiscalPeriod = (payload: Omit<FiscalPeriod, 'id' | 'status'>) =>
  apiClient.post<{ data: FiscalPeriod }>('/v1/settings/fiscal-periods', payload)

export const closeFiscalPeriod = (id: number) =>
  apiClient.post<{ data: FiscalPeriod }>(`/v1/settings/fiscal-periods/${id}/close`)

// ── Tax Settings ──────────────────────────────────────────────────────────────
export interface TaxSetting {
  id: number
  name: string
  rate_percentage: number
  is_active: boolean
}

export const fetchTaxSettings = () =>
  apiClient.get<{ data: TaxSetting[] }>('/v1/settings/tax-settings')

export const upsertTaxSetting = (payload: Omit<TaxSetting, 'id'>) =>
  apiClient.post<{ data: TaxSetting }>('/v1/settings/tax-settings', payload)

// ── Sequences ─────────────────────────────────────────────────────────────────
export interface Sequence {
  id: number
  document_type: string
  prefix: string
  suffix: string
  next_number: number
  padding_length: number
  reset_rule: 'never' | 'yearly' | 'monthly'
}

export const fetchSequences = () =>
  apiClient.get<{ data: Sequence[] }>('/v1/settings/sequences')

export const updateSequence = (id: number, payload: Partial<Sequence>) =>
  apiClient.patch<{ data: Sequence }>(`/v1/settings/sequences/${id}`, payload)

// ── Users ─────────────────────────────────────────────────────────────────────
export interface TenantUser {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export const fetchUsers = () =>
  apiClient.get<{ data: TenantUser[] }>('/v1/settings/users')

export const createUser = (payload: { name: string; email: string; password: string; role: string }) =>
  apiClient.post<{ data: TenantUser }>('/v1/settings/users', payload)

export const updateUser = (id: number, payload: Partial<TenantUser>) =>
  apiClient.patch<{ data: TenantUser }>(`/v1/settings/users/${id}`, payload)

export const deactivateUser = (id: number) =>
  apiClient.post<{ data: TenantUser }>(`/v1/settings/users/${id}/deactivate`)

// ── Attachments ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: number
  original_filename: string
  mime_type: string
  file_size_bytes: number
  created_at: string
}

export const uploadAttachment = (
  attachableType: string,
  attachableId: number,
  file: File
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('attachable_type', attachableType)
  form.append('attachable_id', String(attachableId))
  return apiClient.post<{ data: Attachment }>('/v1/attachments', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteAttachment = (id: number) =>
  apiClient.delete(`/v1/attachments/${id}`)

export const fetchAttachments = (attachableType: string, attachableId: number) =>
  apiClient.get<{ data: Attachment[] }>(
    `/v1/attachments?attachable_type=${attachableType}&attachable_id=${attachableId}`
  )
