import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchableSelect, { type SearchableSelectOption } from './SearchableSelect'

const mockOptions: SearchableSelectOption[] = [
  { value: 'opt-1', label: 'Fiscal Year 2024-Q1', badge: 'Active' },
  { value: 'opt-2', label: 'Fiscal Year 2024-Q2', badge: 'Open' },
  { value: 'opt-3', label: 'Fiscal Year 2024-Q3', badge: 'Closed' },
  { value: 'opt-4', label: 'Archived Period 2023' },
]

describe('SearchableSelect', () => {
  it('renders placeholder when no value is selected', () => {
    render(
      <SearchableSelect
        value=""
        onValueChange={vi.fn()}
        options={mockOptions}
        placeholder="Select fiscal period…"
      />
    )
    expect(screen.getByText('Select fiscal period…')).toBeInTheDocument()
  })

  it('renders selected option label and badge', () => {
    render(
      <SearchableSelect
        value="opt-1"
        onValueChange={vi.fn()}
        options={mockOptions}
      />
    )
    expect(screen.getByText('Fiscal Year 2024-Q1')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('opens popup and filters options via search input', () => {
    render(
      <SearchableSelect
        value=""
        onValueChange={vi.fn()}
        options={mockOptions}
        searchPlaceholder="Search periods…"
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const input = screen.getByPlaceholderText('Search periods…')
    expect(input).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'Archived' } })

    expect(screen.getByText('Archived Period 2023')).toBeInTheDocument()
    expect(screen.queryByText('Fiscal Year 2024-Q1')).not.toBeInTheDocument()
  })

  it('calls onValueChange when an option is selected', () => {
    const handleValueChange = vi.fn()
    render(
      <SearchableSelect
        value=""
        onValueChange={handleValueChange}
        options={mockOptions}
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const option = screen.getByText('Fiscal Year 2024-Q2')
    fireEvent.click(option)

    expect(handleValueChange).toHaveBeenCalledWith('opt-2')
  })
})
