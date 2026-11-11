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
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0)
  })

  it('renders all report links under Reports menu head', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantLayout />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getAllByText('General Ledger').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Trial Balance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Profit & Loss').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Balance Sheet').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cash Flow').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Equity Changes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Customer Statement').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Supplier Statement').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sales Reports').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inventory Reports').length).toBeGreaterThan(0)
  })
})
