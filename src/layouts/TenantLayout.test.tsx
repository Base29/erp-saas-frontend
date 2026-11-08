import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TenantLayout from './TenantLayout'
import { useAuthStore } from '@/store/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('TenantLayout', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    useAuthStore.setState({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com' },
      role: 'tenant_admin',
      token: 'fake-token',
      activeModules: ['accounts', 'sales', 'inventory'],
    })
  })

  it('renders tenant layout with navigation and header elements', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantLayout />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0)
  })
})
