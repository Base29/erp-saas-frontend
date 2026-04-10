import apiClient from './client'
import type { AuthUser } from '@/store/authStore'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const tenantLogin = (email: string, password: string) =>
  apiClient.post<{ token: string; user: AuthUser }>('/v1/auth/login', { email, password })

export const tenantLogout = () => apiClient.post('/v1/auth/logout')

export const tenantMe = () => apiClient.get<{ data: AuthUser }>('/v1/auth/me')

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number
  type: string
  title: string
  body: string | null
  related_model_type: string | null
  related_model_id: number | null
  is_read: boolean
  created_at: string
}

export const fetchUnreadCount = () =>
  apiClient.get<{ data: { count: number } }>('/v1/notifications/unread-count')

export const fetchNotifications = () =>
  apiClient.get<{ data: Notification[] }>('/v1/notifications')

export const markNotificationRead = (id: number) =>
  apiClient.post(`/v1/notifications/${id}/read`)

// ── Fiscal Periods ────────────────────────────────────────────────────────────
export interface FiscalPeriod {
  id: number
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}

export const fetchFiscalPeriods = () =>
  apiClient.get<{ data: FiscalPeriod[] }>('/v1/settings/fiscal-periods')

export const createFiscalPeriod = (payload: Omit<FiscalPeriod, 'id' | 'status'>) =>
  apiClient.post<{ data: FiscalPeriod }>('/v1/settings/fiscal-periods', payload)

export const closeFiscalPeriod = (id: number) =>
  apiClient.post<{ data: FiscalPeriod }>(`/v1/settings/fiscal-periods/${id}/close`)

// ── Tax Settings ──────────────────────────────────────────────────────────────
export interface TaxSetting {
  id: number
  name: string
  rate_percentage: number
  is_active: boolean
}

export const fetchTaxSettings = () =>
  apiClient.get<{ data: TaxSetting[] }>('/v1/settings/tax-settings')

export const upsertTaxSetting = (payload: Omit<TaxSetting, 'id'>) =>
  apiClient.post<{ data: TaxSetting }>('/v1/settings/tax-settings', payload)

// ── Sequences ─────────────────────────────────────────────────────────────────
export interface Sequence {
  id: number
  document_type: string
  prefix: string
  suffix: string
  next_number: number
  padding_length: number
  reset_rule: 'never' | 'yearly' | 'monthly'
}

export const fetchSequences = () =>
  apiClient.get<{ data: Sequence[] }>('/v1/settings/sequences')

export const updateSequence = (id: number, payload: Partial<Sequence>) =>
  apiClient.patch<{ data: Sequence }>(`/v1/settings/sequences/${id}`, payload)

// ── Users ─────────────────────────────────────────────────────────────────────
export interface TenantUser {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export const fetchUsers = () =>
  apiClient.get<{ data: TenantUser[] }>('/v1/settings/users')

export const createUser = (payload: { name: string; email: string; password: string; role: string }) =>
  apiClient.post<{ data: TenantUser }>('/v1/settings/users', payload)

export const updateUser = (id: number, payload: Partial<TenantUser>) =>
  apiClient.patch<{ data: TenantUser }>(`/v1/settings/users/${id}`, payload)

export const deactivateUser = (id: number) =>
  apiClient.post<{ data: TenantUser }>(`/v1/settings/users/${id}/deactivate`)

// ── Attachments ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: number
  original_filename: string
  mime_type: string
  file_size_bytes: number
  created_at: string
}

