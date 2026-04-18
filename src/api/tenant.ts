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
  apiClient.get<{ data: TaxSetting[] }>('/v1/settings/tax')

export const upsertTaxSetting = (payload: Omit<TaxSetting, 'id'>) =>
  apiClient.post<{ data: TaxSetting }>('/v1/settings/tax', payload)

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

// ── Sales — Full Customer type ────────────────────────────────────────────────
export interface CustomerCategory {
  id: number
  name: string
}

export interface CustomerGroup {
  id: number
  name: string
}

export interface CustomerFull {
  id: number
  customer_code: string
  name: string
  customer_category_id: number | null
  customer_group_id: number | null
  tax_number: string | null
  credit_limit: number
  payment_terms_days: number
  assigned_salesperson_id: number | null
  is_active: boolean
  customer_category?: CustomerCategory
  customer_group?: CustomerGroup
  assigned_salesperson?: TenantUser
}

export const fetchCustomerCategories = () =>
  apiClient.get<{ data: CustomerCategory[] }>('/v1/sales/customer-categories')

export const fetchCustomerGroups = () =>
  apiClient.get<{ data: CustomerGroup[] }>('/v1/sales/customer-groups')

export const fetchCustomersFull = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<CustomerFull>>('/v1/sales/customers', { params })

export const fetchCustomerFull = (id: number) =>
  apiClient.get<{ data: CustomerFull }>(`/v1/sales/customers/${id}`)

export const createCustomer = (payload: Omit<CustomerFull, 'id' | 'customer_category' | 'customer_group' | 'assigned_salesperson'>) =>
  apiClient.post<{ data: CustomerFull }>('/v1/sales/customers', payload)

export const updateCustomer = (id: number, payload: Partial<Omit<CustomerFull, 'id' | 'customer_category' | 'customer_group' | 'assigned_salesperson'>>) =>
  apiClient.patch<{ data: CustomerFull }>(`/v1/sales/customers/${id}`, payload)

// ── Sales — Price Lists ───────────────────────────────────────────────────────
export interface PriceListItem {
  id?: number
  price_list_id?: number
  item_id: number
  unit_price: number
  discount_percentage: number
  item?: Item
}

export interface PriceList {
  id: number
  name: string
  currency: string
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
  items?: PriceListItem[]
}

export const fetchPriceLists = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<PriceList>>('/v1/sales/price-lists', { params })

export const fetchPriceList = (id: number) =>
  apiClient.get<{ data: PriceList }>(`/v1/sales/price-lists/${id}`)

export const createPriceList = (payload: Omit<PriceList, 'id' | 'items'> & { items?: Omit<PriceListItem, 'id' | 'price_list_id' | 'item'>[] }) =>
  apiClient.post<{ data: PriceList }>('/v1/sales/price-lists', payload)

export const updatePriceList = (id: number, payload: Partial<Parameters<typeof createPriceList>[0]>) =>
  apiClient.patch<{ data: PriceList }>(`/v1/sales/price-lists/${id}`, payload)

// ── Sales — Quotations ────────────────────────────────────────────────────────
export interface QuotationLine {
  id?: number
  item_id: number
  description: string | null
  quantity: number
  unit_of_measure_id: number
  unit_price: number
  discount_percentage: number
  tax_amount: number
  line_total: number
  item?: Item
}

export interface Quotation {
  id: number
  quotation_number: string
  customer_id: number
  quotation_date: string
  valid_until: string | null
  price_list_id: number | null
  salesperson_id: number | null
  terms: string | null
  approval_status: string
  status: string
  created_by: number
  created_at: string
  customer?: CustomerFull
  lines?: QuotationLine[]
}

export const fetchQuotations = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<Quotation>>('/v1/sales/quotations', { params })

export const fetchQuotation = (id: number) =>
  apiClient.get<{ data: Quotation }>(`/v1/sales/quotations/${id}`)

export const createQuotation = (payload: {
  customer_id: number; quotation_date: string; valid_until?: string | null
  price_list_id?: number | null; salesperson_id?: number | null; terms?: string | null
  lines: Omit<QuotationLine, 'id' | 'item'>[]
}) => apiClient.post<{ data: Quotation }>('/v1/sales/quotations', payload)

export const updateQuotation = (id: number, payload: Partial<Parameters<typeof createQuotation>[0]>) =>
  apiClient.patch<{ data: Quotation }>(`/v1/sales/quotations/${id}`, payload)

