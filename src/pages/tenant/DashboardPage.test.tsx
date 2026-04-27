import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TenantDashboardPage from './DashboardPage'
import { useAuthStore } from '@/store/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Mock the API call
vi.mock('@/api/tenant', () => ({
  fetchDashboardSummary: vi.fn(),
}))

import { fetchDashboardSummary } from '@/api/tenant'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const mockSummary = {
  data: {
    financials: {
      revenue: 50000,
      expenses: 30000,
      net_profit: 20000,
    },
    sales: {
      total_orders: 15,
      pending_quotations: 3,
    },
    inventory: {
      total_items: 120,
      low_stock_items: 5,
    },
    companies: [
    { id: '1', name: 'Main Co', email: 'main@example.com', registration_number: 'REG123' },
    { id: '2', name: 'Sub Co', email: 'sub@example.com', registration_number: null },
  ],
  recent_activities: [
      {
        id: '1',
        type: 'Sale Order',
        reference: 'SO-1001',
        description: 'Order for Acme Corp',
        amount: 1500,
        date: '2026-04-27',
        status: 'created',
      },
      {
        id: '2',
        type: 'Receipt',
        reference: 'RCP-2002',
        description: 'Payment from Globex',
        amount: 2500,
        date: '2026-04-26',
        status: 'posted',
      },
    ],
  }
}

describe('TenantDashboardPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    useAuthStore.setState({ 
      user: { id: 1, name: 'Admin', email: 'admin@test.com' },
      token: 'fake-token'
    })
  })

  it('renders loading state initially', () => {
    vi.mocked(fetchDashboardSummary).mockReturnValue(new Promise(() => {}))
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Should show skeletons (represented by div with animate-pulse usually, but we check for text)
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument()
  })

  it('renders dashboard widgets with data', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Wait for the main heading to appear (meaning loading is done)
    expect(await screen.findByText(/Welcome back, Admin/)).toBeInTheDocument()

    // Check financial stats
    expect(screen.getAllByText(/50,000/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/20,000/).length).toBeGreaterThan(0)

    // Check sales/inventory stats
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Low Stock/).length).toBeGreaterThan(0)

    // Check recent activities
    expect(screen.getByText(/SO-1001/)).toBeInTheDocument()
    expect(screen.getByText(/RCP-2002/)).toBeInTheDocument()
    expect(screen.getByText(/Order for Acme Corp/)).toBeInTheDocument()
  })

  it('renders quick action buttons', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Quick Actions')).toBeInTheDocument()

    expect(screen.getByText('New Voucher')).toBeInTheDocument()
    expect(screen.getByText('New Sale Order')).toBeInTheDocument()
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })

  it('renders companies widget', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Your Companies')).toBeInTheDocument()
    expect(screen.getByText('Main Co')).toBeInTheDocument()
    expect(screen.getByText('Sub Co')).toBeInTheDocument()
    expect(screen.getByText(/REG123/)).toBeInTheDocument()
  })
})
