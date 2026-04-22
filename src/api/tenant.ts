import apiClient from './client'
import type { AuthUser } from '@/store/authStore'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const tenantLogin = (email: string, password: string) =>
  apiClient.post<{ token: string; user: AuthUser }>('/v1/auth/login', { email, password })

export const tenantDemoLogin = () =>
  apiClient.post<{ token: string; user: AuthUser }>('/v1/auth/demo-login')

export const tenantLogout = () => apiClient.post('/v1/auth/logout')

export const tenantMe = () => apiClient.get<{ data: AuthUser }>('/v1/auth/me')

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  related_model_type: string | null
  related_model_id: string | null
  is_read: boolean
  created_at: string
}

export const fetchUnreadCount = () =>
  apiClient.get<{ data: { count: number } }>('/v1/notifications/unread-count')

export const fetchNotifications = () =>
  apiClient.get<{ data: Notification[] }>('/v1/notifications')

export const markNotificationRead = (id: string) =>
  apiClient.post(`/v1/notifications/${id}/read`)

// ── Fiscal Periods ────────────────────────────────────────────────────────────
export interface FiscalPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}

export const fetchFiscalPeriods = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<FiscalPeriod>>('/v1/settings/fiscal-periods', { params })

export const createFiscalPeriod = (payload: Omit<FiscalPeriod, 'id' | 'status'>) =>
  apiClient.post<{ data: FiscalPeriod }>('/v1/settings/fiscal-periods', payload)

export const closeFiscalPeriod = (id: string) =>
  apiClient.post<{ data: FiscalPeriod }>(`/v1/settings/fiscal-periods/${id}/close`)

// ── Tax Settings ──────────────────────────────────────────────────────────────
export interface TaxSetting {
  id: string
  name: string
  rate_percentage: number
  is_active: boolean
}

export const fetchTaxSettings = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<TaxSetting>>('/v1/settings/tax', { params })

export const upsertTaxSetting = (payload: Omit<TaxSetting, 'id'>) =>
  apiClient.post<{ data: TaxSetting }>('/v1/settings/tax', payload)

// ── Sequences ─────────────────────────────────────────────────────────────────
export interface Sequence {
  id: string
  document_type: string
  prefix: string
  suffix: string
  next_number: number
  padding_length: number
  reset_rule: 'never' | 'yearly' | 'monthly'
}

export const fetchSequences = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Sequence>>('/v1/settings/sequences', { params })

export const updateSequence = (id: string, payload: Partial<Sequence>) =>
  apiClient.patch<{ data: Sequence }>(`/v1/settings/sequences/${id}`, payload)

// ── Users ─────────────────────────────────────────────────────────────────────
export interface TenantUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export const fetchUsers = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<TenantUser>>('/v1/settings/users', { params })

export const createUser = (payload: { name: string; email: string; password: string; role: string }) =>
  apiClient.post<{ data: TenantUser }>('/v1/settings/users', payload)

export const updateUser = (id: string, payload: Partial<TenantUser>) =>
  apiClient.patch<{ data: TenantUser }>(`/v1/settings/users/${id}`, payload)

export const deactivateUser = (id: string) =>
  apiClient.post<{ data: TenantUser }>(`/v1/settings/users/${id}/deactivate`)

// ── Attachments ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: string
  original_filename: string
  mime_type: string
  file_size_bytes: number
  created_at: string
}

