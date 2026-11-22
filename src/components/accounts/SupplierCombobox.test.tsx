import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SupplierCombobox from './SupplierCombobox'
import { type Supplier } from '@/api/tenant'

const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    supplier_code: 'SUP-001',
    name: 'Acme Industrial Supplies',
    email: 'sales@acme.com',
    phone: '555-0100',
    is_active: true,
    current_balance: 1450.5,
  },
  {
    id: 'sup-2',
    supplier_code: 'SUP-002',
    name: 'Global Packaging Ltd',
    email: 'info@globalpkg.com',
    phone: '555-0200',
    is_active: true,
    current_balance: 0,
  },
  {
    id: 'sup-3',
    supplier_code: 'SUP-003',
    name: 'Zenith Logistics',
    email: 'contact@zenith.com',
    phone: '555-0300',
    is_active: true,
  },
]

describe('SupplierCombobox', () => {
  it('renders placeholder when no value is provided', () => {
    render(
      <SupplierCombobox
        value=""
        onChange={vi.fn()}
        suppliers={mockSuppliers}
        placeholder="Select supplier…"
      />
    )
    expect(screen.getByText('Select supplier…')).toBeInTheDocument()
  })

  it('renders selected supplier code, name, and balance', () => {
    render(
      <SupplierCombobox
        value="sup-1"
        onChange={vi.fn()}
        suppliers={mockSuppliers}
      />
    )
    expect(screen.getByText('SUP-001')).toBeInTheDocument()
    expect(screen.getByText('Acme Industrial Supplies')).toBeInTheDocument()
    expect(screen.getByText('Bal: $1450.50')).toBeInTheDocument()
  })

  it('opens search popup with all suppliers', () => {
    render(
      <SupplierCombobox
        value=""
        onChange={vi.fn()}
        suppliers={mockSuppliers}
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    expect(screen.getByPlaceholderText('Search suppliers by name or code…')).toBeInTheDocument()
    expect(screen.getByText('3 suppliers available')).toBeInTheDocument()
    expect(screen.getByText('Acme Industrial Supplies')).toBeInTheDocument()
    expect(screen.getByText('Global Packaging Ltd')).toBeInTheDocument()
    expect(screen.getByText('Zenith Logistics')).toBeInTheDocument()
  })

  it('filters suppliers in real-time by search query (name, code)', () => {
    render(
      <SupplierCombobox
        value=""
        onChange={vi.fn()}
        suppliers={mockSuppliers}
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const input = screen.getByPlaceholderText('Search suppliers by name or code…')
    fireEvent.change(input, { target: { value: 'Zenith' } })

    expect(screen.getByText('Zenith Logistics')).toBeInTheDocument()
    expect(screen.queryByText('Acme Industrial Supplies')).not.toBeInTheDocument()
    expect(screen.getByText('1 matching supplier')).toBeInTheDocument()
  })

  it('calls onChange with selected supplier id and closes dropdown', () => {
    const handleChange = vi.fn()
    render(
      <SupplierCombobox
        value=""
        onChange={handleChange}
        suppliers={mockSuppliers}
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const option = screen.getByText('Global Packaging Ltd')
    fireEvent.click(option)

    expect(handleChange).toHaveBeenCalledWith('sup-2')
  })
})
