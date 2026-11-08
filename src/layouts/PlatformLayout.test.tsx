import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlatformLayout from './PlatformLayout'
import { useAuthStore } from '@/store/authStore'
import { BrowserRouter } from 'react-router-dom'

describe('PlatformLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 1, name: 'Super Admin', email: 'admin@platform.com' },
      isPlatform: true,
      token: 'fake-token',
    })
  })

  it('renders platform layout correctly', () => {
    render(
      <BrowserRouter>
        <PlatformLayout />
      </BrowserRouter>
    )

    expect(screen.getByText('Platform Admin')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tenants')).toBeInTheDocument()
  })
})