export const uploadAttachment = (
  attachableType: string,
  attachableId: string,
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

export const deleteAttachment = (id: string) =>
  apiClient.delete(`/v1/attachments/${id}`)

export const fetchAttachments = (attachableType: string, attachableId: string) =>
  apiClient.get<{ data: Attachment[] }>(
    `/v1/attachments?attachable_type=${attachableType}&attachable_id=${attachableId}`
  )

// ── Accounts — Chart of Accounts ─────────────────────────────────────────────
export interface AccountGroup {
  id: string
  name: string
  account_types?: AccountType[]
}

export interface AccountType {
  id: string
  account_group_id: string
  name: string
  account_group?: AccountGroup
}

export interface Account {
  id: string
  account_code: string
  account_name: string
  account_type_id: string
  is_active: boolean
  account_type?: AccountType & { account_group?: AccountGroup }
}

export const fetchAccountGroups = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<AccountGroup>>('/v1/accounts/groups', { params })

export const fetchAccountTypes = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<AccountType>>('/v1/accounts/types', { params })

export const fetchAccounts = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Account>>('/v1/accounts', { params })

export const createAccount = (payload: { account_code: string; account_name: string; account_type_id: string; is_active?: boolean }) =>
  apiClient.post<Account>('/v1/accounts', payload)

export const updateAccount = (id: string, payload: Partial<Account>) =>
  apiClient.patch<Account>(`/v1/accounts/${id}`, payload)

export const deleteAccount = (id: string) =>
  apiClient.delete(`/v1/accounts/${id}`)

// ── Accounts — Journal Vouchers ───────────────────────────────────────────────
export interface JournalVoucherLine {
  id?: string
  account_id: string
  debit_amount: number
  credit_amount: number
  line_narration?: string
  account?: Account
}

export interface JournalVoucher {
  id: string
  voucher_number: string
  voucher_type: string
  voucher_date: string
  fiscal_period_id: string
  reference?: string
  narration?: string
  approval_status: string
  posting_status: string
  is_auto_generated: boolean
  created_by: string
  posted_by?: string
  posted_at?: string
  created_at: string
  lines?: JournalVoucherLine[]
  fiscal_period?: { id: string; name: string }
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

export const fetchJournalVoucher = (id: string) =>
  apiClient.get<{ data: JournalVoucher }>(`/v1/accounts/journal-vouchers/${id}`)

export const createJournalVoucher = (payload: {
  voucher_type?: string
  voucher_date: string
  fiscal_period_id: string
  reference?: string
  narration?: string
  lines: JournalVoucherLine[]
}) => apiClient.post<{ data: JournalVoucher }>('/v1/accounts/journal-vouchers', payload)

export const updateJournalVoucher = (id: string, payload: Partial<Parameters<typeof createJournalVoucher>[0]>) =>
  apiClient.patch<{ data: JournalVoucher }>(`/v1/accounts/journal-vouchers/${id}`, payload)

export const deleteJournalVoucher = (id: string) =>
  apiClient.delete(`/v1/accounts/journal-vouchers/${id}`)

export const submitJournalVoucherForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/submit-for-approval`, { comments })

export const approveJournalVoucher = (id: string, comments?: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/approve`, { comments })

export const rejectJournalVoucher = (id: string, comments?: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/reject`, { comments })

export const postJournalVoucher = (id: string) =>
  apiClient.post(`/v1/accounts/journal-vouchers/${id}/post`)

// ── Accounts — Reports ────────────────────────────────────────────────────────
export const fetchGeneralLedger = (params: { account_id: string; date_from: string; date_to: string; page?: number }) =>
  apiClient.get('/v1/accounts/reports/general-ledger', { params })

export const fetchTrialBalance = (params: { fiscal_period_id: string }) =>
  apiClient.get('/v1/accounts/reports/trial-balance', { params })

export const fetchProfitAndLoss = (params: { date_from: string; date_to: string }) =>
  apiClient.get('/v1/accounts/reports/profit-and-loss', { params })

export const fetchBalanceSheet = (params: { as_of_date: string }) =>
  apiClient.get('/v1/accounts/reports/balance-sheet', { params })

export const fetchCustomerStatement = (params: { customer_id: string; date_from: string; date_to: string }) =>
  apiClient.get('/v1/accounts/reports/customer-statement', { params })

// ── Sales — Customers (for customer statement selector) ───────────────────────
export interface Customer {
  id: string
  customer_code: string
  name: string
  is_active: boolean
}

export const fetchCustomers = (params?: Record<string, string | number>) =>
  apiClient.get<{ data: Customer[] }>('/v1/sales/customers', { params })

// ── Inventory — Master Data ───────────────────────────────────────────────────
export interface UnitOfMeasure {
  id: string
  name: string
  abbreviation: string
  is_active: boolean
}

export interface ItemCategory {
  id: string
  name: string
  parent_category_id: string | null
  description: string | null
}

export interface ItemVariant {
  id?: string
  variant_name: string
  variant_attributes: Record<string, string> | null
  item_code_suffix: string | null
  is_active: boolean
}

export interface ItemBundleComponent {
  id?: string
  component_item_id: string
  component_quantity: number
  component_item?: Item
}

export interface Item {
  id: string
  item_code: string
  item_name: string
  item_type: 'stock' | 'service' | 'bundle'
  category_id: string | null
  base_unit_of_measure_id: string
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
  id: string
  warehouse_code: string
  warehouse_name: string
  location_description: string | null
  is_active: boolean
}

export const fetchUoms = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<UnitOfMeasure>>('/v1/inventory/uoms', { params })

export const fetchItemCategories = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<ItemCategory>>('/v1/inventory/item-categories', { params })

export const fetchProductCategories = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<ItemCategory>>('/v1/settings/product-categories', { params })

export const createItemCategory = (payload: Omit<ItemCategory, 'id'>) =>
  apiClient.post<{ data: ItemCategory }>('/v1/settings/product-categories', payload)

export const updateItemCategory = (id: string, payload: Partial<ItemCategory>) =>
  apiClient.patch<{ data: ItemCategory }>(`/v1/settings/product-categories/${id}`, payload)

export const deleteItemCategory = (id: string) =>
  apiClient.delete(`/v1/settings/product-categories/${id}`)

export const fetchItems = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Item>>('/v1/inventory/items', { params })

export const fetchItem = (id: string) =>
  apiClient.get<{ data: Item }>(`/v1/inventory/items/${id}`)

export const createItem = (payload: Omit<Item, 'id' | 'category' | 'base_uom' | 'variants' | 'bundle_components'> & { variants?: ItemVariant[]; bundle_components?: ItemBundleComponent[] }) =>
  apiClient.post<{ data: Item }>('/v1/inventory/items', payload)

export const updateItem = (id: string, payload: Partial<Parameters<typeof createItem>[0]>) =>
  apiClient.patch<{ data: Item }>(`/v1/inventory/items/${id}`, payload)

export const fetchWarehouses = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Warehouse>>('/v1/inventory/warehouses', { params })

export const createWarehouse = (payload: Omit<Warehouse, 'id'>) =>
  apiClient.post<{ data: Warehouse }>('/v1/inventory/warehouses', payload)

export const updateWarehouse = (id: string, payload: Partial<Omit<Warehouse, 'id'>>) =>
  apiClient.patch<{ data: Warehouse }>(`/v1/inventory/warehouses/${id}`, payload)

// ── Inventory — Stock Transactions ───────────────────────────────────────────
export interface GoodsReceiptLine {
  id?: string
  item_id: string
  quantity: number
  unit_cost: number
  batch_id?: string | null
  item?: Item
}

export interface GoodsReceipt {
  id: string
  grn_number: string
  warehouse_id: string
  receipt_date: string
  reference: string | null
  approval_status: string
  posting_status: string
  created_by: string
  created_at: string
  warehouse?: Warehouse
  lines?: GoodsReceiptLine[]
}

export interface GoodsIssueLine {
  id?: string
  item_id: string
  quantity: number
  batch_id?: string | null
  serial_number_id?: string | null
  item?: Item
}

export interface GoodsIssue {
  id: string
  issue_number: string
  warehouse_id: string
  issue_date: string
  purpose: string | null
  approval_status: string
  posting_status: string
  created_by: string
  created_at: string
  warehouse?: Warehouse
  lines?: GoodsIssueLine[]
}

export interface StockTransferLine {
  id?: string
  item_id: string
  quantity: number
  batch_id?: string | null
  serial_number_id?: string | null
  item?: Item
}

export interface StockTransfer {
  id: string
  transfer_number: string
  from_warehouse_id: string
  to_warehouse_id: string
  transfer_date: string
  approval_status: string
  posting_status: string
  created_by: string
  created_at: string
  from_warehouse?: Warehouse
  to_warehouse?: Warehouse
  lines?: StockTransferLine[]
}

// Goods Receipts
export const fetchGoodsReceipts = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<GoodsReceipt>>('/v1/inventory/goods-receipts', { params })

export const fetchGoodsReceipt = (id: string) =>
  apiClient.get<{ data: GoodsReceipt }>(`/v1/inventory/goods-receipts/${id}`)

export const createGoodsReceipt = (payload: { warehouse_id: string; receipt_date: string; reference?: string; lines: GoodsReceiptLine[] }) =>
  apiClient.post<{ data: GoodsReceipt }>('/v1/inventory/goods-receipts', payload)

export const submitGoodsReceiptForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/submit-for-approval`, { comments })

export const approveGoodsReceipt = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/approve`, { comments })

export const rejectGoodsReceipt = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/reject`, { comments })

