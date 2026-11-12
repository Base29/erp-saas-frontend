import apiClient from './client'

export interface PurchaseRequisitionLine {
  id: string
  purchase_requisition_id?: string
  item_id?: string | null
  item_description: string
  quantity: number
  ordered_quantity?: number
  unit_of_measure_id?: string | null
  estimated_unit_cost: number
  estimated_total_cost: number
  cost_center_id?: string | null
  project_id?: string | null
  notes?: string | null
  item?: { id: string; item_name: string; item_code: string } | null
  unit_of_measure?: { id: string; name: string; abbreviation: string } | null
  cost_center?: { id: string; code: string; name: string } | null
}

export interface PurchaseRequisition {
  id: string
  company_id: string
  requisition_number: string
  requisition_date: string
  required_by_date?: string | null
  requester_id: string
  cost_center_id?: string | null
  project_id?: string | null
  purpose?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'submitted' | 'approved' | 'partially_ordered' | 'fully_ordered' | 'rejected' | 'cancelled'
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  total_estimated_amount: number | string
  notes?: string | null
  created_by: string
  created_at: string
  updated_at: string
  requester?: { id: string; name: string; email: string } | null
  creator?: { id: string; name: string; email: string } | null
  cost_center?: { id: string; code: string; name: string } | null
  lines_count?: number
  lines?: PurchaseRequisitionLine[]
  purchase_orders?: PurchaseOrder[]
}

export interface PurchaseOrderLine {
  id: string
  purchase_order_id?: string
  purchase_requisition_line_id?: string | null
  item_id?: string | null
  item_description: string
  quantity: number
  received_quantity?: number
  billed_quantity?: number
  unit_of_measure_id?: string | null
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  expense_account_id?: string | null
  cost_center_id?: string | null
  project_id?: string | null
  notes?: string | null
  item?: { id: string; item_name: string; item_code: string } | null
  unit_of_measure?: { id: string; name: string; abbreviation: string } | null
  cost_center?: { id: string; code: string; name: string } | null
}

export interface PurchaseOrder {
  id: string
  company_id: string
  po_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date?: string | null
  currency_code: string
  exchange_rate: number | string
  subtotal: number | string
  tax_amount: number | string
  discount_amount: number | string
  total_amount: number | string
  payment_terms?: string | null
  delivery_address?: string | null
  cost_center_id?: string | null
  project_id?: string | null
  status: 'draft' | 'issued' | 'partially_received' | 'fully_received' | 'completed' | 'cancelled'
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  posting_status: 'unposted' | 'posted'
  posted_at?: string | null
  posted_by?: string | null
  purchase_requisition_id?: string | null
  notes?: string | null
  terms_and_conditions?: string | null
  created_by: string
  created_at: string
  updated_at: string
  supplier?: { id: string; name: string; supplier_code: string } | null
  cost_center?: { id: string; code: string; name: string } | null
  creator?: { id: string; name: string; email: string } | null
  poster?: { id: string; name: string; email: string } | null
  requisition?: PurchaseRequisition | null
  goodsReceipts?: any[]
  goods_receipts?: any[]
  purchaseInvoices?: any[]
  purchase_invoices?: any[]
  lines_count?: number
  lines?: PurchaseOrderLine[]
}

export interface ReconciliationLine {
  purchase_order_line_id: string
  item_description: string
  item_code?: string
  ordered_quantity: number
  accepted_quantity: number
  billed_quantity: number
  unit_price: number
  received_value: number
  billed_amount: number
  fulfillment_percent: number
  billing_percent: number
  status: 'matched' | 'pending_receipt' | 'pending_invoice' | 'over_billed'
}

export interface OrderReconciliation {
  purchase_order_id: string
  po_number: string
  status: string
  total_ordered_amount: number
  total_received_value: number
  total_billed_amount: number
  unbilled_receipt_val: number
  lines: ReconciliationLine[]
}

