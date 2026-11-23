import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlatformLayout from './PlatformLayout'
import { useAuthStore } from '@/store/authStore'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('PlatformLayout', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    useAuthStore.setState({
      user: { id: 1, name: 'Super Admin', email: 'admin@platform.com' },
      isPlatform: true,
      token: 'fake-token',
    })
  })

  it('renders platform layout correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PlatformLayout />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Platform Admin')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tenants')).toBeInTheDocument()
  })
})