export const postGoodsReceipt = (id: string) =>
  apiClient.post(`/v1/inventory/goods-receipts/${id}/post`)

// Goods Issues
export const fetchGoodsIssues = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<GoodsIssue>>('/v1/inventory/goods-issues', { params })

export const fetchGoodsIssue = (id: string) =>
  apiClient.get<{ data: GoodsIssue }>(`/v1/inventory/goods-issues/${id}`)

export const createGoodsIssue = (payload: { warehouse_id: string; issue_date: string; purpose?: string; lines: GoodsIssueLine[] }) =>
  apiClient.post<{ data: GoodsIssue }>('/v1/inventory/goods-issues', payload)

export const submitGoodsIssueForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/submit-for-approval`, { comments })

export const approveGoodsIssue = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/approve`, { comments })

export const rejectGoodsIssue = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/reject`, { comments })

export const postGoodsIssue = (id: string) =>
  apiClient.post(`/v1/inventory/goods-issues/${id}/post`)

// Stock Transfers
export const fetchStockTransfers = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<StockTransfer>>('/v1/inventory/transfers', { params })

export const fetchStockTransfer = (id: string) =>
  apiClient.get<{ data: StockTransfer }>(`/v1/inventory/transfers/${id}`)

export const createStockTransfer = (payload: { from_warehouse_id: string; to_warehouse_id: string; transfer_date: string; lines: StockTransferLine[] }) =>
  apiClient.post<{ data: StockTransfer }>('/v1/inventory/transfers', payload)

export const submitStockTransferForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/submit-for-approval`, { comments })

