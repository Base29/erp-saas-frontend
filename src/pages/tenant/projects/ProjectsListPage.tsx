import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { getProjects, deleteProject, type Project } from '@/api/projects'
import DataTable from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ProjectFormModal from './components/ProjectFormModal'
import { formatCurrency } from '@/utils/format'
import type { ColumnDef } from '@tanstack/react-table'

export default function ProjectsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, per_page: 15 }
    if (search.trim()) params.search = search.trim()
    if (statusFilter && statusFilter !== '__all__') params.status = statusFilter
    return params
  }, [search, statusFilter, page])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['projects', queryParams],
    queryFn: () => getProjects(queryParams).then((r) => r.data),
  })

  const projects = useMemo(() => data?.data ?? [], [data])
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to delete project.')
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Active</Badge>
      case 'planning':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Planning</Badge>
      case 'completed':
        return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Completed</Badge>
      case 'on_hold':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">On Hold</Badge>
      case 'cancelled':
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: 'project_code',
        header: 'Project Code',
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/projects/${row.original.id}`)}
            className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
          >
            {row.original.project_code}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Project Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-foreground">{row.original.name}</div>
            {row.original.cost_center && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" /> Cost Center: {row.original.cost_center.code}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'customer',
        header: 'Client / Customer',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.customer?.name || <span className="text-muted-foreground italic">Internal Project</span>}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'budget_amount',
        header: 'Budget Target',
        cell: ({ row }) => (
          <div className="font-medium">
            {formatCurrency(Number(row.original.budget_amount) || 0)}
          </div>
        ),
      },
      {
        accessorKey: 'milestones_count',
        header: 'Milestones',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.milestones_count ?? row.original.milestones?.length ?? 0} Milestones
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedProject(row.original)
                setModalOpen(true)
              }}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Are you sure you want to delete project ${row.original.project_code}?`)) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate, deleteMutation]
  )

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage projects, milestone billings, budgets, and accounting operations.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSelectedProject(null)
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load projects: {(error as any)?.message || 'Unknown network error.'}</span>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        filterKey="search"
        filterPlaceholder="Search by code, name, description…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        hasActiveFilters={Boolean(search || (statusFilter && statusFilter !== '__all__'))}
        onClearFilters={() => {
          setSearch('')
          setStatusFilter('')
          setPage(1)
        }}
        toolbarExtra={
          <div className="w-36">
            <Select
              value={statusFilter || '__all__'}
              onValueChange={(val) => {
                setStatusFilter(val === '__all__' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Create / Edit Modal */}
      <ProjectFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        project={selectedProject}
      />
    </div>
  )
}