export const uploadAttachment = (
  attachableType: string,
  attachableId: number,
  file: File
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('attachable_type', attachableType)
  form.append('attachable_id', String(attachableId))
  return apiClient.post<{ data: Attachment }>('/v1/attachments', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteAttachment = (id: number) =>
  apiClient.delete(`/v1/attachments/${id}`)

export const fetchAttachments = (attachableType: string, attachableId: number) =>
  apiClient.get<{ data: Attachment[] }>(
    `/v1/attachments?attachable_type=${attachableType}&attachable_id=${attachableId}`
  )

// ── Accounts — Chart of Accounts ─────────────────────────────────────────────
export interface AccountGroup {
  id: number
  name: string
  account_types?: AccountType[]
}

export interface AccountType {
  id: number
  account_group_id: number
  name: string
  account_group?: AccountGroup
}

export interface Account {
  id: number
  account_code: string
  account_name: string
  account_type_id: number
  is_active: boolean
  account_type?: AccountType & { account_group?: AccountGroup }
}

export const fetchAccountGroups = () =>
  apiClient.get<AccountGroup[]>('/v1/accounts/groups')

export const fetchAccountTypes = () =>
  apiClient.get<AccountType[]>('/v1/accounts/types')

export const fetchAccounts = (params?: { is_active?: boolean }) =>
  apiClient.get<Account[]>('/v1/accounts', { params })

export const createAccount = (payload: { account_code: string; account_name: string; account_type_id: number; is_active?: boolean }) =>
  apiClient.post<Account>('/v1/accounts', payload)

export const updateAccount = (id: number, payload: Partial<Account>) =>
  apiClient.patch<Account>(`/v1/accounts/${id}`, payload)

export const deleteAccount = (id: number) =>
  apiClient.delete(`/v1/accounts/${id}`)

// ── Accounts — Journal Vouchers ───────────────────────────────────────────────
export interface JournalVoucherLine {
  id?: number
  account_id: number
  debit_amount: number
  credit_amount: number
  line_narration?: string
  account?: Account
}

export interface JournalVoucher {
  id: number
  voucher_number: string
  voucher_type: string
  voucher_date: string
  fiscal_period_id: number
  reference?: string
  narration?: string
  approval_status: string
  posting_status: string
  is_auto_generated: boolean
  created_by: number
  posted_by?: number
  posted_at?: string
  created_at: string
  lines?: JournalVoucherLine[]
  fiscal_period?: { id: number; name: string }
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export const fetchJournalVouchers = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<JournalVoucher>>('/v1/accounts/journal-vouchers', { params })

export const fetchJournalVoucher = (id: number) =>
  apiClient.get<JournalVoucher>(`/v1/accounts/journal-vouchers/${id}`)

export const createJournalVoucher = (payload: {
  voucher_type?: string
  voucher_date: string
  fiscal_period_id: number
  reference?: string
  narration?: string
  lines: JournalVoucherLine[]
}) => apiClient.post<JournalVoucher>('/v1/accounts/journal-vouchers', payload)

export const updateJournalVoucher = (id: number, payload: Partial<Parameters<typeof createJournalVoucher>[0]>) =>
  apiClient.patch<JournalVoucher>(`/v1/accounts/journal-vouchers/${id}`, payload)

export const deleteJournalVoucher = (id: number) =>
  apiClient.delete(`/v1/accounts/journal-vouchers/${id}`)

export const submitJournalVoucherForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/submit-for-approval`, { comments })

export const approveJournalVoucher = (id: number, comments?: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/approve`, { comments })

export const rejectJournalVoucher = (id: number, comments?: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/reject`, { comments })

export const postJournalVoucher = (id: number) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/post`)

// ── Accounts — Reports ────────────────────────────────────────────────────────
export const fetchGeneralLedger = (params: { account_id: number; date_from: string; date_to: string; page?: number }) =>
  apiClient.get('/v1/accounts/reports/general-ledger', { params })

export const fetchTrialBalance = (params: { fiscal_period_id: number }) =>
  apiClient.get('/v1/accounts/reports/trial-balance', { params })

export const fetchProfitAndLoss = (params: { date_from: string; date_to: string }) =>
  apiClient.get('/v1/accounts/reports/profit-and-loss', { params })

export const fetchBalanceSheet = (params: { as_of_date: string }) =>
  apiClient.get('/v1/accounts/reports/balance-sheet', { params })

export const fetchCustomerStatement = (params: { customer_id: number; date_from: string; date_to: string }) =>
  apiClient.get('/v1/accounts/reports/customer-statement', { params })

// ── Sales — Customers (for customer statement selector) ───────────────────────
export interface Customer {
  id: number
  customer_code: string
  name: string
  is_active: boolean
}

export const fetchCustomers = (params?: Record<string, string | number>) =>
  apiClient.get<{ data: Customer[] }>('/v1/sales/customers', { params })

// ── Inventory — Master Data ───────────────────────────────────────────────────
export interface UnitOfMeasure {
  id: number
  name: string
  abbreviation: string
  is_active: boolean
}

export interface ItemCategory {
  id: number
  name: string
  parent_category_id: number | null
  description: string | null
}

export interface ItemVariant {
  id?: number
  variant_name: string
  variant_attributes: Record<string, string> | null
  item_code_suffix: string | null
  is_active: boolean
}

export interface ItemBundleComponent {
  id?: number
  component_item_id: number
  component_quantity: number
  component_item?: Item
}

export interface Item {
  id: number
  item_code: string
  item_name: string
  item_type: 'stock' | 'service' | 'bundle'
  category_id: number | null
  base_unit_of_measure_id: number
  reorder_level: number
  is_batch_tracked: boolean
  is_serial_tracked: boolean
  is_expiry_tracked: boolean
  is_active: boolean
  category?: ItemCategory
  base_uom?: UnitOfMeasure
  variants?: ItemVariant[]
  bundle_components?: ItemBundleComponent[]
}

export interface Warehouse {
  id: number
  warehouse_code: string
  warehouse_name: string
  location_description: string | null
  is_active: boolean
}

export const fetchUoms = () =>
  apiClient.get<{ data: UnitOfMeasure[] }>('/v1/inventory/uoms')

export const fetchItemCategories = () =>
  apiClient.get<{ data: ItemCategory[] }>('/v1/inventory/item-categories')

export const fetchItems = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Item>>('/v1/inventory/items', { params })

export const fetchItem = (id: number) =>
  apiClient.get<{ data: Item }>(`/v1/inventory/items/${id}`)

export const createItem = (payload: Omit<Item, 'id' | 'category' | 'base_uom' | 'variants' | 'bundle_components'> & { variants?: ItemVariant[]; bundle_components?: ItemBundleComponent[] }) =>
  apiClient.post<{ data: Item }>('/v1/inventory/items', payload)

export const updateItem = (id: number, payload: Partial<Parameters<typeof createItem>[0]>) =>
  apiClient.patch<{ data: Item }>(`/v1/inventory/items/${id}`, payload)

export const fetchWarehouses = (params?: Record<string, string | number>) =>
  apiClient.get<{ data: Warehouse[] }>('/v1/inventory/warehouses', { params })

export const createWarehouse = (payload: Omit<Warehouse, 'id'>) =>
  apiClient.post<{ data: Warehouse }>('/v1/inventory/warehouses', payload)

export const updateWarehouse = (id: number, payload: Partial<Omit<Warehouse, 'id'>>) =>
  apiClient.patch<{ data: Warehouse }>(`/v1/inventory/warehouses/${id}`, payload)

// ── Inventory — Stock Transactions ───────────────────────────────────────────
export interface GoodsReceiptLine {
  id?: number
  item_id: number
  quantity: number
  unit_cost: number
  batch_id?: number | null
  item?: Item
}

export interface GoodsReceipt {
  id: number
  grn_number: string
  warehouse_id: number
  receipt_date: string
  reference: string | null
  approval_status: string
  posting_status: string
  created_by: number
  created_at: string
  warehouse?: Warehouse
  lines?: GoodsReceiptLine[]
}

export interface GoodsIssueLine {
  id?: number
  item_id: number
  quantity: number
  batch_id?: number | null
  serial_number_id?: number | null
  item?: Item
}

export interface GoodsIssue {
  id: number
  issue_number: string
  warehouse_id: number
  issue_date: string
  purpose: string | null
  approval_status: string
  posting_status: string
  created_by: number
  created_at: string
  warehouse?: Warehouse
  lines?: GoodsIssueLine[]
}

export interface StockTransferLine {
  id?: number
  item_id: number
  quantity: number
  batch_id?: number | null
  serial_number_id?: number | null
  item?: Item
}

export interface StockTransfer {
  id: number
  transfer_number: string
  from_warehouse_id: number
  to_warehouse_id: number
  transfer_date: string
  approval_status: string
  posting_status: string
  created_by: number
  created_at: string
  from_warehouse?: Warehouse
  to_warehouse?: Warehouse
  lines?: StockTransferLine[]
}

// Goods Receipts
export const fetchGoodsReceipts = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<GoodsReceipt>>('/v1/inventory/goods-receipts', { params })

export const fetchGoodsReceipt = (id: number) =>
  apiClient.get<{ data: GoodsReceipt }>(`/v1/inventory/goods-receipts/${id}`)

export const createGoodsReceipt = (payload: { warehouse_id: number; receipt_date: string; reference?: string; lines: GoodsReceiptLine[] }) =>
  apiClient.post<{ data: GoodsReceipt }>('/v1/inventory/goods-receipts', payload)

export const submitGoodsReceiptForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/submit-for-approval`, { comments })

export const approveGoodsReceipt = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/approve`, { comments })

export const rejectGoodsReceipt = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/reject`, { comments })

export const postGoodsReceipt = (id: number) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/post`)