export const approveStockTransfer = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/approve`, { comments })

export const rejectStockTransfer = (id: string, comments?: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/reject`, { comments })

export const postStockTransfer = (id: string) =>
  apiClient.post(`/v1/inventory/transfers/${id}/post`)

// ── Inventory — Reports ───────────────────────────────────────────────────────
export const fetchStockBalance = (params?: { item_id?: string; warehouse_id?: string; page?: number }) =>
  apiClient.get<PaginatedResponse<any>>('/v1/inventory/reports/stock-balance', { params })

export const fetchStockLedger = (params: { item_id: string; date_from: string; date_to: string; page?: number }) =>
  apiClient.get('/v1/inventory/reports/stock-ledger', { params })

// ── Sales — Full Customer type ────────────────────────────────────────────────
export interface CustomerCategory {
  id: string
  name: string
}

export interface CustomerGroup {
  id: string
  name: string
}

export interface CustomerFull {
  id: string
  customer_code: string
  name: string
  customer_category_id: string | null
  customer_group_id: string | null
  tax_number: string | null
  credit_limit: number
  payment_terms_days: number
  assigned_salesperson_id: string | null
  is_active: boolean
  customer_category?: CustomerCategory
  customer_group?: CustomerGroup
  assigned_salesperson?: TenantUser
}

export const fetchCustomerCategories = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<CustomerCategory>>('/v1/settings/customer-categories', { params })

export const createCustomerCategory = (payload: Omit<CustomerCategory, 'id'>) =>
  apiClient.post<{ data: CustomerCategory }>('/v1/settings/customer-categories', payload)

export const updateCustomerCategory = (id: string, payload: Partial<CustomerCategory>) =>
  apiClient.patch<{ data: CustomerCategory }>(`/v1/settings/customer-categories/${id}`, payload)

