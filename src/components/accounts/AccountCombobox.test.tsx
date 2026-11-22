import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AccountCombobox, { isBankOrCashAccount } from './AccountCombobox'
import { type Account } from '@/api/tenant'

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    account_code: '1112-01-001',
    account_name: 'Operating Account - ABC Bank',
    account_type_id: 'type-asset',
    account_category_id: 'cat-domestic-banks',
    is_active: true,
    account_category: { id: 'cat-domestic-banks', parent_id: 'cat-banks', name: 'Domestic Banks', code: '1112-01', depth: 3, is_active: true },
  },
  {
    id: 'acc-2',
    account_code: '1111-01-001',
    account_name: 'Petty Cash Main',
    account_type_id: 'type-asset',
    account_category_id: 'cat-cash',
    is_active: true,
    account_category: { id: 'cat-cash', parent_id: null, name: 'Cash on Hand', code: '1111', depth: 2, is_active: true },
  },
  {
    id: 'acc-3',
    account_code: '30205',
    account_name: 'AHC-LLOYDS-1660',
    account_type_id: 'type-asset',
    account_category_id: 'cat-cash-bank',
    is_active: true,
    account_category: { id: 'cat-cash-bank', parent_id: null, name: 'Cash & Bank', code: '30200', depth: 2, is_active: true },
  },
  {
    id: 'acc-4',
    account_code: '5003',
    account_name: 'Bank Charges',
    account_type_id: 'type-expense',
    account_category_id: 'cat-expense',
    is_active: true,
    account_category: { id: 'cat-expense', parent_id: null, name: 'Operating Expenses', code: '5000', depth: 1, is_active: true },
  },
  {
    id: 'acc-5',
    account_code: '2110-001',
    account_name: 'Trade Payables',
    account_type_id: 'type-liability',
    account_category_id: 'cat-payables',
    is_active: true,
    account_category: { id: 'cat-payables', parent_id: null, name: 'Accounts Payable', code: '2110', depth: 2, is_active: true },
  },
  {
    id: 'acc-6',
    account_code: '10100',
    account_name: 'Core Contract',
    account_type_id: 'type-asset',
    account_category_id: 'cat-core',
    is_active: true,
    account_category: { id: 'cat-core', parent_id: null, name: 'Core Assets', code: '10100', depth: 2, is_active: true },
  },
  {
    id: 'acc-7',
    account_code: '1112-02-001',
    account_name: 'USD Account - XYZ Bank (Inactive)',
    account_type_id: 'type-asset',
    account_category_id: 'cat-banks',
    is_active: false,
    account_category: { id: 'cat-banks', parent_id: null, name: 'Bank Accounts', code: '1112', depth: 2, is_active: true },
  },
]

describe('isBankOrCashAccount', () => {
  it('correctly identifies operating bank account as bank/cash', () => {
    expect(isBankOrCashAccount(mockAccounts[0])).toBe(true)
  })

  it('correctly identifies petty cash as bank/cash', () => {
    expect(isBankOrCashAccount(mockAccounts[1])).toBe(true)
  })

  it('correctly identifies bank account with Cash & Bank category', () => {
    expect(isBankOrCashAccount(mockAccounts[2])).toBe(true)
  })

  it('excludes Bank Charges expense account even though it contains "Bank"', () => {
    expect(isBankOrCashAccount(mockAccounts[3])).toBe(false)
  })

  it('excludes Trade Payables', () => {
    expect(isBankOrCashAccount(mockAccounts[4])).toBe(false)
  })

  it('excludes accounts whose codes start with 10 that are not bank/cash', () => {
    expect(isBankOrCashAccount(mockAccounts[5])).toBe(false)
  })

  it('excludes inactive bank accounts', () => {
    expect(isBankOrCashAccount(mockAccounts[6])).toBe(false)
  })
})

describe('AccountCombobox', () => {
  it('renders placeholder when no value is provided', () => {
    render(
      <AccountCombobox
        value=""
        onChange={vi.fn()}
        accounts={mockAccounts.filter(isBankOrCashAccount)}
        placeholder="Select bank/cash account…"
      />
    )
    expect(screen.getByText('Select bank/cash account…')).toBeInTheDocument()
  })

  it('renders selected bank account code and name', () => {
    render(
      <AccountCombobox
        value="acc-1"
        onChange={vi.fn()}
        accounts={mockAccounts.filter(isBankOrCashAccount)}
        placeholder="Select bank/cash account…"
      />
    )
    expect(screen.getByText('1112-01-001')).toBeInTheDocument()
    expect(screen.getByText('Operating Account - ABC Bank')).toBeInTheDocument()
  })

  it('opens search popup with only Bank and Cash accounts when filtered', () => {
    render(
      <AccountCombobox
        value=""
        onChange={vi.fn()}
        accounts={mockAccounts.filter(isBankOrCashAccount)}
        placeholder="Select bank/cash account…"
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    expect(screen.getByPlaceholderText('Search accounts by code, name, category…')).toBeInTheDocument()
    expect(screen.getByText('3 accounts available')).toBeInTheDocument()

    // Bank charges and Core should NOT be present
    expect(screen.queryByText('Bank Charges')).not.toBeInTheDocument()
    expect(screen.queryByText('Core Contract')).not.toBeInTheDocument()
    expect(screen.queryByText('Trade Payables')).not.toBeInTheDocument()
  })

  it('filters bank accounts in the dropdown when searching', () => {
    render(
      <AccountCombobox
        value=""
        onChange={vi.fn()}
        accounts={mockAccounts}
        filterType="bank_cash"
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const input = screen.getByPlaceholderText('Search bank or cash accounts…')
    fireEvent.change(input, { target: { value: 'Petty' } })

    expect(screen.getByText('Petty Cash Main')).toBeInTheDocument()
    expect(screen.queryByText('Operating Account - ABC Bank')).not.toBeInTheDocument()
  })

  it('calls onChange when account is selected', () => {
    const handleChange = vi.fn()
    render(
      <AccountCombobox
        value=""
        onChange={handleChange}
        accounts={mockAccounts.filter(isBankOrCashAccount)}
      />
    )

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const option = screen.getByText('Operating Account - ABC Bank')
    fireEvent.click(option)

    expect(handleChange).toHaveBeenCalledWith('acc-1')
  })

  it('supports allowAll and renders All Accounts when value is empty or all', () => {
    const handleChange = vi.fn()
    render(
      <AccountCombobox
        value=""
        onChange={handleChange}
        accounts={mockAccounts}
        allowAll
      />
    )

    expect(screen.getByText('All Accounts')).toBeInTheDocument()

    const trigger = screen.getByRole('button')
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 })

    const allOption = screen.getByText('(Show ledger for all accounts)')
    expect(allOption).toBeInTheDocument()

    fireEvent.click(allOption)
    expect(handleChange).toHaveBeenCalledWith('')
  })
})
