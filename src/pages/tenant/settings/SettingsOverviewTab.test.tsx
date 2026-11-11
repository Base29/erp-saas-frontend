import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsOverviewTab, { SETTING_TILES } from './SettingsOverviewTab'
import { useAuthStore } from '@/store/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/ThemeProvider'

// Mock the API calls
vi.mock('@/api/tenant', () => ({
  fetchCompanies: vi.fn().mockResolvedValue({ data: { total: 2, data: [{ id: '1', name: 'Alpha' }] } }),
  fetchFiscalPeriods: vi.fn().mockResolvedValue({ data: { total: 4, data: [] } }),
  fetchTaxSettings: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', name: 'VAT', rate_percentage: 16, is_active: true }] } }),
  fetchSequences: vi.fn().mockResolvedValue({ data: { total: 8, data: [] } }),
  fetchUsers: vi.fn().mockResolvedValue({ data: { total: 5, data: [] } }),
  fetchProductCategories: vi.fn().mockResolvedValue({ data: { total: 6, data: [] } }),
  fetchCustomerCategories: vi.fn().mockResolvedValue({ data: { total: 3, data: [] } }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('SettingsOverviewTab', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    useAuthStore.setState({
      user: { id: 1, name: 'Admin User', email: 'admin@genie.cloud' },
      role: 'tenant_admin',
      token: 'fake-token',
      activeModules: ['accounts', 'sales', 'inventory', 'projects'],
    })
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <SettingsOverviewTab />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    )

  it('renders the Settings screen header, title, and platform status', () => {
    renderComponent()

    expect(screen.getByText('Platform Settings & Quick Access')).toBeInTheDocument()
    expect(screen.getByText('Platform Status')).toBeInTheDocument()
    expect(screen.getByText('Operational')).toBeInTheDocument()
    expect(screen.getByText(`${SETTING_TILES.length} Modules`)).toBeInTheDocument()
  })

  it('renders quick access tiles for every setting on the platform', () => {
    renderComponent()

    // Key settings tiles across all categories
    expect(screen.getByText('Companies & Branches')).toBeInTheDocument()
    expect(screen.getByText('Active Modules')).toBeInTheDocument()
    expect(screen.getByText('Fiscal Periods')).toBeInTheDocument()
    expect(screen.getByText('Tax Settings & Rates')).toBeInTheDocument()
    expect(screen.getByText('Account Categories')).toBeInTheDocument()
    expect(screen.getByText('Sequences & Numbering')).toBeInTheDocument()
    expect(screen.getByText('Chart of Accounts Ledger')).toBeInTheDocument()
    expect(screen.getByText('Cost Centers & Allocation')).toBeInTheDocument()
    expect(screen.getByText('Product Categories')).toBeInTheDocument()
    expect(screen.getByText('Customer Categories')).toBeInTheDocument()
    expect(screen.getByText('Price Lists & Rates')).toBeInTheDocument()
    expect(screen.getByText('Warehouses & Locations')).toBeInTheDocument()
    expect(screen.getByText('Bulk Upload & Migration')).toBeInTheDocument()
    expect(screen.getByText('Users & Permissions')).toBeInTheDocument()
    expect(screen.getByText('Audit & Recent Activities')).toBeInTheDocument()
    expect(screen.getByText('Theme & Appearance')).toBeInTheDocument()
  })

  it('filters tiles when user types into the search input', () => {
    renderComponent()

    const searchInput = screen.getByPlaceholderText(/search settings/i)
    fireEvent.change(searchInput, { target: { value: 'tax' } })

    // "Tax Settings & Rates" should be visible
    expect(screen.getByText('Tax Settings & Rates')).toBeInTheDocument()

    // Unrelated tiles should not be rendered
    expect(screen.queryByText('Warehouses & Locations')).not.toBeInTheDocument()
    expect(screen.queryByText('Chart of Accounts Ledger')).not.toBeInTheDocument()
  })

  it('filters tiles when user selects a category pill', () => {
    renderComponent()

    const financePill = screen.getByRole('button', { name: /finance & accounting/i })
    fireEvent.click(financePill)

    // Finance items should be present
    expect(screen.getByText('Fiscal Periods')).toBeInTheDocument()
    expect(screen.getByText('Tax Settings & Rates')).toBeInTheDocument()
    expect(screen.getByText('Sequences & Numbering')).toBeInTheDocument()

    // Non-finance items should be hidden
    expect(screen.queryByText('Product Categories')).not.toBeInTheDocument()
    expect(screen.queryByText('Companies & Branches')).not.toBeInTheDocument()
  })

  it('displays empty state and resets search when no settings match', () => {
    renderComponent()

    const searchInput = screen.getByPlaceholderText(/search settings/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistent-xyz-query' } })

    expect(screen.getByText(/no settings found/i)).toBeInTheDocument()

    const resetButton = screen.getByRole('button', { name: /reset filters/i })
    fireEvent.click(resetButton)

    expect(screen.getByText('Companies & Branches')).toBeInTheDocument()
  })

  it('displays live badges and metric counts on tiles', async () => {
    renderComponent()

    expect(await screen.findByText('2 Entities')).toBeInTheDocument()
    expect(await screen.findByText('4 Modules Active')).toBeInTheDocument()
    expect(await screen.findByText('16% VAT')).toBeInTheDocument()
    expect(await screen.findByText('8 Sequences')).toBeInTheDocument()
    expect(await screen.findByText('5 Users')).toBeInTheDocument()
  })

  it('supports interactive theme switching from the theme tile', () => {
    renderComponent()

    const darkBtn = screen.getByRole('button', { name: /dark/i })
    fireEvent.click(darkBtn)

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    const lightBtn = screen.getByRole('button', { name: /light/i })
    fireEvent.click(lightBtn)

    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
