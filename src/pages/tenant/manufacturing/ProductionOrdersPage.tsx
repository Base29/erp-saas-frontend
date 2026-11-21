import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  type ProductionOrder,
} from '@/api/manufacturing'
import apiClient from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ClipboardList, Plus, Search, Play, Pause, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ProductionOrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [actionModal, setActionModal] = useState<{ order: ProductionOrder; targetStatus: string } | null>(null)
  const [actionReason, setActionReason] = useState('')

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => apiClient.get('/v1/inventory/items?all=true').then((r) => r.data.data),
  })

  const { data: workCenters } = useQuery({
    queryKey: ['work-centers-all'],
    queryFn: () => apiClient.get('/v1/manufacturing/work-centers?all=true').then((r) => r.data.data),
  })

  const [formData, setFormData] = useState({
    item_id: '',
    work_center_id: '',
    planned_quantity: 100,
    batch_number: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', search],
    queryFn: () => fetchOrders({ search }).then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setModalOpen(false)
      toast.success('Production order created successfully')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create order'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      updateOrderStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setActionModal(null)
      setActionReason('')
      toast.success('Work order status updated')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update order status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order deleted')
    },
  })

  const handleOpenAction = (order: ProductionOrder, targetStatus: string) => {
    if (targetStatus === 'on_hold' || targetStatus === 'short_closed') {
      setActionModal({ order, targetStatus })
      setActionReason('')
    } else {
      statusMutation.mutate({ id: order.id, status: targetStatus })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Production Orders (Work Orders)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dispatch shop-floor work orders, monitor progress vs. rejects, and control batch closures.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Create Work Order
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Active & Completed Work Orders</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, batch, item..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Good Produced</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    Loading production orders...
                  </TableCell>
                </TableRow>
              ) : orders && orders.length > 0 ? (
                orders.map((order: ProductionOrder) => {
                  const planned = Number(order.planned_quantity)
                  const good = Number(order.produced_good_quantity)
                  const pct = planned > 0 ? Math.min(100, Math.round((good / planned) * 100)) : 0

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-semibold">{order.order_number}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{order.batch_number}</TableCell>
                      <TableCell className="font-medium text-xs">
                        {order.item?.item_name}
                        <span className="block font-mono text-[10px] text-muted-foreground">{order.item?.item_code}</span>
                      </TableCell>
                      <TableCell className="text-xs">{order.work_center?.name ?? '—'}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium">{planned.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {good.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono font-medium text-[11px]">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'success'
                              : order.status === 'in_progress'
                              ? 'default'
                              : order.status === 'on_hold'
                              ? 'outline'
                              : order.status === 'short_closed'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={order.status === 'on_hold' ? 'border-amber-500/40 text-amber-600 bg-amber-500/10' : ''}
                        >
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {order.status === 'planned' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleOpenAction(order, 'in_progress')}
                            >
                              <Play className="h-3.5 w-3.5 mr-1" /> Start
                            </Button>
                          )}
                          {order.status === 'in_progress' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-amber-600 hover:text-amber-700"
                                onClick={() => handleOpenAction(order, 'on_hold')}
                              >
                                <Pause className="h-3.5 w-3.5 mr-1" /> Hold
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                                onClick={() => handleOpenAction(order, 'completed')}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                              </Button>
                            </>
                          )}
                          {order.status === 'on_hold' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary"
                              onClick={() => handleOpenAction(order, 'in_progress')}
                            >
                              <Play className="h-3.5 w-3.5 mr-1" /> Resume
                            </Button>
                          )}
                          {order.status !== 'completed' && order.status !== 'short_closed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-500 hover:text-rose-600"
                              onClick={() => handleOpenAction(order, 'short_closed')}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Close
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete order ${order.order_number}?`)) {
                                deleteMutation.mutate(order.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    No production orders found. Click &quot;Create Work Order&quot; to schedule production.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Product to Produce *</Label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
              >
                <option value="">Select item...</option>
                {inventoryItems?.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.item_name} ({i.item_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Planned Qty *</Label>
                <Input
                  type="number"
                  min="0.01"
                  required
                  value={formData.planned_quantity}
                  onChange={(e) => setFormData({ ...formData, planned_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Machine / Work Center</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.work_center_id}
                  onChange={(e) => setFormData({ ...formData, work_center_id: e.target.value })}
                >
                  <option value="">Select machine...</option>
                  {workCenters?.map((wc: any) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.name} ({wc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Batch / Lot # (optional)</Label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes / Special Instructions</Label>
              <Input
                placeholder="Operator notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reason Modal (Hold or Short-Close) */}
      <Dialog open={!!actionModal} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionModal?.targetStatus === 'on_hold' ? 'Place Order On Hold' : 'Short Close Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Please provide a reason for {actionModal?.targetStatus === 'on_hold' ? 'holding' : 'short-closing'} order {actionModal?.order.order_number}:
            </p>
            <Input
              required
              placeholder="e.g. Material shortage, Tooling issue, Client revised quantity..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={actionModal?.targetStatus === 'on_hold' ? 'default' : 'destructive'}
                onClick={() => {
                  if (actionModal) {
                    statusMutation.mutate({
                      id: actionModal.order.id,
                      status: actionModal.targetStatus,
                      reason: actionReason,
                    })
                  }
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