export const submitQuotationForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/quotations/${id}/submit-for-approval`, { comments })

export const approveQuotation = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/quotations/${id}/approve`, { comments })

export const rejectQuotation = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/quotations/${id}/reject`, { comments })

export const convertQuotationToOrder = (id: number) =>
  apiClient.post<{ data: SaleOrder }>(`/v1/sales/quotations/${id}/convert-to-order`)

// ── Sales — Sale Orders ───────────────────────────────────────────────────────
export interface SaleOrderLine {
  id?: number
  item_id: number
  description: string | null
  quantity: number
  unit_of_measure_id: number
  unit_price: number
  discount_percentage: number
  tax_amount: number
  line_total: number
  quantity_invoiced: number
  item?: Item
}

export interface SaleOrder {
  id: number
  order_number: string
  source_quotation_id: number | null
  customer_id: number
  order_date: string
  delivery_date: string | null
  price_list_id: number | null
  approval_status: string
  fulfillment_status: string
  posting_status: string
  created_by: number
  created_at: string
  customer?: CustomerFull
  lines?: SaleOrderLine[]
}

export const fetchSaleOrders = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<SaleOrder>>('/v1/sales/orders', { params })

export const fetchSaleOrder = (id: number) =>
  apiClient.get<{ data: SaleOrder }>(`/v1/sales/orders/${id}`)

export const createSaleOrder = (payload: {
  customer_id: number; order_date: string; delivery_date?: string | null
  price_list_id?: number | null; lines: Omit<SaleOrderLine, 'id' | 'item' | 'quantity_invoiced'>[]
}) => apiClient.post<{ data: SaleOrder }>('/v1/sales/orders', payload)

export const updateSaleOrder = (id: number, payload: Partial<Parameters<typeof createSaleOrder>[0]>) =>
  apiClient.patch<{ data: SaleOrder }>(`/v1/sales/orders/${id}`, payload)

export const submitSaleOrderForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/orders/${id}/submit-for-approval`, { comments })

export const approveSaleOrder = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/orders/${id}/approve`, { comments })

export const rejectSaleOrder = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/orders/${id}/reject`, { comments })

// ── Sales — Sale Invoices ─────────────────────────────────────────────────────
export interface SaleInvoiceLine {
  id?: number
  item_id: number
  description: string | null
  quantity: number
  unit_of_measure_id: number
  unit_price: number
  discount_percentage: number
  tax_amount: number
  line_total: number
  item?: Item
}

export interface SaleInvoice {
  id: number
  invoice_number: string
  source_sale_order_id: number | null
  customer_id: number
  invoice_date: string
  due_date: string | null
  fiscal_period_id: number
  tax_rate: number
  discount_amount: number
  subtotal: number
  tax_amount: number
  total_amount: number
  approval_status: string
  posting_status: string
  created_by: number
  posted_by: number | null
  posted_at: string | null
  created_at: string
  customer?: CustomerFull
  fiscal_period?: FiscalPeriod
  lines?: SaleInvoiceLine[]
}

export const fetchSaleInvoices = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<SaleInvoice>>('/v1/sales/invoices', { params })

export const fetchSaleInvoice = (id: number) =>
  apiClient.get<{ data: SaleInvoice }>(`/v1/sales/invoices/${id}`)

export const createSaleInvoice = (payload: {
  source_sale_order_id?: number | null; customer_id: number; invoice_date: string
  due_date?: string | null; fiscal_period_id: number; tax_rate?: number
  discount_amount?: number; lines: Omit<SaleInvoiceLine, 'id' | 'item'>[]
}) => apiClient.post<{ data: SaleInvoice }>('/v1/sales/invoices', payload)

export const updateSaleInvoice = (id: number, payload: Partial<Parameters<typeof createSaleInvoice>[0]>) =>
  apiClient.patch<{ data: SaleInvoice }>(`/v1/sales/invoices/${id}`, payload)

export const submitSaleInvoiceForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/submit-for-approval`, { comments })

export const approveSaleInvoice = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/approve`, { comments })

