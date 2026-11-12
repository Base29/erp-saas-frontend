import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  ShoppingCart,
} from 'lucide-react'
import { procurementApi, type PurchaseRequisition } from '@/api/procurement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/utils/format'
import ApprovalActionModal from './components/ApprovalActionModal'

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'submit' | 'approve' | 'reject' | 'cancel'>('submit')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-requisition', id],
    queryFn: () => procurementApi.getRequisition(id!),
    enabled: Boolean(id),
  })

  const req: PurchaseRequisition | undefined = data?.data

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading requisition details...</div>
  }

  if (isError || !req) {
    return (
      <div className="p-8 text-center text-destructive">
        Requisition not found or an error occurred.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/procurement/requisitions')}>
            Back to List
          </Button>
        </div>
      </div>
    )
  }

  const handleAction = (type: 'submit' | 'approve' | 'reject' | 'cancel') => {
    setActionType(type)
    setApprovalModalOpen(true)
  }

  const handleConfirmAction = async (comments: string) => {
    if (!id) return
    if (actionType === 'submit') {
      await procurementApi.submitRequisitionForApproval(id)
    } else if (actionType === 'approve') {
      await procurementApi.approveRequisition(id, comments)
    } else if (actionType === 'reject') {
      await procurementApi.rejectRequisition(id, comments)
    } else if (actionType === 'cancel') {
      await procurementApi.cancelRequisition(id)
    }
    qc.invalidateQueries({ queryKey: ['purchase-requisition', id] })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/procurement/requisitions')}
            className="h-9 w-9 text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {req.requisition_number}
              </h1>
              <Badge variant="outline" className="uppercase text-[10px]">
                {req.priority} Priority
              </Badge>
              <Badge
                className={
                  req.approval_status === 'approved'
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : req.approval_status === 'pending_approval'
                    ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {(req.approval_status || 'draft').replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {formatDate(req.created_at)} by {req.creator?.name || 'User'}
            </p>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2">
          {req.approval_status === 'draft' && (
            <Button onClick={() => handleAction('submit')} className="gap-1.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4" /> Submit for Approval
            </Button>
          )}

          {req.approval_status === 'pending_approval' && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleAction('reject')}
              >
                Reject
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => handleAction('approve')}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve Requisition
              </Button>
            </>
          )}

          {req.approval_status === 'approved' && req.status !== 'fully_ordered' && (
            <Button
              className="gap-1.5 bg-primary text-primary-foreground"
              onClick={() => navigate(`/procurement/orders/new?requisition_id=${req.id}`)}
            >
              <ShoppingCart className="h-4 w-4" /> Convert to Purchase Order
            </Button>
          )}

          {req.status !== 'cancelled' && req.status !== 'fully_ordered' && (
            <Button variant="ghost" className="text-muted-foreground" onClick={() => handleAction('cancel')}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
              Requisition Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requester:</span>
              <span className="font-medium text-foreground">{req.requester?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium text-foreground">{formatDate(req.requisition_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required By:</span>
              <span className="font-medium text-foreground">
                {req.required_by_date ? formatDate(req.required_by_date) : 'Flexible'}
              </span>
            </div>
            {req.cost_center && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Center:</span>
                <span className="font-medium text-foreground">{req.cost_center.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Estimated:</span>
              <span className="font-mono text-sm font-bold text-primary">
                {formatCurrency(Number(req.total_estimated_amount) || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lines Count:</span>
              <span className="font-medium text-foreground">{req.lines?.length || 0} line(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fulfillment:</span>
              <span className="font-medium capitalize text-foreground">{(req.status || 'draft').replace('_', ' ')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
              Purpose & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <p className="font-medium text-foreground">{req.purpose || 'No purpose stated.'}</p>
            {req.notes && <p className="text-muted-foreground italic mt-1">{req.notes}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold text-foreground">Requested Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="p-3 text-left">Item / Description</th>
                  <th className="p-3 text-right">Requested Qty</th>
                  <th className="p-3 text-right">Ordered Qty</th>
                  <th className="p-3 text-right">Remaining</th>
                  <th className="p-3 text-right">Est. Unit Cost</th>
                  <th className="p-3 text-right">Est. Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {req.lines?.map((line) => {
                  const reqQty = Number(line.quantity) || 0
                  const ordQty = Number(line.ordered_quantity) || 0
                  const remaining = Math.max(0, reqQty - ordQty)
                  return (
                    <tr key={line.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{line.item_description}</div>
                        {line.item && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Code: {line.item.item_code}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">{reqQty.toLocaleString()}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">
                        {ordQty.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-muted-foreground">
                        {remaining.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(Number(line.estimated_unit_cost) || 0)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-foreground">
                        {formatCurrency(Number(line.estimated_total_cost) || 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Associated Purchase Orders */}
      {req.purchase_orders && req.purchase_orders.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold text-foreground">Linked Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {req.purchase_orders.map((po) => (
                <div key={po.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary">{po.po_number}</span>
                    <span className="text-muted-foreground">{formatDate(po.order_date)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-medium">{formatCurrency(Number(po.total_amount) || 0)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/procurement/orders/${po.id}`)}
                      className="h-7 text-xs"
                    >
                      View Order
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Action Modal */}
      <ApprovalActionModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        actionType={actionType}
        documentTitle={`Requisition #${req.requisition_number}`}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
}
