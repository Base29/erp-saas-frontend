import { create } from 'zustand'
import { setToken } from '@/api/client'

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
  login: (token: string, user: AuthUser, isPlatform?: boolean) => void
  logout: () => void
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  role: null,
  isPlatform: false,

  login: (token, user, isPlatform = false) => {
    setToken(token)
    set({ token, user, role: user.role ?? null, isPlatform })
  },

  logout: () => {
    setToken(null)
    set({ token: null, user: null, role: null, isPlatform: false })
  },

  setUser: (user) => {
    set({ user, role: user.role ?? null })
  },
}))