// Goods Issues
export const fetchGoodsIssues = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<GoodsIssue>>('/v1/inventory/goods-issues', { params })

export const fetchGoodsIssue = (id: number) =>
  apiClient.get<{ data: GoodsIssue }>(`/v1/inventory/goods-issues/${id}`)

export const createGoodsIssue = (payload: { warehouse_id: number; issue_date: string; purpose?: string; lines: GoodsIssueLine[] }) =>
  apiClient.post<{ data: GoodsIssue }>('/v1/inventory/goods-issues', payload)

export const submitGoodsIssueForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/submit-for-approval`, { comments })

export const approveGoodsIssue = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/approve`, { comments })

export const rejectGoodsIssue = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/reject`, { comments })

export const postGoodsIssue = (id: number) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/post`)

// Stock Transfers
export const fetchStockTransfers = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<StockTransfer>>('/v1/inventory/transfers', { params })

export const fetchStockTransfer = (id: number) =>
  apiClient.get<{ data: StockTransfer }>(`/v1/inventory/transfers/${id}`)

export const createStockTransfer = (payload: { from_warehouse_id: number; to_warehouse_id: number; transfer_date: string; lines: StockTransferLine[] }) =>
  apiClient.post<{ data: StockTransfer }>('/v1/inventory/transfers', payload)

export const submitStockTransferForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/submit-for-approval`, { comments })

export const approveStockTransfer = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/approve`, { comments })

export const rejectStockTransfer = (id: number, comments?: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/reject`, { comments })

export const postStockTransfer = (id: number) =>
  apiClient.post(`/v1/inventory/transfers/${id}/post`)

// ── Inventory — Reports ───────────────────────────────────────────────────────
export const fetchStockBalance = (params?: { item_id?: number; warehouse_id?: number }) =>
  apiClient.get('/v1/inventory/reports/stock-balance', { params })

export const fetchStockLedger = (params: { item_id: number; date_from: string; date_to: string; page?: number }) =>
  apiClient.get('/v1/inventory/reports/stock-ledger', { params })
