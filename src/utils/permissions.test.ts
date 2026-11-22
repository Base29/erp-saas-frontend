import { describe, it, expect } from 'vitest'
import {
  canAccessSection,
  canWrite,
  canApprove,
  canSubmitForApproval,
  canManageUoms,
  canManageItemTypes,
  canManageItemCategories,
} from './permissions'
import type { UserRole } from '@/store/authStore'

describe('canAccessSection', () => {
  it('returns false for null role', () => {
    expect(canAccessSection(null, 'accounts')).toBe(false)
  })

  it('returns false for unknown section', () => {
    expect(canAccessSection('tenant_admin', 'unknown_section')).toBe(false)
  })

  it('tenant_admin can access all sections', () => {
    const sections = ['accounts', 'sales', 'inventory', 'reports', 'settings']
    sections.forEach((s) => expect(canAccessSection('tenant_admin', s)).toBe(true))
  })

  it('viewer can access accounts, sales, inventory, reports but not settings', () => {
    expect(canAccessSection('viewer', 'accounts')).toBe(true)
    expect(canAccessSection('viewer', 'sales')).toBe(true)
    expect(canAccessSection('viewer', 'inventory')).toBe(true)
    expect(canAccessSection('viewer', 'reports')).toBe(true)
    expect(canAccessSection('viewer', 'settings')).toBe(false)
  })

  it('sales_person can access sales, inventory, reports but not accounts or settings', () => {
    expect(canAccessSection('sales_person', 'sales')).toBe(true)
    expect(canAccessSection('sales_person', 'inventory')).toBe(true)
    expect(canAccessSection('sales_person', 'reports')).toBe(true)
    expect(canAccessSection('sales_person', 'accounts')).toBe(false)
    expect(canAccessSection('sales_person', 'settings')).toBe(false)
  })
})

describe('canWrite', () => {
  it('returns false for null role', () => {
    expect(canWrite(null, 'accounts')).toBe(false)
  })

  it('tenant_admin can write to all sections', () => {
    const sections = ['accounts', 'sales', 'inventory', 'settings']
    sections.forEach((s) => expect(canWrite('tenant_admin', s)).toBe(true))
  })

  it('accountant can write to accounts but not inventory or settings', () => {
    expect(canWrite('accountant', 'accounts')).toBe(true)
    expect(canWrite('accountant', 'inventory')).toBe(false)
    expect(canWrite('accountant', 'settings')).toBe(false)
  })

  it('sales_manager can write to sales but not accounts', () => {
    expect(canWrite('sales_manager', 'sales')).toBe(true)
    expect(canWrite('sales_manager', 'accounts')).toBe(false)
  })

  it('inventory_manager can write to inventory but not sales', () => {
    expect(canWrite('inventory_manager', 'inventory')).toBe(true)
    expect(canWrite('inventory_manager', 'sales')).toBe(false)
  })

  it('viewer cannot write to any section', () => {
    const sections = ['accounts', 'sales', 'inventory', 'settings']
    sections.forEach((s) => expect(canWrite('viewer', s)).toBe(false))
  })

  it('sales_person can write to sales', () => {
    expect(canWrite('sales_person', 'sales')).toBe(true)
  })
})

describe('canApprove', () => {
  it('returns false for null role', () => {
    expect(canApprove(null)).toBe(false)
  })

  const approverRoles: UserRole[] = ['tenant_admin', 'accountant', 'sales_manager', 'inventory_manager']
  approverRoles.forEach((role) => {
    it(`${role} can approve`, () => {
      expect(canApprove(role)).toBe(true)
    })
  })

  const nonApproverRoles: UserRole[] = ['sales_person', 'viewer']
  nonApproverRoles.forEach((role) => {
    it(`${role} cannot approve`, () => {
      expect(canApprove(role)).toBe(false)
    })
  })
})

describe('canSubmitForApproval', () => {
  it('returns false for null role', () => {
    expect(canSubmitForApproval(null)).toBe(false)
  })

  it('viewer cannot submit for approval', () => {
    expect(canSubmitForApproval('viewer')).toBe(false)
  })

  const submitterRoles: UserRole[] = ['tenant_admin', 'accountant', 'sales_manager', 'sales_person', 'inventory_manager']
  submitterRoles.forEach((role) => {
    it(`${role} can submit for approval`, () => {
      expect(canSubmitForApproval(role)).toBe(true)
    })
  })
})

describe('inventory master data permissions', () => {
  it('tenant_admin and inventory_manager can manage UOMs, Types, and Categories', () => {
    expect(canManageUoms('tenant_admin')).toBe(true)
    expect(canManageUoms('inventory_manager')).toBe(true)
    expect(canManageItemTypes('tenant_admin')).toBe(true)
    expect(canManageItemTypes('inventory_manager')).toBe(true)
    expect(canManageItemCategories('tenant_admin')).toBe(true)
    expect(canManageItemCategories('inventory_manager')).toBe(true)
  })

  it('viewer, accountant, and sales_person cannot manage inventory master data by default', () => {
    const roles: UserRole[] = ['viewer', 'accountant', 'sales_person']
    roles.forEach((r) => {
      expect(canManageUoms(r)).toBe(false)
      expect(canManageItemTypes(r)).toBe(false)
      expect(canManageItemCategories(r)).toBe(false)
    })
  })
})
