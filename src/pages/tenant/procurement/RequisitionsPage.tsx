import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ExternalLink,
  Search,
} from 'lucide-react'
import { procurementApi, type PurchaseRequisition } from '@/api/procurement'
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
import RequisitionModal from './components/RequisitionModal'
import ApprovalActionModal from './components/ApprovalActionModal'

export default function RequisitionsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<PurchaseRequisition | null>(null)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'submit' | 'approve' | 'reject' | 'cancel'>('submit')
  const [activeReqForAction, setActiveReqForAction] = useState<PurchaseRequisition | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('__all__')
  const [priorityFilter, setPriorityFilter] = useState<string>('__all__')
  const [page, setPage] = useState(1)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, per_page: 15 }
    if (search.trim()) params.search = search.trim()
    if (statusFilter && statusFilter !== '__all__') params.status = statusFilter
    if (priorityFilter && priorityFilter !== '__all__') params.priority = priorityFilter
    return params
  }, [search, statusFilter, priorityFilter, page])

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-requisitions', queryParams],
    queryFn: () => procurementApi.getRequisitions(queryParams),
  })

  const requisitions: PurchaseRequisition[] = useMemo(() => data?.data ?? [], [data])
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Urgent</Badge>
      case 'high':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">High</Badge>
      case 'medium':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Medium</Badge>
      case 'low':
        return <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30">Low</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'fully_ordered':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Approved / Ordered</Badge>
      case 'partially_ordered':
        return <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30">Partially Ordered</Badge>
      case 'submitted':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Submitted</Badge>
      case 'rejected':
      case 'cancelled':
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">{status}</Badge>
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  const handleOpenAction = (req: PurchaseRequisition, action: 'submit' | 'approve' | 'reject' | 'cancel') => {
    setActiveReqForAction(req)
    setApprovalAction(action)
    setApprovalModalOpen(true)
  }

  const handleActionConfirm = async (comments: string) => {
    if (!activeReqForAction) return
    const id = activeReqForAction.id
    if (approvalAction === 'submit') {
      await procurementApi.submitRequisitionForApproval(id)
    } else if (approvalAction === 'approve') {
      await procurementApi.approveRequisition(id, comments)
    } else if (approvalAction === 'reject') {
      await procurementApi.rejectRequisition(id, comments)
    } else if (approvalAction === 'cancel') {
      await procurementApi.cancelRequisition(id)
    }
    qc.invalidateQueries({ queryKey: ['purchase-requisitions'] })
  }

  const columns = useMemo<ColumnDef<PurchaseRequisition>[]>(
    () => [
      {
        accessorKey: 'requisition_number',
        header: 'Requisition #',
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/procurement/requisitions/${row.original.id}`)}
            className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
          >
            {row.original.requisition_number}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
        ),
      },
      {
        accessorKey: 'requisition_date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {formatDate(row.original.requisition_date)}
            {row.original.required_by_date && (
              <div className="text-[10px] text-amber-600">Need by: {formatDate(row.original.required_by_date)}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'purpose',
        header: 'Purpose / Details',
        cell: ({ row }) => (
          <div className="max-w-[280px] truncate text-xs font-medium text-foreground">
            {row.original.purpose || 'Material Request'}
            <div className="text-[11px] text-muted-foreground font-normal">
              By: {row.original.requester?.name || 'User'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => getPriorityBadge(row.original.priority),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'total_estimated_amount',
        header: () => <div className="text-right">Est. Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-medium text-foreground">
            {formatCurrency(Number(row.original.total_estimated_amount) || 0)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const req = row.original
          return (
            <div className="flex items-center justify-end gap-1.5">
              {req.approval_status === 'draft' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      setSelectedReq(req)
                      setModalOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => handleOpenAction(req, 'submit')}
                  >
                    Submit
                  </Button>
                </>
              )}
              {req.approval_status === 'pending_approval' && (
                <Button
                  size="sm"
                  className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleOpenAction(req, 'approve')}
                >
                  Approve
                </Button>
              )}
              {req.approval_status === 'approved' && req.status !== 'fully_ordered' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs px-2 text-primary"
                  onClick={() => navigate(`/procurement/orders/new?requisition_id=${req.id}`)}
                >
                  Create PO
                </Button>
              )}
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Manage internal material and service requests before purchasing.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedReq(null)
            setModalOpen(true)
          }}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Requisition
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-lg border shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PR# or purpose..."
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
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="partially_ordered">Partially Ordered</SelectItem>
              <SelectItem value="fully_ordered">Fully Ordered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={priorityFilter}
            onValueChange={(val) => {
              setPriorityFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={requisitions}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Modal */}
      <RequisitionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['purchase-requisitions'] })}
        requisition={selectedReq}
      />

      {/* Approval Modal */}
      <ApprovalActionModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        actionType={approvalAction}
        documentTitle={`Requisition #${activeReqForAction?.requisition_number || ''}`}
        onConfirm={handleActionConfirm}
      />
    </div>
  )
}