export interface ThreeWayMatchReport {
  invoice_id: string
  invoice_number: string
  overall_status: 'matched' | 'variance' | 'unmatched'
  tolerance_percent: number
  total_price_variance: number
  is_matched: boolean
  can_auto_post: boolean
  lines: Array<{
    line_id: string
    item_description: string
    status: string
    ordered_qty?: number
    po_unit_price?: number
    accepted_qty?: number
    invoiced_qty?: number
    invoiced_price?: number
    variance_amount?: number
    variance_percent?: number
    notes?: string
  }>
}

export interface RfqLine {
  id: string
  rfq_id?: string
  purchase_requisition_line_id?: string | null
  item_id?: string | null
  item_description: string
  quantity: number
  unit_of_measure_id?: string | null
  target_price?: number | null
  notes?: string | null
  item?: { id: string; item_name: string; item_code: string } | null
  unit_of_measure?: { id: string; name: string; abbreviation: string } | null
}

export interface RfqSupplier {
  id: string
  rfq_id: string
  supplier_id: string
  invitation_status: 'invited' | 'responded' | 'declined'
  invited_at?: string | null
  responded_at?: string | null
  notes?: string | null
  supplier?: { id: string; name: string; supplier_code: string } | null
}

export interface Rfq {
  id: string
  company_id: string
  rfq_number: string
  title: string
  rfq_date: string
  bid_deadline?: string | null
  purchase_requisition_id?: string | null
  status: 'draft' | 'sent' | 'closed' | 'cancelled'
  notes?: string | null
  terms_and_conditions?: string | null
  created_by: string
  created_at: string
  updated_at: string
  requisition?: PurchaseRequisition | null
  creator?: { id: string; name: string; email: string } | null
  lines_count?: number
  invited_suppliers_count?: number
  quotations_count?: number
  lines?: RfqLine[]
  invited_suppliers?: RfqSupplier[]
  invitedSuppliers?: RfqSupplier[]
  quotations?: SupplierQuotation[]
}

export interface SupplierQuotationLine {
  id: string
  supplier_quotation_id?: string
  rfq_line_id?: string | null
  item_id?: string | null
  item_description: string
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  lead_time_days: number
  notes?: string | null
  item?: { id: string; item_name: string; item_code: string } | null
}

export interface SupplierQuotation {
  id: string
  company_id: string
  rfq_id?: string | null
  supplier_id: string
  quotation_number: string
  supplier_quote_reference?: string | null
  quotation_date: string
  valid_until?: string | null
  currency_code: string
  exchange_rate: number | string
  subtotal: number | string
  discount_amount: number | string
  tax_amount: number | string
  total_amount: number | string
  payment_terms?: string | null
  lead_time_days: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  awarded_at?: string | null
  purchase_order_id?: string | null
  notes?: string | null
  created_by: string
  created_at: string
  supplier?: { id: string; name: string; supplier_code: string } | null
  purchase_order?: PurchaseOrder | null
  purchaseOrder?: PurchaseOrder | null
  lines?: SupplierQuotationLine[]
}

export interface QuotationComparisonMatrix {
  rfq_id: string
  rfq_number: string
  title: string
  bid_deadline?: string | null
  status: string
  suppliers: Array<{
    quotation_id: string
    quotation_number: string
    supplier_id: string
    supplier_name: string
    supplier_code: string
    total_amount: number
    subtotal: number
    lead_time_days: number
    payment_terms?: string | null
    currency_code: string
    status: string
    awarded: boolean
  }>
  matrix: Array<{
    rfq_line_id: string
    item_id?: string | null
    item_description: string
    quantity: number
    target_price?: number | null
    lowest_price?: number | null
    quotes: Record<string, {
      quotation_id: string
      supplier_id: string
      supplier_name: string
      unit_price: number | null
      line_total: number | null
      lead_time_days: number
      discount_amount: number
      is_lowest: boolean
    }>
  }>
}

