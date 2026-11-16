import axios from 'axios'
import { getSubdomain } from '@/utils/subdomain'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Attach JWT Bearer token and tenant subdomain header
apiClient.interceptors.request.use(async (config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const subdomain = import.meta.env.VITE_TENANT_SUBDOMAIN || getSubdomain()
  if (subdomain) {
    config.headers['X-Tenant-Subdomain'] = subdomain
  }

  // Add active company ID if selected
  const { useAuthStore } = await import('@/store/authStore')
  const companyId = useAuthStore.getState().activeCompanyId
  if (companyId) {
    config.headers['X-Company-ID'] = companyId
  }

  return config
})

// Redirect to login on 401 & handle stale company context on 403
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If request failed because of an invalid or stale company header, reset active company ID
    if (error.response?.status === 403 && error.response?.data?.message?.toLowerCase().includes('company')) {
      import('@/store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().setActiveCompanyId(null)
      })
    }

    const url = error.config?.url || ''
    if (url.includes('/auth/') || url.includes('/v1/settings/')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      // Clear token and redirect; the router guard will handle the rest
      setToken(null)
      import('@/store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().logout()
      })
      const isPlatform = window.location.pathname.startsWith('/platform')
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = isPlatform ? '/platform/login' : '/login'
      }
    }
    return Promise.reject(error)
  }
)

// In-memory token storage with localStorage rehydration fallback
let _token: string | null = null

export function getToken(): string | null {
  if (_token) return _token
  try {
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.token) {
        _token = parsed.state.token
        return _token
      }
    }
  } catch {
    // non-fatal
  }
  return null
}

export function setToken(token: string | null): void {
  _token = token
}

export default apiClient
