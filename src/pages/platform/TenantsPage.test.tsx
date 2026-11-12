import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TenantsPage from './TenantsPage'
import * as platformApi from '@/api/platform'

vi.mock('@/api/platform', async () => {
  const actual = await vi.importActual<typeof platformApi>('@/api/platform')
  return {
    ...actual,
    fetchTenants: vi.fn(),
    suspendTenant: vi.fn(),
    reactivateTenant: vi.fn(),
  }
})

describe('TenantsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders Tenants table with Actions column header and action icons', async () => {
    vi.mocked(platformApi.fetchTenants).mockResolvedValue({
      data: {
        data: [
          {
            id: 'tenant-123',
            name: 'Acme Corp',
            subdomain: 'acme',
            db_name: 'tenant_acme',
            status: 'active',
            plan_name: 'Enterprise',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        current_page: 1,
        per_page: 10,
        total: 1,
        last_page: 1,
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Heading
    expect(screen.getByRole('heading', { name: /tenants/i })).toBeInTheDocument()

    // Table header should contain Actions
    expect(await screen.findByText('Actions')).toBeInTheDocument()

    // Row data
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()

    // Action buttons
    expect(screen.getByTitle('View Details')).toBeInTheDocument()
    expect(screen.getByTitle('Manage Modules')).toBeInTheDocument()
    expect(screen.getByTitle('More Options')).toBeInTheDocument()
  })
})
