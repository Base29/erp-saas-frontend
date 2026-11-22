import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PurchaseOrderFormPage from './PurchaseOrderFormPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// Mock the APIs
vi.mock('@/api/tenant', () => ({
  fetchSuppliers: vi.fn(),
  fetchItems: vi.fn(),
}))

vi.mock('@/api/procurement', () => ({
  procurementApi: {
    getRequisitions: vi.fn(),
    getRequisition: vi.fn(),
    createOrder: vi.fn(),
  },
}))

import { fetchSuppliers, fetchItems } from '@/api/tenant'
import { procurementApi } from '@/api/procurement'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const mockSuppliers = {
  data: {
    data: [
      { id: 'sup-1', name: 'Global Supplies Inc', supplier_code: 'SUP-001' },
      { id: 'sup-2', name: 'Acme Materials', supplier_code: 'SUP-002' },
    ],
  },
}

const mockItems = {
  data: {
    data: [
      { id: 'item-1', item_code: 'ITM-001', item_name: 'Industrial Bolt 50mm', base_unit_of_measure_id: 'uom-1' },
    ],
  },
}

const mockRequisitions = {
  data: [
    {
      id: 'pr-1',
      requisition_number: 'PR-2026-0001',
      purpose: 'Office Renovation Equipment',
      status: 'approved',
      approval_status: 'approved',
      total_estimated_amount: 1500,
      requester: { name: 'John Doe' },
      lines: [
        {
          id: 'pr-line-1',
          item_id: 'item-1',
          item_description: 'Industrial Bolt 50mm',
          quantity: 10,
          ordered_quantity: 4,
          estimated_unit_cost: 25,
          unit_of_measure_id: 'uom-1',
        },
      ],
    },
    {
      id: 'pr-completed',
      requisition_number: 'PR-2026-0002',
      purpose: 'Fully Ordered Requisition',
      status: 'fully_ordered',
      approval_status: 'approved',
      total_estimated_amount: 500,
      requester: { name: 'Jane Smith' },
      lines: [
        {
          id: 'pr-line-2',
          item_id: 'item-1',
          item_description: 'Industrial Bolt 50mm',
          quantity: 5,
          ordered_quantity: 5,
          estimated_unit_cost: 25,
        },
      ],
    },
  ],
}

describe('PurchaseOrderFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchSuppliers).mockResolvedValue(mockSuppliers as any)
    vi.mocked(fetchItems).mockResolvedValue(mockItems as any)
    vi.mocked(procurementApi.getRequisitions).mockResolvedValue(mockRequisitions as any)
    vi.mocked(procurementApi.getRequisition).mockImplementation((id: string) => {
      const match = mockRequisitions.data.find((r) => r.id === id)
      return Promise.resolve({ data: match } as any)
    })
  })

  it('renders the form with full width styling and PR selection dropdown', async () => {
    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <PurchaseOrderFormPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verify full width (w-full instead of max-w-6xl)
    const rootContainer = container.firstElementChild
    expect(rootContainer).toHaveClass('w-full')
    expect(rootContainer).not.toHaveClass('max-w-6xl')

    // Verify title
    expect(screen.getByText('Create Purchase Order')).toBeInTheDocument()

    // Verify Purchase Requisition label and button are present
    expect(screen.getByText('Purchase Requisition (Optional)')).toBeInTheDocument()
    const prDropdownTrigger = screen.getByRole('button', { name: /Purchase Requisition/i })
    expect(prDropdownTrigger).toBeInTheDocument()
  })

  it('opens PR dropdown with search bar and lists only approved & incomplete PRs', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <PurchaseOrderFormPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(procurementApi.getRequisitions).toHaveBeenCalledWith({
        incomplete_only: true,
        per_page: 100,
      })
    })

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    })

    const prDropdownTrigger = screen.getByRole('button', { name: /Purchase Requisition/i })
    fireEvent.pointerDown(prDropdownTrigger, { pointerId: 1, button: 0 })

    // Verify the search input bar is present inside the dropdown
    const searchInput = screen.getByPlaceholderText('Search PR #, purpose, requester, status…')
    expect(searchInput).toBeInTheDocument()

    // Verify that approved & incomplete PR is listed
    expect(screen.getByText('PR #PR-2026-0001')).toBeInTheDocument()
    expect(screen.getByText(/Office Renovation Equipment/i)).toBeInTheDocument()

    // Verify fully ordered PR is NOT in the list
    expect(screen.queryByText('PR #PR-2026-0002')).not.toBeInTheDocument()

    // Verify fake Direct Purchase Order option is NOT in the list
    expect(screen.queryByText('Direct Purchase Order (No PR)')).not.toBeInTheDocument()
  })

  it('populates line items with remaining quantity when PR is selected', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <PurchaseOrderFormPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(procurementApi.getRequisitions).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    })

    const prDropdownTrigger = screen.getByRole('button', { name: /Purchase Requisition/i })
    fireEvent.pointerDown(prDropdownTrigger, { pointerId: 1, button: 0 })

    // Click on PR #PR-2026-0001
    const prOption = screen.getByText('PR #PR-2026-0001')
    fireEvent.click(prOption)

    // Verify PR link appears
    await waitFor(() => {
      expect(screen.getAllByText(/PR #PR-2026-0001/i).length).toBeGreaterThan(0)
    })

    // Verify line item description populated
    expect(screen.getByDisplayValue('Industrial Bolt 50mm')).toBeInTheDocument()

    // Verify remaining quantity = 10 - 4 = 6
    expect(screen.getByDisplayValue('6')).toBeInTheDocument()

    // Verify notes populated with PR reference
    expect(screen.getByDisplayValue(/Imported from Requisition #PR-2026-0001/i)).toBeInTheDocument()
  })
})