export const deleteCustomerCategory = (id: string) =>
  apiClient.delete(`/v1/settings/customer-categories/${id}`)

export const fetchCustomerGroups = () =>
  apiClient.get<{ data: CustomerGroup[] }>('/v1/sales/customer-groups')

export const fetchCustomersFull = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<CustomerFull>>('/v1/sales/customers', { params })

export const fetchCustomerFull = (id: string) =>
  apiClient.get<{ data: CustomerFull }>(`/v1/sales/customers/${id}`)

export const createCustomer = (payload: Omit<CustomerFull, 'id' | 'customer_category' | 'customer_group' | 'assigned_salesperson'>) =>
  apiClient.post<{ data: CustomerFull }>('/v1/sales/customers', payload)

export const updateCustomer = (id: string, payload: Partial<Omit<CustomerFull, 'id' | 'customer_category' | 'customer_group' | 'assigned_salesperson'>>) =>
  apiClient.patch<{ data: CustomerFull }>(`/v1/sales/customers/${id}`, payload)

// ── Sales — Price Lists ───────────────────────────────────────────────────────
export interface PriceListItem {
  id?: string
  price_list_id?: string
  item_id: string
  unit_price: number
  discount_percentage: number
  item?: Item
}

export interface PriceList {
  id: string
  name: string
  currency: string
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
  items?: PriceListItem[]
}

export const fetchPriceLists = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<PriceList>>('/v1/sales/price-lists', { params })

export const fetchPriceList = (id: string) =>
  apiClient.get<{ data: PriceList }>(`/v1/sales/price-lists/${id}`)

export const createPriceList = (payload: Omit<PriceList, 'id' | 'items'> & { items?: Omit<PriceListItem, 'id' | 'price_list_id' | 'item'>[] }) =>
  apiClient.post<{ data: PriceList }>('/v1/sales/price-lists', payload)

export const updatePriceList = (id: string, payload: Partial<Parameters<typeof createPriceList>[0]>) =>
  apiClient.patch<{ data: PriceList }>(`/v1/sales/price-lists/${id}`, payload)

// ── Sales — Quotations ────────────────────────────────────────────────────────
export interface QuotationLine {
  id?: string
  item_id: string
  description: string | null
  quantity: number
  unit_of_measure_id: string
  unit_price: number
  discount_percentage: number
  tax_amount: number
  line_total: number
  item?: Item
}

export interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  quotation_date: string
  valid_until: string | null
  price_list_id: string | null
  salesperson_id: string | null
  terms: string | null
  approval_status: string
  status: string
  created_by: string
  created_at: string
  customer?: CustomerFull
  lines?: QuotationLine[]
}

export const fetchQuotations = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Quotation>>('/v1/sales/quotations', { params })

export const fetchQuotation = (id: string) =>
  apiClient.get<{ data: Quotation }>(`/v1/sales/quotations/${id}`)

export const createQuotation = (payload: {
  customer_id: string; quotation_date: string; valid_until?: string | null
  price_list_id?: string | null; salesperson_id?: string | null; terms?: string | null
  lines: Omit<QuotationLine, 'id' | 'item'>[]
}) => apiClient.post<{ data: Quotation }>('/v1/sales/quotations', payload)

export const updateQuotation = (id: string, payload: Partial<Parameters<typeof createQuotation>[0]>) =>
  apiClient.patch<{ data: Quotation }>(`/v1/sales/quotations/${id}`, payload)

export const submitQuotationForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/quotations/${id}/submit-for-approval`, { comments })

export const approveQuotation = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/quotations/${id}/approve`, { comments })

