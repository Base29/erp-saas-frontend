import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TenantNotFoundPage from './TenantNotFoundPage'

describe('TenantNotFoundPage', () => {
  it('renders the 404 organization not found screen with subdomain details', () => {
    render(<TenantNotFoundPage subdomain="acme" />)

    expect(screen.getByText('Organization Not Found')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(screen.getByText(/There is currently no tenant provisioned by the name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Genie Cloud Home/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Platform Control Plane/i })).not.toBeInTheDocument()
  })

  it('redirects to https://getgeniecloud.com when clicking Go to Genie Cloud Home', () => {
    delete (window as any).location
    window.location = { href: '', host: 'acme.geniecloud.dev' } as any

    render(<TenantNotFoundPage subdomain="acme" />)
    const homeBtn = screen.getByRole('button', { name: /Go to Genie Cloud Home/i })
    homeBtn.click()

    expect(window.location.href).toBe('https://getgeniecloud.com')
  })
})
