import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Printer,
  Building2,
  Package,
  PackageCheck,
  Truck,
  ExternalLink,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { procurementApi, type PurchaseOrder } from '@/api/procurement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/utils/format'
import ApprovalActionModal from './components/ApprovalActionModal'
import ReceiveGoodsModal from './components/ReceiveGoodsModal'
import GenerateBillModal from './components/GenerateBillModal'

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [billModalOpen, setBillModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'submit' | 'approve' | 'reject' | 'post' | 'cancel'>('submit')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => procurementApi.getOrder(id!),
    enabled: Boolean(id),
  })

  const { data: recData } = useQuery({
    queryKey: ['po-reconciliation', id],
    queryFn: () => procurementApi.getOrderReconciliation(id!),
    enabled: Boolean(id),
  })

  const po: PurchaseOrder | undefined = data?.data

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading purchase order...</div>
  }

  if (isError || !po) {
    return (
      <div className="p-8 text-center text-destructive">
        Purchase Order not found or an error occurred.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/procurement/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  const handleAction = (type: 'submit' | 'approve' | 'reject' | 'post' | 'cancel') => {
    setActionType(type)
    setApprovalModalOpen(true)
  }

  const handleConfirmAction = async (comments: string) => {
    if (!id) return
    if (actionType === 'submit') {
      await procurementApi.submitOrderForApproval(id)
    } else if (actionType === 'approve') {
      await procurementApi.approveOrder(id, comments)
    } else if (actionType === 'reject') {
      await procurementApi.rejectOrder(id, comments)
    } else if (actionType === 'post') {
      await procurementApi.postOrder(id)
    } else if (actionType === 'cancel') {
      await procurementApi.cancelOrder(id)
    }
    qc.invalidateQueries({ queryKey: ['purchase-order', id] })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/procurement/orders')}
            className="h-9 w-9 text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {po.po_number}
              </h1>
              <Badge
                className={
                  po.status === 'issued'
                    ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                    : po.status === 'fully_received'
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : po.status === 'partially_received'
                    ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {(po.status || 'draft').replace('_', ' ')}
              </Badge>
              <Badge
                variant="outline"
                className={
                  po.approval_status === 'approved'
                    ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
                    : po.approval_status === 'pending_approval'
                    ? 'text-amber-600 border-amber-500/40 bg-amber-500/10'
                    : 'text-muted-foreground'
                }
              >
                {(po.approval_status || 'draft').replace('_', ' ')}
              </Badge>
              <Badge
                variant="secondary"
                className={
                  po.posting_status === 'posted'
                    ? 'bg-emerald-600/15 text-emerald-700 font-mono text-[10px]'
                    : 'text-muted-foreground font-mono text-[10px]'
                }
              >
                {po.posting_status === 'posted' ? 'POSTED' : 'UNPOSTED'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issued on {formatDate(po.order_date)} to <span className="font-semibold">{po.supplier?.name}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-4 w-4" /> Print PO
          </Button>

          {po.approval_status === 'draft' && (
            <Button size="sm" onClick={() => handleAction('submit')} className="gap-1.5 shadow-sm text-xs">
              <CheckCircle2 className="h-4 w-4" /> Submit for Approval
            </Button>
          )}

          {po.approval_status === 'pending_approval' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10"
                onClick={() => handleAction('reject')}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => handleAction('approve')}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve Order
              </Button>
            </>
          )}

          {po.approval_status === 'approved' && po.status !== 'cancelled' && po.status !== 'fully_received' && (
            <Button
              size="sm"
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
              onClick={() => setReceiveModalOpen(true)}
            >
              <PackageCheck className="h-4 w-4" /> Receive Goods
            </Button>
          )}

          {po.approval_status === 'approved' && po.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1.5 shadow-sm"
              onClick={() => setBillModalOpen(true)}
            >
              <FileText className="h-4 w-4" /> Create Bill
            </Button>
          )}

          {po.approval_status === 'approved' && po.posting_status === 'unposted' && (
            <Button
              size="sm"
              variant="default"
              className="text-xs bg-primary text-primary-foreground gap-1.5 shadow-sm"
              onClick={() => handleAction('post')}
            >
              Post to Ledger
            </Button>
          )}

          {po.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => handleAction('cancel')}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="font-bold text-sm text-foreground">{po.supplier?.name}</div>
            <div className="text-muted-foreground font-mono">Code: {po.supplier?.supplier_code}</div>
            {po.delivery_address && (
              <div className="pt-2 text-muted-foreground">
                <span className="font-medium text-foreground">Delivery Site:</span> {po.delivery_address}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Terms & Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Date:</span>
              <span className="font-medium text-foreground">{formatDate(po.order_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Delivery:</span>
              <span className="font-medium text-foreground">
                {po.expected_delivery_date ? formatDate(po.expected_delivery_date) : 'Flexible'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms:</span>
              <span className="font-medium text-foreground">{po.payment_terms || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-mono font-medium text-foreground">
                {po.currency_code} (Rate: {Number(po.exchange_rate).toFixed(2)})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Linked Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {po.requisition ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Requisition:</span>
                <button
                  onClick={() => navigate(`/procurement/requisitions/${po.requisition?.id}`)}
                  className="font-mono text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  {po.requisition.requisition_number}
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="text-muted-foreground">Direct Purchase Order (No PR)</div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goods Receipts:</span>
              <span className="font-medium text-foreground">{po.goodsReceipts?.length || 0} GRN(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoiced Bills:</span>
              <span className="font-medium text-foreground">{po.purchaseInvoices?.length || 0} Bill(s)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Line Items Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold">Ordered Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="p-3 text-left">Item / Description</th>
                  <th className="p-3 text-right">Ordered Qty</th>
                  <th className="p-3 text-right">Received Qty</th>
                  <th className="p-3 text-right">Billed Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Tax</th>
                  <th className="p-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {po.lines?.map((line) => {
                  const ordQty = Number(line.quantity) || 0
                  const recQty = Number(line.received_quantity) || 0
                  const billedQty = Number(line.billed_quantity) || 0
                  return (
                    <tr key={line.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{line.item_description}</div>
                        {line.item && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {line.item.item_code}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">{ordQty.toLocaleString()}</td>
                      <td className="p-3 text-right font-medium">
                        <span className={recQty >= ordQty ? 'text-emerald-600' : 'text-amber-600'}>
                          {recQty.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-muted-foreground">
                        {billedQty.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(Number(line.unit_price) || 0)}
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {Number(line.discount_amount) > 0 ? `-${formatCurrency(Number(line.discount_amount))}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {Number(line.tax_amount) > 0 ? `+${formatCurrency(Number(line.tax_amount))}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(Number(line.line_total) || 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="bg-muted/30 p-4 border-t flex flex-col items-end gap-1.5 text-xs">
            <div className="flex justify-between w-64 text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-mono text-foreground font-medium">{formatCurrency(Number(po.subtotal) || 0)}</span>
            </div>
            {Number(po.discount_amount) > 0 && (
              <div className="flex justify-between w-64 text-muted-foreground">
                <span>Discount:</span>
                <span className="font-mono text-emerald-600 font-medium">
                  -{formatCurrency(Number(po.discount_amount) || 0)}
                </span>
              </div>
            )}
            {Number(po.tax_amount) > 0 && (
              <div className="flex justify-between w-64 text-muted-foreground">
                <span>Tax:</span>
                <span className="font-mono text-foreground font-medium">
                  +{formatCurrency(Number(po.tax_amount) || 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between w-64 pt-2 border-t text-sm font-bold text-foreground">
              <span>Total PO Value:</span>
              <span className="font-mono text-primary font-bold">{formatCurrency(Number(po.total_amount) || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      {(po.notes || po.terms_and_conditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {po.notes && (
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{po.notes}</p>
              </CardContent>
            </Card>
          )}

          {po.terms_and_conditions && (
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{po.terms_and_conditions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 3-Way Match & Accounting Reconciliation */}
      {recData?.data && (
        <Card className="border-indigo-500/20 bg-gradient-to-r from-background to-indigo-500/5">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> 3-Way Match & Accounting Reconciliation
              </span>
              <Badge variant="outline" className="text-indigo-600 border-indigo-500/30 font-mono text-[11px]">
                {recData.data.unbilled_receipt_val > 0
                  ? `Pending Bill: ${formatCurrency(recData.data.unbilled_receipt_val)}`
                  : 'Fully Reconciled'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-background/80 p-3 rounded-md border">
                <div className="text-muted-foreground text-[11px]">PO Total Value</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {formatCurrency(recData.data.total_ordered_amount)}
                </div>
              </div>
              <div className="bg-background/80 p-3 rounded-md border">
                <div className="text-muted-foreground text-[11px]">GRN Accepted Value</div>
                <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                  {formatCurrency(recData.data.total_received_value)}
                </div>
              </div>
              <div className="bg-background/80 p-3 rounded-md border">
                <div className="text-muted-foreground text-[11px]">Invoiced Bills</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {formatCurrency(recData.data.total_billed_amount)}
                </div>
              </div>
              <div className="bg-background/80 p-3 rounded-md border">
                <div className="text-muted-foreground text-[11px]">Unbilled GR/IR Accrual</div>
                <div className="text-base font-bold font-mono text-amber-600 mt-0.5">
                  {formatCurrency(recData.data.unbilled_receipt_val)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Purchase Invoices / Bills */}
      {Boolean((po.purchase_invoices?.length || po.purchaseInvoices?.length)) && (
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" /> Linked Vendor Bills (Invoices)
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {(po.purchase_invoices || po.purchaseInvoices || []).length} Bill(s)
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3 text-left">Invoice #</th>
                    <th className="p-3 text-left">Invoice Date</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-center">3-Way Match</th>
                    <th className="p-3 text-center">GL Posting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(po.purchase_invoices || po.purchaseInvoices || []).map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium text-foreground">{bill.invoice_number}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(bill.invoice_date)}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(Number(bill.total_amount) || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            bill.matching_status === 'matched'
                              ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
                              : bill.matching_status === 'variance'
                              ? 'text-amber-600 border-amber-500/40 bg-amber-500/10'
                              : 'text-muted-foreground'
                          }
                        >
                          {bill.matching_status || 'matched'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            bill.posting_status === 'posted'
                              ? 'bg-emerald-600/15 text-emerald-700 font-mono text-[10px]'
                              : 'text-muted-foreground font-mono text-[10px]'
                          }
                        >
                          {bill.posting_status === 'posted' ? 'POSTED' : 'UNPOSTED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goods Receipts Section */}
      {Boolean((po.goods_receipts?.length || po.goodsReceipts?.length)) && (
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-600" /> Linked Goods Receipts (GRNs)
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {(po.goods_receipts || po.goodsReceipts || []).length} Document(s)
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3 text-left">GRN Number</th>
                    <th className="p-3 text-left">Receipt Date</th>
                    <th className="p-3 text-left">Warehouse</th>
                    <th className="p-3 text-center">Approval</th>
                    <th className="p-3 text-center">Posting</th>
                    <th className="p-3 text-right">Items Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(po.goods_receipts || po.goodsReceipts || []).map((grn: any) => (
                    <tr key={grn.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium text-foreground">{grn.grn_number}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(grn.receipt_date)}</td>
                      <td className="p-3 text-foreground">{grn.warehouse?.name || 'Default Warehouse'}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            grn.approval_status === 'approved'
                              ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
                              : 'text-amber-600 border-amber-500/40 bg-amber-500/10'
                          }
                        >
                          {grn.approval_status || 'draft'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            grn.posting_status === 'posted'
                              ? 'bg-emerald-600/15 text-emerald-700 font-mono text-[10px]'
                              : 'text-muted-foreground font-mono text-[10px]'
                          }
                        >
                          {grn.posting_status === 'posted' ? 'POSTED' : 'UNPOSTED'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {grn.lines?.reduce((acc: number, l: any) => acc + (Number(l.accepted_quantity ?? l.received_quantity) || 0), 0) || '-'} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval / Posting Modal */}
      <ApprovalActionModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        actionType={actionType}
        documentTitle={`Purchase Order #${po.po_number}`}
        onConfirm={handleConfirmAction}
      />

      {/* Receive Goods Modal */}
      <ReceiveGoodsModal
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        onSuccess={() => {
          setReceiveModalOpen(false)
          qc.invalidateQueries({ queryKey: ['purchase-order', id] })
          qc.invalidateQueries({ queryKey: ['po-reconciliation', id] })
        }}
        order={po}
      />

      {/* Generate Bill Modal */}
      <GenerateBillModal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        onSuccess={() => {
          setBillModalOpen(false)
          qc.invalidateQueries({ queryKey: ['purchase-order', id] })
          qc.invalidateQueries({ queryKey: ['po-reconciliation', id] })
        }}
        order={po}
      />
    </div>
  )
}
