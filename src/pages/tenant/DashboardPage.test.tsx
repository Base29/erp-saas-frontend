import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    active_modules: ['accounts', 'sales', 'inventory', 'projects'],
  }
}

describe('TenantDashboardPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    useAuthStore.setState({ 
      user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'tenant_admin' },
      role: 'tenant_admin',
      permissions: ['*'],
      activeModules: ['accounts', 'sales', 'inventory', 'projects'],
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

  it('renders quick access launchpad with categorized tiles and allows search', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Quick Access Launchpad')).toBeInTheDocument()
    expect(screen.getByText('Chart of Accounts')).toBeInTheDocument()
    expect(screen.getByText('Items & Products')).toBeInTheDocument()
    expect(screen.getByText('Customers Directory')).toBeInTheDocument()

    // Test search filter on tiles
    const searchInput = screen.getByPlaceholderText('Search access tiles...')
    fireEvent.change(searchInput, { target: { value: 'Chart' } })

    expect(screen.getByText('Chart of Accounts')).toBeInTheDocument()
    expect(screen.queryByText('Items & Products')).not.toBeInTheDocument()
  })

  it('filters quick access tiles by category tab', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Quick Access Launchpad')).toBeInTheDocument()

    // Click on "Inventory & Stock"
    const inventoryTab = screen.getByRole('button', { name: 'Inventory & Stock' })
    fireEvent.click(inventoryTab)

    expect(screen.getByText('Items & Products')).toBeInTheDocument()
    expect(screen.getByText('Warehouses')).toBeInTheDocument()
    expect(screen.queryByText('Chart of Accounts')).not.toBeInTheDocument()
  })

  it('renders and filters latest happenings feed', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Latest Happenings')).toBeInTheDocument()
    expect(screen.getByText('Live Stream')).toBeInTheDocument()

    // Both activities should initially be visible
    expect(screen.getByText('SO-1001')).toBeInTheDocument()
    expect(screen.getByText('RCP-2002')).toBeInTheDocument()

    // Filter by "Orders & Sales"
    const salesFilter = screen.getByRole('button', { name: 'Orders & Sales' })
    fireEvent.click(salesFilter)

    expect(screen.getByText('SO-1001')).toBeInTheDocument()
    expect(screen.queryByText('RCP-2002')).not.toBeInTheDocument()

    // Search inside happenings
    const happeningsSearch = screen.getByPlaceholderText('Filter events...')
    fireEvent.change(happeningsSearch, { target: { value: 'Nonexistent' } })

    expect(screen.getByText('No recent happenings match your criteria.')).toBeInTheDocument()
  })

  it('hides module widgets when user lacks permission for that module', async () => {
    // User with only sales and inventory access (accounts revoked)
    useAuthStore.setState({
      user: { id: 2, name: 'Restricted User', email: 'user@test.com', role: 'viewer' },
      role: 'viewer',
      permissions: ['sales.read', 'inventory.read'],
      activeModules: ['accounts', 'sales', 'inventory', 'projects'],
      token: 'fake-token',
    })

    const summaryWithoutAccounts = {
      data: {
        financials: null, // Backend omits financials
        sales: {
          total_orders: 8,
          pending_quotations: 2,
        },
        inventory: {
          total_items: 50,
          low_stock_items: 2,
        },
        companies: [],
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
      },
    }

    vi.mocked(fetchDashboardSummary).mockResolvedValue(summaryWithoutAccounts as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText(/Welcome back, Restricted User/)).toBeInTheDocument()

    // Financial KPI cards and summary should be completely hidden
    expect(screen.queryByText('Monthly Revenue')).not.toBeInTheDocument()
    expect(screen.queryByText('Monthly Profit')).not.toBeInTheDocument()
    expect(screen.queryByText('Financial Summary')).not.toBeInTheDocument()

    // Sales and Inventory KPI cards should be visible
    expect(screen.getByText('Sales Orders')).toBeInTheDocument()
    expect(screen.getByText('Low Stock Items')).toBeInTheDocument()

    // Quick Actions: Viewer without write permissions should not see write action buttons
    expect(screen.queryByText('New Voucher')).not.toBeInTheDocument()
    expect(screen.queryByText('New Sale Order')).not.toBeInTheDocument()
    expect(screen.queryByText('Add Item')).not.toBeInTheDocument()

    // Accounts quick access tiles should be hidden
    expect(screen.queryByText('Chart of Accounts')).not.toBeInTheDocument()
    expect(screen.queryByText('Journal Vouchers')).not.toBeInTheDocument()

    // Sales & inventory quick access tiles should still be visible
    expect(screen.getByText('Sale Orders')).toBeInTheDocument()
    expect(screen.getByText('Items & Products')).toBeInTheDocument()

    // Category pills: "Finance & Accounts" and "Settings & Admin" should be hidden
    expect(screen.queryByRole('button', { name: 'Finance & Accounts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Settings & Admin' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sales & Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inventory & Stock' })).toBeInTheDocument()

    // Finance tab in happenings should be hidden
    expect(screen.queryByRole('button', { name: 'Finance & Vouchers' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orders & Sales' })).toBeInTheDocument()

    // Finance activity should be filtered out from live stream
    expect(screen.getByText('SO-1001')).toBeInTheDocument()
    expect(screen.queryByText('RCP-2002')).not.toBeInTheDocument()
  })

  it('hides module widgets when a module is not active for the tenant even if user is admin', async () => {
    // Admin user with full permissions '*' but only 'sales' is active for this tenant
    useAuthStore.setState({
      user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'tenant_admin' },
      role: 'tenant_admin',
      permissions: ['*'],
      activeModules: ['sales'], // accounts & inventory are inactive
      token: 'fake-token',
    })

    const summaryData = {
      data: {
        financials: null,
        sales: {
          total_orders: 12,
          pending_quotations: 4,
        },
        inventory: null,
        companies: [
          { id: '1', name: 'Main Co', email: 'main@example.com', registration_number: 'REG123' },
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
            type: 'Journal Voucher',
            reference: 'JV-2002',
            description: 'Depreciation entry',
            amount: 500,
            date: '2026-04-26',
            status: 'posted',
          },
        ],
        active_modules: ['sales'],
      },
    }

    vi.mocked(fetchDashboardSummary).mockResolvedValue(summaryData as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText(/Welcome back, Admin/)).toBeInTheDocument()

    // Accounts & Inventory KPI cards should NOT be visible
    expect(screen.queryByText('Monthly Revenue')).not.toBeInTheDocument()
    expect(screen.queryByText('Monthly Profit')).not.toBeInTheDocument()
    expect(screen.queryByText('Low Stock Items')).not.toBeInTheDocument()
    expect(screen.queryByText('Financial Summary')).not.toBeInTheDocument()

    // Sales KPI card SHOULD be visible
    expect(screen.getByText('Sales Orders')).toBeInTheDocument()

    // Quick Actions: Only sales actions (New Sale Order, New Customer) visible; Accounts (New Voucher) and Inventory (Add Item) hidden
    expect(screen.queryByText('New Voucher')).not.toBeInTheDocument()
    expect(screen.queryByText('Add Item')).not.toBeInTheDocument()
    expect(screen.getByText('New Sale Order')).toBeInTheDocument()
    expect(screen.getByText('New Customer')).toBeInTheDocument()

    // Launchpad Tiles: Accounts and Inventory tiles hidden; Sales tiles visible
    expect(screen.queryByText('Chart of Accounts')).not.toBeInTheDocument()
    expect(screen.queryByText('Journal Vouchers')).not.toBeInTheDocument()
    expect(screen.queryByText('Items & Products')).not.toBeInTheDocument()
    expect(screen.queryByText('Warehouses')).not.toBeInTheDocument()
    expect(screen.getByText('Sale Orders')).toBeInTheDocument()
    expect(screen.getByText('Customers Directory')).toBeInTheDocument()

    // Category pills: Inactive module tabs hidden; active module tab visible
    expect(screen.queryByRole('button', { name: 'Finance & Accounts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inventory & Stock' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sales & Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings & Admin' })).toBeInTheDocument()

    // Happenings tabs: Inactive module tabs hidden
    expect(screen.queryByRole('button', { name: 'Finance & Vouchers' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inventory & Items' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orders & Sales' })).toBeInTheDocument()

    // Inactive module events hidden from live stream
    expect(screen.getByText('SO-1001')).toBeInTheDocument()
    expect(screen.queryByText('JV-2002')).not.toBeInTheDocument()

    // Companies widget still visible (settings)
    expect(screen.getByText('Your Companies')).toBeInTheDocument()
  })
})