export const rejectQuotation = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/quotations/${id}/reject`, { comments })

export const convertQuotationToOrder = (id: string) =>
  apiClient.post<{ data: SaleOrder }>(`/v1/sales/quotations/${id}/convert-to-order`)

// ── Sales — Sale Orders ───────────────────────────────────────────────────────
export interface SaleOrderLine {
  id?: string
  item_id: string
  description: string | null
  quantity: number
  unit_of_measure_id: string
  unit_price: number
  discount_percentage: number
  tax_amount: number
  line_total: number
  quantity_invoiced: number
  item?: Item
}

export interface SaleOrder {
  id: string
  order_number: string
  source_quotation_id: string | null
  customer_id: string
  order_date: string
  delivery_date: string | null
  price_list_id: string | null
  approval_status: string
  fulfillment_status: string
  posting_status: string
  created_by: string
  created_at: string
  customer?: CustomerFull
  lines?: SaleOrderLine[]
}

export const fetchSaleOrders = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<SaleOrder>>('/v1/sales/orders', { params })

export const fetchSaleOrder = (id: string) =>
  apiClient.get<{ data: SaleOrder }>(`/v1/sales/orders/${id}`)

export const createSaleOrder = (payload: {
  customer_id: string; order_date: string; delivery_date?: string | null
  price_list_id?: string | null; lines: Omit<SaleOrderLine, 'id' | 'item' | 'quantity_invoiced'>[]
}) => apiClient.post<{ data: SaleOrder }>('/v1/sales/orders', payload)

export const updateSaleOrder = (id: string, payload: Partial<Parameters<typeof createSaleOrder>[0]>) =>
  apiClient.patch<{ data: SaleOrder }>(`/v1/sales/orders/${id}`, payload)

export const submitSaleOrderForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/orders/${id}/submit-for-approval`, { comments })

export const approveSaleOrder = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/orders/${id}/approve`, { comments })

export const rejectSaleOrder = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/orders/${id}/reject`, { comments })

// ── Sales — Sale Invoices ─────────────────────────────────────────────────────
export interface SaleInvoiceLine {
  id?: string
  item_id: string
  description: string | null
  quantity: number
  unit_of_measure_id: string
  unit_price: number
  discount_percentage: number
  tax_amount: number
  line_total: number
  item?: Item
}

export interface SaleInvoice {
  id: string
  invoice_number: string
  source_sale_order_id: string | null
  customer_id: string
  invoice_date: string
  due_date: string | null
  fiscal_period_id: string
  tax_rate: number
  discount_amount: number
  subtotal: number
  tax_amount: number
  total_amount: number
  approval_status: string
  posting_status: string
  created_by: string
  posted_by: string | null
  posted_at: string | null
  created_at: string
  customer?: CustomerFull
  fiscal_period?: FiscalPeriod
  lines?: SaleInvoiceLine[]
}

export const fetchSaleInvoices = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<SaleInvoice>>('/v1/sales/invoices', { params })

export const fetchSaleInvoice = (id: string) =>
  apiClient.get<{ data: SaleInvoice }>(`/v1/sales/invoices/${id}`)

export const createSaleInvoice = (payload: {
  source_sale_order_id?: string | null; customer_id: string; invoice_date: string
  due_date?: string | null; fiscal_period_id: string; tax_rate?: number
  discount_amount?: number; lines: Omit<SaleInvoiceLine, 'id' | 'item'>[]
}) => apiClient.post<{ data: SaleInvoice }>('/v1/sales/invoices', payload)

export const updateSaleInvoice = (id: string, payload: Partial<Parameters<typeof createSaleInvoice>[0]>) =>
  apiClient.patch<{ data: SaleInvoice }>(`/v1/sales/invoices/${id}`, payload)

export const submitSaleInvoiceForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/submit-for-approval`, { comments })

export const approveSaleInvoice = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/approve`, { comments })

export const rejectSaleInvoice = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/reject`, { comments })

export const postSaleInvoice = (id: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/post`)

export const downloadInvoicePdf = (id: string) =>
  apiClient.get(`/v1/sales/invoices/${id}/pdf`, { responseType: 'blob' })

// ── Sales — Receipts ──────────────────────────────────────────────────────────
export interface ReceiptAllocation {
  id?: string
  invoice_id: string
  allocated_amount: number
  invoice?: SaleInvoice
}

