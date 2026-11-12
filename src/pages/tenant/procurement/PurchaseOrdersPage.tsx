import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ExternalLink,
  Search,
} from 'lucide-react'
import { procurementApi, type PurchaseOrder } from '@/api/procurement'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ColumnDef } from '@tanstack/react-table'
import ApprovalActionModal from './components/ApprovalActionModal'

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('__all__')
  const [postingStatusFilter, setPostingStatusFilter] = useState<string>('__all__')
  const [page, setPage] = useState(1)

  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'submit' | 'approve' | 'reject' | 'post' | 'cancel'>('submit')
  const [activeOrder, setActiveOrder] = useState<PurchaseOrder | null>(null)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, per_page: 15 }
    if (search.trim()) params.search = search.trim()
    if (statusFilter && statusFilter !== '__all__') params.status = statusFilter
    if (postingStatusFilter && postingStatusFilter !== '__all__') params.posting_status = postingStatusFilter
    return params
  }, [search, statusFilter, postingStatusFilter, page])

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', queryParams],
    queryFn: () => procurementApi.getOrders(queryParams),
  })

  const orders: PurchaseOrder[] = useMemo(() => data?.data ?? [], [data])
  const pagination = useMemo(
    () =>
      data
        ? {
            page: data.current_page,
            per_page: 15,
            total: data.total,
          }
        : undefined,
    [data]
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Issued</Badge>
      case 'partially_received':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Partially Received</Badge>
      case 'fully_received':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Fully Received</Badge>
      case 'completed':
        return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Completed</Badge>
      case 'cancelled':
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Cancelled</Badge>
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  const handleOpenAction = (order: PurchaseOrder, action: 'submit' | 'approve' | 'reject' | 'post' | 'cancel') => {
    setActiveOrder(order)
    setApprovalAction(action)
    setApprovalModalOpen(true)
  }

  const handleActionConfirm = async (comments: string) => {
    if (!activeOrder) return
    const id = activeOrder.id
    if (approvalAction === 'submit') {
      await procurementApi.submitOrderForApproval(id)
    } else if (approvalAction === 'approve') {
      await procurementApi.approveOrder(id, comments)
    } else if (approvalAction === 'reject') {
      await procurementApi.rejectOrder(id, comments)
    } else if (approvalAction === 'post') {
      await procurementApi.postOrder(id)
    } else if (approvalAction === 'cancel') {
      await procurementApi.cancelOrder(id)
    }
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
  }

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      {
        accessorKey: 'po_number',
        header: 'PO #',
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/procurement/orders/${row.original.id}`)}
            className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
          >
            {row.original.po_number}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
        ),
      },
      {
        accessorKey: 'order_date',
        header: 'Order Date',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {formatDate(row.original.order_date)}
            {row.original.expected_delivery_date && (
              <div className="text-[10px] text-blue-600">Due: {formatDate(row.original.expected_delivery_date)}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => (
          <div className="text-xs font-medium text-foreground">
            {row.original.supplier?.name || 'Unknown Supplier'}
            <div className="text-[11px] text-muted-foreground font-mono">
              {row.original.supplier?.supplier_code}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Fulfillment',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'approval_status',
        header: 'Approval',
        cell: ({ row }) => {
          const status = row.original.approval_status
          return (
            <Badge
              variant="outline"
              className={
                status === 'approved'
                  ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                  : status === 'pending_approval'
                  ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                  : 'text-muted-foreground'
              }
            >
              {status.replace('_', ' ')}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'posting_status',
        header: 'Accounting',
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className={
              row.original.posting_status === 'posted'
                ? 'bg-emerald-600/10 text-emerald-700 font-mono text-[10px]'
                : 'text-muted-foreground text-[10px]'
            }
          >
            {row.original.posting_status === 'posted' ? 'POSTED' : 'UNPOSTED'}
          </Badge>
        ),
      },
      {
        accessorKey: 'total_amount',
        header: () => <div className="text-right">Total Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-bold text-foreground">
            {formatCurrency(Number(row.original.total_amount) || 0)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const po = row.original
          return (
            <div className="flex items-center justify-end gap-1.5">
              {po.approval_status === 'draft' && (
                <Button
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => handleOpenAction(po, 'submit')}
                >
                  Submit
                </Button>
              )}
              {po.approval_status === 'pending_approval' && (
                <Button
                  size="sm"
                  className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleOpenAction(po, 'approve')}
                >
                  Approve
                </Button>
              )}
              {po.approval_status === 'approved' && po.posting_status === 'unposted' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => handleOpenAction(po, 'post')}
                >
                  Post Order
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => navigate(`/procurement/orders/${po.id}`)}
              >
                View
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            Issue and manage formal purchase contracts with suppliers and track deliveries.
          </p>
        </div>

        <Button onClick={() => navigate('/procurement/orders/new')} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> New Purchase Order
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-lg border shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO# or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="partially_received">Partially Received</SelectItem>
              <SelectItem value="fully_received">Fully Received</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={postingStatusFilter}
            onValueChange={(val) => {
              setPostingStatusFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Postings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Postings</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="unposted">Unposted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Approval / Posting Modal */}
      <ApprovalActionModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        actionType={approvalAction}
        documentTitle={`Purchase Order #${activeOrder?.po_number || ''}`}
        onConfirm={handleActionConfirm}
      />
    </div>
  )
}
