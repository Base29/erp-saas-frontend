import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Attach JWT Bearer token and tenant subdomain header
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const subdomain = import.meta.env.VITE_TENANT_SUBDOMAIN
  if (subdomain) {
    config.headers['X-Tenant-Subdomain'] = subdomain
  }
  return config
})

// Redirect to login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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

// In-memory token storage (avoids XSS via localStorage)
let _token: string | null = null

export function getToken(): string | null {
  return _token
}

export function setToken(token: string | null): void {
  _token = token
}

export default apiClient
