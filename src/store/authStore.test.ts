import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the api/client module to avoid import side effects
vi.mock('@/api/client', () => ({
  setToken: vi.fn(),
  default: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
}))

import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useAuthStore.setState({ token: null, user: null, role: null, isPlatform: false })
  })

  it('starts with null token, user, and role', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.role).toBeNull()
    expect(state.isPlatform).toBe(false)
  })

  it('login sets token, user, and role', () => {
    const { login } = useAuthStore.getState()
    login('test-token', { id: 1, name: 'Alice', email: 'alice@example.com', role: 'accountant' })

    const state = useAuthStore.getState()
    expect(state.token).toBe('test-token')
    expect(state.user?.name).toBe('Alice')
    expect(state.role).toBe('accountant')
    expect(state.isPlatform).toBe(false)
  })

  it('login with isPlatform=true sets isPlatform flag', () => {
    const { login } = useAuthStore.getState()
    login('platform-token', { id: 1, name: 'Admin', email: 'admin@example.com' }, true)

    expect(useAuthStore.getState().isPlatform).toBe(true)
  })

  it('logout clears all state', () => {
    const { login, logout } = useAuthStore.getState()
    login('test-token', { id: 1, name: 'Alice', email: 'alice@example.com', role: 'accountant' })
    logout()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.role).toBeNull()
    expect(state.isPlatform).toBe(false)
  })

  it('setUser updates user and role', () => {
    const { login, setUser } = useAuthStore.getState()
    login('test-token', { id: 1, name: 'Alice', email: 'alice@example.com', role: 'accountant' })
    setUser({ id: 1, name: 'Alice Updated', email: 'alice@example.com', role: 'sales_manager' })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Alice Updated')
    expect(state.role).toBe('sales_manager')
  })

  it('role defaults to null when user has no role', () => {
    const { login } = useAuthStore.getState()
    login('test-token', { id: 1, name: 'Alice', email: 'alice@example.com' })

    expect(useAuthStore.getState().role).toBeNull()
  })
})
