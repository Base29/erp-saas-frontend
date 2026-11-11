import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryCombobox, { type CategoryOption } from './CategoryCombobox'

const mockCategories: CategoryOption[] = [
  { id: 'cat-1', label: 'Expenses [5000]', name: 'Expenses', code: '5000', depth: 1 },
  { id: 'cat-2', label: 'Expenses > Operating Expenses [5200]', name: 'Operating Expenses', code: '5200', depth: 2 },
  { id: 'cat-3', label: 'Expenses > Operating Expenses > Trainee Salaries [5210]', name: 'Trainee Salaries', code: '5210', depth: 3 },
  { id: 'cat-4', label: 'Assets [1000]', name: 'Assets', code: '1000', depth: 1 },
]

describe('CategoryCombobox', () => {
  it('renders with "All Categories" selected by default when includeAllOption is true', () => {
    render(
      <CategoryCombobox
        value={null}
        onChange={vi.fn()}
        categories={mockCategories}
        includeAllOption={true}
      />
    )
    expect(screen.getByText('All Categories')).toBeInTheDocument()
  })

  it('renders selected category label when value is provided', () => {
    render(
      <CategoryCombobox
        value="cat-3"
        onChange={vi.fn()}
        categories={mockCategories}
        includeAllOption={true}
      />
    )
    expect(screen.getByText('Expenses > Operating Expenses > Trainee Salaries [5210]')).toBeInTheDocument()
  })

  it('opens dropdown and displays categories on click', () => {
    render(
      <CategoryCombobox
        value={null}
        onChange={vi.fn()}
        categories={mockCategories}
        includeAllOption={true}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    expect(screen.getByPlaceholderText('Search categories by name or code…')).toBeInTheDocument()
    expect(screen.getByText('4 categories available')).toBeInTheDocument()
  })

  it('filters categories when typing in search input', () => {
    render(
      <CategoryCombobox
        value={null}
        onChange={vi.fn()}
        categories={mockCategories}
        includeAllOption={true}
      />
    )

    fireEvent.pointerDown(screen.getByRole('combobox'), { pointerId: 1, button: 0 })

    const searchInput = screen.getByPlaceholderText('Search categories by name or code…')
    fireEvent.change(searchInput, { target: { value: 'Trainee' } })

    expect(screen.getByText('1 matching category')).toBeInTheDocument()
    expect(screen.getByText('Expenses > Operating Expenses > Trainee Salaries [5210]')).toBeInTheDocument()
    expect(screen.queryByText('Assets [1000]')).not.toBeInTheDocument()
  })

  it('selects category and calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(
      <CategoryCombobox
        value={null}
        onChange={onChange}
        categories={mockCategories}
        includeAllOption={true}
      />
    )

    fireEvent.pointerDown(screen.getByRole('combobox'), { pointerId: 1, button: 0 })

    const option = screen.getByText('Expenses > Operating Expenses > Trainee Salaries [5210]')
    fireEvent.click(option)

    expect(onChange).toHaveBeenCalledWith('cat-3')
  })

  it('clears selection when clear button is clicked', () => {
    const onChange = vi.fn()
    render(
      <CategoryCombobox
        value="cat-3"
        onChange={onChange}
        categories={mockCategories}
        includeAllOption={true}
      />
    )

    const clearBtn = screen.getByTitle('Clear filter')
    fireEvent.click(clearBtn)

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
