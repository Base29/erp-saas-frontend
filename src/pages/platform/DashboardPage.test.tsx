import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PlatformDashboardPage from './DashboardPage'
import * as platformApi from '@/api/platform'

vi.mock('@/api/platform', async () => {
  const actual = await vi.importActual<typeof platformApi>('@/api/platform')
  return {
    ...actual,
    fetchPlatformDashboard: vi.fn(),
  }
})

describe('PlatformDashboardPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders quick action tiles and triggers dialog', async () => {
    vi.mocked(platformApi.fetchPlatformDashboard).mockResolvedValue({
      data: {
        data: {
          total_tenants: 5,
          active_tenants: 4,
          recent_provisioning_events: [],
        },
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PlatformDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Heading
    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()

    // Quick Actions header
    expect(await screen.findByText('Quick Actions')).toBeInTheDocument()

    // Quick Action Tiles
    expect(screen.getByText('Manage Tenants')).toBeInTheDocument()
    expect(screen.getAllByText('Active Tenants')).toHaveLength(2)
    expect(screen.getByText('System Console')).toBeInTheDocument()

    // Click "Create Tenant" quick action tile
    const createTile = screen.getAllByText('Create Tenant')[1] // 0 is top button, 1 is tile
    fireEvent.click(createTile)

    // Dialog title should appear
    expect(screen.getByText('Create New Tenant')).toBeInTheDocument()
  })
})