export const rejectSaleInvoice = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/invoices/${id}/reject`, { comments })

export const postSaleInvoice = (id: number) =>
  apiClient.post(`/v1/sales/invoices/${id}/post`)

export const downloadInvoicePdf = (id: number) =>
  apiClient.get(`/v1/sales/invoices/${id}/pdf`, { responseType: 'blob' })

// ── Sales — Receipts ──────────────────────────────────────────────────────────
export interface ReceiptAllocation {
  id?: number
  invoice_id: number
  allocated_amount: number
  invoice?: SaleInvoice
}

export interface SaleReceipt {
  id: number
  receipt_number: string
  customer_id: number
  receipt_date: string
  amount_received: number
  payment_method: string
  reference: string | null
  posting_status: string
  created_by: number
  posted_at: string | null
  created_at: string
  customer?: CustomerFull
  allocations?: ReceiptAllocation[]
}

export const fetchSaleReceipts = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<SaleReceipt>>('/v1/sales/receipts', { params })

export const fetchSaleReceipt = (id: number) =>
  apiClient.get<{ data: SaleReceipt }>(`/v1/sales/receipts/${id}`)

export const createSaleReceipt = (payload: {
  customer_id: number; receipt_date: string; amount_received: number
  payment_method: string; reference?: string | null
  allocations?: { invoice_id: number; allocated_amount: number }[]
}) => apiClient.post<{ data: SaleReceipt }>('/v1/sales/receipts', payload)

export const postSaleReceipt = (id: number) =>
  apiClient.post(`/v1/sales/receipts/${id}/post`)

export const fetchOutstandingInvoices = (customerId: number) =>
  apiClient.get<{ data: SaleInvoice[] }>(`/v1/sales/customers/${customerId}/outstanding-invoices`)

// ── Sales — Credit Notes ──────────────────────────────────────────────────────
export interface CreditNote {
  id: number
  credit_note_number: string
  source_invoice_id: number
  customer_id: number
  credit_date: string
  reason: string | null
  total_amount: number
  approval_status: string
  posting_status: string
  created_by: number
  posted_at: string | null
  created_at: string
  customer?: CustomerFull
  source_invoice?: SaleInvoice
}

export const fetchCreditNotes = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<CreditNote>>('/v1/sales/credit-notes', { params })

export const fetchCreditNote = (id: number) =>
  apiClient.get<{ data: CreditNote }>(`/v1/sales/credit-notes/${id}`)

export const createCreditNote = (payload: {
  source_invoice_id: number; customer_id: number; credit_date: string
  reason?: string | null; total_amount: number
}) => apiClient.post<{ data: CreditNote }>('/v1/sales/credit-notes', payload)

export const submitCreditNoteForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/submit-for-approval`, { comments })

export const approveCreditNote = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/approve`, { comments })

export const rejectCreditNote = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/reject`, { comments })

export const postCreditNote = (id: number) =>
  apiClient.post(`/v1/sales/credit-notes/${id}/post`)

// ── Sales — Outward Gate Passes ───────────────────────────────────────────────
export interface GatePassLine {
  id?: number
  invoice_line_id: number
  item_id: number
  quantity_dispatched: number
  batch_id: number | null
  serial_number_id: number | null
  item?: Item
}

export interface OutwardGatePass {
  id: number
  gate_pass_number: string
  source_invoice_id: number
  warehouse_id: number
  dispatch_date: string
  vehicle_number: string | null
  driver_name: string | null
  approval_status: string
  status: string
  created_by: number
  created_at: string
  warehouse?: Warehouse
  source_invoice?: SaleInvoice
  lines?: GatePassLine[]
}

export const fetchGatePasses = (params?: Record<string, string | number>) =>
  apiClient.get<PaginatedResponse<OutwardGatePass>>('/v1/sales/gate-passes', { params })

export const fetchGatePass = (id: number) =>
  apiClient.get<{ data: OutwardGatePass }>(`/v1/sales/gate-passes/${id}`)

export const createGatePass = (payload: {
  source_invoice_id: number; warehouse_id: number; dispatch_date: string
  vehicle_number?: string | null; driver_name?: string | null
  lines: Omit<GatePassLine, 'id' | 'item'>[]
}) => apiClient.post<{ data: OutwardGatePass }>('/v1/sales/gate-passes', payload)

export const submitGatePassForApproval = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/submit-for-approval`, { comments })

export const approveGatePass = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/approve`, { comments })

export const rejectGatePass = (id: number, comments?: string) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/reject`, { comments })

export const dispatchGatePass = (id: number) =>
  apiClient.post(`/v1/sales/gate-passes/${id}/dispatch`)

// ── Sales — Reports ───────────────────────────────────────────────────────────
export const fetchSalesRegister = (params: { date_from: string; date_to: string; customer_id?: number; page?: number }) =>
  apiClient.get('/v1/sales/reports/sales-register', { params })

export const fetchReceivablesAging = (params?: { customer_id?: number }) =>
  apiClient.get('/v1/sales/reports/receivables-aging', { params })