export const procurementApi = {
  // Requisitions
  getRequisitions: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/v1/procurement/requisitions', { params })
    return response.data
  },
  getRequisition: async (id: string) => {
    const response = await apiClient.get(`/v1/procurement/requisitions/${id}`)
    return response.data
  },
  createRequisition: async (data: Partial<PurchaseRequisition>) => {
    const response = await apiClient.post('/v1/procurement/requisitions', data)
    return response.data
  },
  updateRequisition: async (id: string, data: Partial<PurchaseRequisition>) => {
    const response = await apiClient.put(`/v1/procurement/requisitions/${id}`, data)
    return response.data
  },
  submitRequisitionForApproval: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/requisitions/${id}/submit-for-approval`)
    return response.data
  },
  approveRequisition: async (id: string, comments = '') => {
    const response = await apiClient.post(`/v1/procurement/requisitions/${id}/approve`, { comments })
    return response.data
  },
  rejectRequisition: async (id: string, comments = '') => {
    const response = await apiClient.post(`/v1/procurement/requisitions/${id}/reject`, { comments })
    return response.data
  },
  cancelRequisition: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/requisitions/${id}/cancel`)
    return response.data
  },

  // Purchase Orders
  getOrders: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/v1/procurement/orders', { params })
    return response.data
  },
  getOrder: async (id: string) => {
    const response = await apiClient.get(`/v1/procurement/orders/${id}`)
    return response.data
  },
  createOrder: async (data: Partial<PurchaseOrder>) => {
    const response = await apiClient.post('/v1/procurement/orders', data)
    return response.data
  },
  submitOrderForApproval: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/orders/${id}/submit-for-approval`)
    return response.data
  },
  approveOrder: async (id: string, comments = '') => {
    const response = await apiClient.post(`/v1/procurement/orders/${id}/approve`, { comments })
    return response.data
  },
  rejectOrder: async (id: string, comments = '') => {
    const response = await apiClient.post(`/v1/procurement/orders/${id}/reject`, { comments })
    return response.data
  },
  postOrder: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/orders/${id}/post`)
    return response.data
  },
  cancelOrder: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/orders/${id}/cancel`)
    return response.data
  },
  getOrderReconciliation: async (id: string) => {
    const response = await apiClient.get(`/v1/procurement/orders/${id}/reconciliation`)
    return response.data
  },
  generateBillFromOrder: async (id: string, data?: { invoice_number?: string; invoice_date?: string; due_date?: string; lines?: any[] }) => {
    const response = await apiClient.post(`/v1/procurement/orders/${id}/generate-bill`, data)
    return response.data
  },
  validateInvoiceMatch: async (invoiceId: string) => {
    const response = await apiClient.post(`/v1/accounts/purchase-invoices/${invoiceId}/validate-match`)
    return response.data
  },

  // RFQs (Requests for Quotation)
  getRfqs: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/v1/procurement/rfqs', { params })
    return response.data
  },
  getRfq: async (id: string) => {
    const response = await apiClient.get(`/v1/procurement/rfqs/${id}`)
    return response.data
  },
  createRfq: async (data: Partial<Rfq> & { supplier_ids?: string[] }) => {
    const response = await apiClient.post('/v1/procurement/rfqs', data)
    return response.data
  },
  updateRfq: async (id: string, data: Partial<Rfq> & { supplier_ids?: string[] }) => {
    const response = await apiClient.put(`/v1/procurement/rfqs/${id}`, data)
    return response.data
  },
  sendRfq: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/rfqs/${id}/send`)
    return response.data
  },
  closeRfq: async (id: string) => {
    const response = await apiClient.post(`/v1/procurement/rfqs/${id}/close`)
    return response.data
  },
  getRfqComparisonMatrix: async (id: string) => {
    const response = await apiClient.get(`/v1/procurement/rfqs/${id}/comparison-matrix`)
    return response.data
  },
  awardRfqQuotation: async (id: string, quotationId: string) => {
    const response = await apiClient.post(`/v1/procurement/rfqs/${id}/award/${quotationId}`)
    return response.data
  },

  // Supplier Quotations
  getQuotations: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/v1/procurement/quotations', { params })
    return response.data
  },
  getQuotation: async (id: string) => {
    const response = await apiClient.get(`/v1/procurement/quotations/${id}`)
    return response.data
  },
  createQuotation: async (data: Partial<SupplierQuotation>) => {
    const response = await apiClient.post('/v1/procurement/quotations', data)
    return response.data
  },
  updateQuotation: async (id: string, data: Partial<SupplierQuotation>) => {
    const response = await apiClient.put(`/v1/procurement/quotations/${id}`, data)
    return response.data
  },
}