export interface SaleReceipt {
  id: string
  receipt_number: string
  customer_id: string
  receipt_date: string
  amount_received: number
  payment_method: string
  reference: string | null
  posting_status: string
  created_by: string
  posted_at: string | null
  created_at: string
  customer?: CustomerFull
  allocations?: ReceiptAllocation[]
}

export const fetchSaleReceipts = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<SaleReceipt>>('/v1/sales/receipts', { params })

export const fetchSaleReceipt = (id: string) =>
  apiClient.get<{ data: SaleReceipt }>(`/v1/sales/receipts/${id}`)

export const createSaleReceipt = (payload: {
  customer_id: string; receipt_date: string; amount_received: number
  payment_method: string; reference?: string | null
  allocations?: { invoice_id: string; allocated_amount: number }[]
}) => apiClient.post<{ data: SaleReceipt }>('/v1/sales/receipts', payload)

export const postSaleReceipt = (id: string) =>
  apiClient.post(`/v1/sales/receipts/${id}/post`)

export const fetchOutstandingInvoices = (customerId: string) =>
  apiClient.get<{ data: SaleInvoice[] }>(`/v1/sales/customers/${customerId}/outstanding-invoices`)

// ── Sales — Credit Notes ──────────────────────────────────────────────────────
export interface CreditNote {
  id: string
  credit_note_number: string
  source_invoice_id: string
  customer_id: string
  credit_date: string
  reason: string | null
  total_amount: number
  approval_status: string
  posting_status: string
  created_by: string
  posted_at: string | null
  created_at: string
  customer?: CustomerFull
  source_invoice?: SaleInvoice
}

export const fetchCreditNotes = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<CreditNote>>('/v1/sales/credit-notes', { params })

export const fetchCreditNote = (id: string) =>
  apiClient.get<{ data: CreditNote }>(`/v1/sales/credit-notes/${id}`)

export const createCreditNote = (payload: {
  source_invoice_id: string; customer_id: string; credit_date: string
  reason?: string | null; total_amount: number
}) => apiClient.post<{ data: CreditNote }>('/v1/sales/credit-notes', payload)

export const submitCreditNoteForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/submit-for-approval`, { comments })

export const approveCreditNote = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/approve`, { comments })

export const rejectCreditNote = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/reject`, { comments })

export const postCreditNote = (id: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/post`)

// ── Sales — Outward Gate Passes ───────────────────────────────────────────────
export interface GatePassLine {
  id?: string
  invoice_line_id: string
  item_id: string
  quantity_dispatched: number
  batch_id: string | null
  serial_number_id: string | null
  item?: Item
}

export interface OutwardGatePass {
  id: string
  gate_pass_number: string
  source_invoice_id: string
  warehouse_id: string
  dispatch_date: string
  vehicle_number: string | null
  driver_name: string | null
  approval_status: string
  status: string
  created_by: string
  created_at: string
  warehouse?: Warehouse
  source_invoice?: SaleInvoice
  lines?: GatePassLine[]
}

export const fetchGatePasses = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<OutwardGatePass>>('/v1/sales/gate-passes', { params })

export const fetchGatePass = (id: string) =>
  apiClient.get<{ data: OutwardGatePass }>(`/v1/sales/gate-passes/${id}`)

export const createGatePass = (payload: {
  source_invoice_id: string; warehouse_id: string; dispatch_date: string
  vehicle_number?: string | null; driver_name?: string | null
  lines: Omit<GatePassLine, 'id' | 'item'>[]
}) => apiClient.post<{ data: OutwardGatePass }>('/v1/sales/gate-passes', payload)

export const submitGatePassForApproval = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/submit-for-approval`, { comments })

export const approveGatePass = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/approve`, { comments })

export const rejectGatePass = (id: string, comments?: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/reject`, { comments })

export const dispatchGatePass = (id: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/dispatch`)

// ── Sales — Reports ───────────────────────────────────────────────────────────
export const fetchSalesRegister = (params: { date_from: string; date_to: string; customer_id?: string; page?: number }) =>
  apiClient.get('/v1/sales/reports/sales-register', { params })

export const fetchReceivablesAging = (params?: { customer_id?: string }) =>
  apiClient.get('/v1/sales/reports/receivables-aging', { params })
