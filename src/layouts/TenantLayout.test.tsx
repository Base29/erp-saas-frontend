import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TenantLayout from './TenantLayout'
import { useAuthStore } from '@/store/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { APP_VERSION } from '@/utils/version'

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
    expect(screen.getByText('Bulk Upload')).toBeInTheDocument()
    expect(screen.getByText('Genie AI')).toBeInTheDocument()
    expect(screen.getAllByText(APP_VERSION).length).toBeGreaterThan(0)
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

  it('hides Bulk Upload and Genie AI in header when permissions are revoked', () => {
    useAuthStore.setState({
      user: { id: 2, name: 'Viewer User', email: 'viewer@test.com' },
      role: 'viewer',
      token: 'fake-token',
      activeModules: ['accounts', 'sales', 'inventory'],
      permissions: ['sales.read'], // No settings, no genie
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantLayout />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.queryByText('Bulk Upload')).not.toBeInTheDocument()
    expect(screen.queryByText('Genie AI')).not.toBeInTheDocument()
    expect(screen.queryByText('Ask Genie AI or Search...')).not.toBeInTheDocument()
  })

  it('closes open menu group when opening another menu group', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <TenantLayout />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const accountsBtn = screen.getAllByRole('button', { name: /Accounts/i })[0]
    const salesBtn = screen.getAllByRole('button', { name: /Sales/i })[0]

    // Open Accounts group
    fireEvent.click(accountsBtn)

    const chartOfAccountsLink = screen.getAllByText('Chart of Accounts')[0].closest('a')
    const chartOfAccountsContainer = chartOfAccountsLink?.parentElement
    expect(chartOfAccountsContainer).toHaveClass('max-h-[1000px]')
    expect(chartOfAccountsContainer).not.toHaveClass('max-h-0')

    // Open Sales group -> Accounts should automatically close
    fireEvent.click(salesBtn)

    const customersLink = screen.getAllByText('Customers')[0].closest('a')
    const customersContainer = customersLink?.parentElement

    // Sales is now open
    expect(customersContainer).toHaveClass('max-h-[1000px]')
    expect(customersContainer).not.toHaveClass('max-h-0')

    // Accounts is closed
    expect(chartOfAccountsContainer).toHaveClass('max-h-0')
    expect(chartOfAccountsContainer).not.toHaveClass('max-h-[1000px]')
  })

  it('collapses open menu group when clicking its header button again', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <TenantLayout />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const accountsBtn = screen.getAllByRole('button', { name: /Accounts/i })[0]

    // Open Accounts group
    fireEvent.click(accountsBtn)
    const chartOfAccountsContainer = screen.getAllByText('Chart of Accounts')[0].closest('a')?.parentElement
    expect(chartOfAccountsContainer).toHaveClass('max-h-[1000px]')

    // Click Accounts again to collapse it
    fireEvent.click(accountsBtn)
    expect(chartOfAccountsContainer).toHaveClass('max-h-0')
  })

  it('auto-expands matching menu group on initial load of deep link', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sales/orders']}>
          <TenantLayout />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const customersContainer = screen.getAllByText('Customers')[0].closest('a')?.parentElement
    const chartOfAccountsContainer = screen.getAllByText('Chart of Accounts')[0].closest('a')?.parentElement

    // Sales group should be expanded
    expect(customersContainer).toHaveClass('max-h-[1000px]')
    // Other groups like Accounts should be closed
    expect(chartOfAccountsContainer).toHaveClass('max-h-0')
  })
})
