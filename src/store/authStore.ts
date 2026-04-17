import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setToken } from '@/api/client'
import apiClient from '@/api/client'

export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'accountant'
  | 'sales_manager'
  | 'sales_person'
  | 'inventory_manager'
  | 'viewer'

export interface AuthUser {
  id: number
  name: string
  email: string
  role?: UserRole
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  role: UserRole | null
  isPlatform: boolean
  activeModules: string[]
  login: (token: string, user: AuthUser, isPlatform?: boolean) => Promise<void>
  logout: () => void
  setUser: (user: AuthUser) => void
  setActiveModules: (modules: string[]) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      role: null,
      isPlatform: false,
      activeModules: [],

      login: async (token, user, isPlatform = false) => {
        setToken(token)
        set({ token, user, role: user.role ?? null, isPlatform, activeModules: [] })

        // Fetch active modules for tenant users (not platform admins)
        if (!isPlatform) {
          try {
            const res = await apiClient.get<{ data: string[] }>('/v1/settings/active-modules')
            set({ activeModules: res.data.data ?? [] })
          } catch {
            // Non-fatal: default to empty (all modules treated as inactive)
          }
        }
      },

      logout: () => {
        setToken(null)
        set({ token: null, user: null, role: null, isPlatform: false, activeModules: [] })
      },

      setUser: (user) => {
        set({ user, role: user.role ?? null })
      },

      setActiveModules: (modules) => {
        set({ activeModules: modules })
      },
    }),
    {
      name: 'auth-storage',
      // Rehydrate the in-memory token on store load so axios interceptor has it
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token)
      },
    }
  )
)
