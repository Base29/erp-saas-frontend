import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Plus,
  FileText,
  CreditCard,
  Edit,
  Trash2,
} from 'lucide-react'
import {
  getProject,
  getProjectFinancials,
  getProjectLedger,
  getProjectInvoices,
  updateProjectStatus,
  createProjectMilestone,
  updateProjectMilestone,
  deleteProjectMilestone,
  type ProjectMilestone,
} from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProjectFormModal from './components/ProjectFormModal'
import { formatCurrency } from '@/utils/format'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'ledger' | 'invoices'>('overview')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneAmount, setMilestoneAmount] = useState('')
  const [milestoneDueDate, setMilestoneDueDate] = useState('')
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [ledgerPage, setLedgerPage] = useState(1)

  // 1. Project Details Query
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  // 2. Financial Summary Query
  const { data: financialsData, isLoading: financialsLoading } = useQuery({
    queryKey: ['project-financials', id],
    queryFn: () => getProjectFinancials(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  // 3. Project Ledger Query
  const { data: ledgerData } = useQuery({
    queryKey: ['project-ledger', id, ledgerPage],
    queryFn: () => getProjectLedger(id!, { page: ledgerPage, per_page: 20 }).then((r) => r.data),
    enabled: !!id && activeTab === 'ledger',
  })

  // 4. Invoices Query
  const { data: invoicesData } = useQuery({
    queryKey: ['project-invoices', id],
    queryFn: () => getProjectInvoices(id!).then((r) => r.data.data),
    enabled: !!id && activeTab === 'invoices',
  })

  const project = projectData
  const financials = financialsData

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateProjectStatus(id!, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  // Add Milestone Mutation
  const addMilestoneMutation = useMutation({
    mutationFn: (data: Partial<ProjectMilestone>) => createProjectMilestone(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      setMilestoneTitle('')
      setMilestoneAmount('')
      setMilestoneDueDate('')
      setShowAddMilestone(false)
    },
  })

  // Update Milestone Status
  const updateMilestoneMutation = useMutation({
    mutationFn: ({ mId, status }: { mId: string; status: string }) =>
      updateProjectMilestone(mId, { status: status as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })

  // Delete Milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: (mId: string) => deleteProjectMilestone(mId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })

  if (projectLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading project details...</div>
  }

  if (!project) {
    return (
      <div className="p-6 py-12 text-center">
        <h2 className="text-lg font-semibold">Project Not Found</h2>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Return to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-sm font-semibold text-primary">{project.project_code}</span>
          <span className="text-xl font-bold text-foreground">{project.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={project.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            disabled={statusMutation.isPending}
            className="text-xs h-9 px-3 rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="planning">Status: Planning</option>
            <option value="active">Status: Active</option>
            <option value="on_hold">Status: On Hold</option>
            <option value="completed">Status: Completed</option>
            <option value="cancelled">Status: Cancelled</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview & Milestones
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'financials'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Financials & Profitability
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'ledger'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Project Ledger
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'invoices'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Related Invoices
        </button>
      </div>

      {/* TAB 1: OVERVIEW & MILESTONES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meta details */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-base">Project Scope & Details</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {project.description || 'No detailed scope description provided.'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Client / Customer</span>
                    <span className="font-medium text-foreground">
                      {project.customer?.name || 'Internal Project'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Linked Cost Center</span>
                    <span className="font-medium text-foreground">
                      {project.cost_center ? `${project.cost_center.code} - ${project.cost_center.name}` : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Project Manager</span>
                    <span className="font-medium text-foreground">
                      {project.manager?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Start Date</span>
                    <span className="font-medium text-foreground">
                      {project.start_date ? project.start_date.split('T')[0] : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Target End Date</span>
                    <span className="font-medium text-foreground">
                      {project.end_date ? project.end_date.split('T')[0] : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Budget Target</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(Number(project.budget_amount) || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Milestones Card */}
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-base">Milestones & Billing Stages</h3>
                    <p className="text-xs text-muted-foreground">
                      Track deliverables and billable progress phases.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddMilestone(!showAddMilestone)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Milestone
                  </Button>
                </div>

                {showAddMilestone && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!milestoneTitle.trim()) return
                      addMilestoneMutation.mutate({
                        title: milestoneTitle.trim(),
                        amount: Number(milestoneAmount) || 0,
                        due_date: milestoneDueDate || null,
                      })
                    }}
                    className="p-3.5 rounded-lg border bg-muted/40 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Milestone Title *</Label>
                        <Input
                          placeholder="e.g. Phase 1: Foundation Inspection"
                          value={milestoneTitle}
                          onChange={(e) => setMilestoneTitle(e.target.value)}
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Target Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={milestoneAmount}
                          onChange={(e) => setMilestoneAmount(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Due Date</Label>
                        <Input
                          type="date"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddMilestone(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={addMilestoneMutation.isPending}>
                        {addMilestoneMutation.isPending ? 'Saving...' : 'Save Milestone'}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="divide-y border rounded-md">
                  {(!project.milestones || project.milestones.length === 0) ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No milestones recorded yet. Add milestones to track stages.
                    </div>
                  ) : (
                    project.milestones.map((m) => (
                      <div key={m.id} className="p-3 flex items-center justify-between text-sm">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{m.title}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {m.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Due: {m.due_date.split('T')[0]}
                              </span>
                            )}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(Number(m.amount) || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={m.status}
                            onChange={(e) =>
                              updateMilestoneMutation.mutate({ mId: m.id, status: e.target.value })
                            }
                            className="text-xs h-7 px-2 rounded border bg-background"
                          >
                            <option value="pending">Pending</option>
                            <option value="invoiced">Invoiced</option>
                            <option value="completed">Completed</option>
                          </select>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => {
                              if (confirm('Delete this milestone?')) {
                                deleteMilestoneMutation.mutate(m.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick KPI Sidebar */}
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <h4 className="font-semibold text-sm">Accounting Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Invoiced</span>
                    <span className="font-semibold">
                      {formatCurrency(financials?.total_revenue ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Costs</span>
                    <span className="font-semibold text-rose-600">
                      {formatCurrency(financials?.total_costs ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-2">
                    <span className="font-medium">Net Margin</span>
                    <span
                      className={`font-bold ${
                        (financials?.gross_profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(financials?.gross_profit ?? 0)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full text-xs mt-2"
                  variant="outline"
                  onClick={() => setActiveTab('financials')}
                >
                  View Full P&L Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIALS & PROFITABILITY (P&L) */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {financialsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Calculating financials...</div>
          ) : !financials ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to calculate financial statement.</div>
          ) : (
            <>
              {/* 4 Primary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-card p-4 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Budget Target
                  </span>
                  <div className="text-xl font-bold">{formatCurrency(financials.budget_amount)}</div>
                  <span className="text-xs text-muted-foreground">
                    Target project expenditure
                  </span>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Total Invoiced Revenue
                  </span>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency(financials.total_revenue)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Sales invoices + revenue JVs
                  </span>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-rose-500" /> Total Incurred Costs
                  </span>
                  <div className="text-xl font-bold text-rose-600">
                    {formatCurrency(financials.total_costs)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Purchase bills + direct cost JVs
                  </span>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Gross Profit Margin
                  </span>
                  <div
                    className={`text-xl font-bold ${
                      financials.gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(financials.gross_profit)}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Margin: {financials.profit_margin}%
                  </span>
                </div>
              </div>

              {/* Budget Utilization Bar */}
              <div className="rounded-lg border bg-card p-5 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">Budget Consumption</span>
                  <span className="text-muted-foreground font-mono">
                    {formatCurrency(financials.total_costs)} / {formatCurrency(financials.budget_amount)} ({financials.budget_utilization}%)
                  </span>
                </div>

                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      financials.budget_utilization > 100
                        ? 'bg-rose-500'
                        : financials.budget_utilization > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(financials.budget_utilization, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Remaining Available: {formatCurrency(financials.budget_variance)}</span>
                  <span>{financials.budget_utilization > 100 ? 'Over Budget' : 'Within Budget'}</span>
                </div>
              </div>

              {/* Expense Breakdown Table */}
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-base">Cost Breakdown by Account</h3>
                {Object.keys(financials.expenses_by_account || {}).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No direct expense accounts posted to this project yet.
                  </p>
                ) : (
                  <div className="divide-y border rounded-md">
                    {Object.entries(financials.expenses_by_account).map(([accName, amount]) => (
                      <div key={accName} className="p-3 flex justify-between items-center text-sm">
                        <span className="text-foreground">{accName}</span>
                        <span className="font-semibold font-mono">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: PROJECT GENERAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-base">Project General Ledger</h3>
              <p className="text-xs text-muted-foreground">
                All posted Journal Voucher debit and credit entries attributed to this project.
              </p>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Line Narration</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(!ledgerData?.data || ledgerData.data.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                      No journal voucher lines posted for this project yet.
                    </td>
                  </tr>
                ) : (
                  ledgerData.data.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                        {row.journal_voucher?.voucher_date?.split('T')[0] || '-'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary">
                        {row.journal_voucher?.voucher_number || '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{row.account?.account_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{row.account?.account_code}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {row.line_narration || row.journal_voucher?.narration || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                        {Number(row.debit_amount) > 0 ? formatCurrency(Number(row.debit_amount)) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                        {Number(row.credit_amount) > 0 ? formatCurrency(Number(row.credit_amount)) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {ledgerData && ledgerData.last_page > 1 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
              <span>Page {ledgerData.current_page} of {ledgerData.last_page}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={ledgerPage >= ledgerData.last_page}
                  onClick={() => setLedgerPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RELATED INVOICES */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Invoices */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Customer Sales Invoices
            </h3>
            <div className="divide-y border rounded-md">
              {(!invoicesData?.sale_invoices || invoicesData.sale_invoices.length === 0) ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No sales invoices linked to this project yet.
                </div>
              ) : (
                invoicesData.sale_invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-mono font-medium text-primary">{inv.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {inv.customer?.name} • {inv.invoice_date?.split('T')[0]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold font-mono">{formatCurrency(Number(inv.total_amount))}</div>
                      <Badge variant="outline" className="text-xs">{inv.posting_status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Purchase Invoices */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-500" />
              Vendor Purchase Bills
            </h3>
            <div className="divide-y border rounded-md">
              {(!invoicesData?.purchase_invoices || invoicesData.purchase_invoices.length === 0) ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No purchase invoices linked to this project yet.
                </div>
              ) : (
                invoicesData.purchase_invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-mono font-medium text-primary">{inv.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {inv.supplier?.name} • {inv.invoice_date?.split('T')[0]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold font-mono text-rose-600">{formatCurrency(Number(inv.total_amount))}</div>
                      <Badge variant="outline" className="text-xs">{inv.posting_status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      <ProjectFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        project={project}
      />
    </div>
  )
}
