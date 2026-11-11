import apiClient from './client'

export interface Project {
  id: string
  company_id: string
  project_code: string
  name: string
  description: string | null
  customer_id: string | null
  cost_center_id: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  budget_amount: string | number
  manager_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  customer?: { id: string; name: string } | null
  cost_center?: { id: string; code: string; name: string } | null
  manager?: { id: string; name: string; email: string } | null
  milestones_count?: number
  milestones?: ProjectMilestone[]
}

export interface ProjectMilestone {
  id: string
  project_id: string
  title: string
  due_date: string | null
  amount: string | number
  status: 'pending' | 'invoiced' | 'completed'
  sale_invoice_id: string | null
  created_at?: string
  sale_invoice?: { id: string; invoice_number: string; total_amount: string | number } | null
}

export interface ProjectFinancials {
  project_id: string
  project_code: string
  project_name: string
  budget_amount: number
  total_revenue: number
  invoiced_sales: number
  total_costs: number
  purchase_bills: number
  manual_expenses: number
  gross_profit: number
  profit_margin: number
  budget_variance: number
  budget_utilization: number
  expenses_by_account: Record<string, number>
  milestones: {
    total_count: number
    invoiced_count: number
    total_value: number
    invoiced_value: number
  }
}

export interface ProjectLedgerLine {
  id: string
  journal_voucher_id: string
  account_id: string
  debit_amount: string | number
  credit_amount: string | number
  line_narration: string | null
  account?: { id: string; account_code: string; account_name: string }
  journal_voucher?: { id: string; voucher_number: string; voucher_date: string; narration: string | null }
}

export const getProjects = (params?: { status?: string; customer_id?: string; search?: string; page?: number; per_page?: number }) =>
  apiClient.get<{ data: Project[]; current_page: number; last_page: number; total: number }>('/v1/projects', { params })

export const getProject = (id: string) =>
  apiClient.get<{ data: Project }>(`/v1/projects/${id}`)

export const createProject = (data: Partial<Project> & { auto_create_cost_center?: boolean }) =>
  apiClient.post<{ message: string; data: Project }>('/v1/projects', data)

export const updateProject = (id: string, data: Partial<Project>) =>
  apiClient.patch<{ message: string; data: Project }>(`/v1/projects/${id}`, data)

export const updateProjectStatus = (id: string, status: string) =>
  apiClient.patch<{ message: string; data: Project }>(`/v1/projects/${id}/status`, { status })

export const deleteProject = (id: string) =>
  apiClient.delete<{ message: string }>(`/v1/projects/${id}`)

export const getProjectMilestones = (projectId: string) =>
  apiClient.get<{ data: ProjectMilestone[] }>(`/v1/projects/${projectId}/milestones`)

export const createProjectMilestone = (projectId: string, data: Partial<ProjectMilestone>) =>
  apiClient.post<{ message: string; data: ProjectMilestone }>(`/v1/projects/${projectId}/milestones`, data)

export const updateProjectMilestone = (milestoneId: string, data: Partial<ProjectMilestone>) =>
  apiClient.patch<{ message: string; data: ProjectMilestone }>(`/v1/projects/milestones/${milestoneId}`, data)

export const deleteProjectMilestone = (milestoneId: string) =>
  apiClient.delete<{ message: string }>(`/v1/projects/milestones/${milestoneId}`)

export const getProjectFinancials = (id: string) =>
  apiClient.get<{ data: ProjectFinancials }>(`/v1/projects/${id}/financials`)

export const getProjectLedger = (id: string, params?: { page?: number; per_page?: number }) =>
  apiClient.get<{ data: ProjectLedgerLine[]; current_page: number; last_page: number; total: number }>(`/v1/projects/${id}/ledger`, { params })

export const getProjectInvoices = (id: string) =>
  apiClient.get<{ data: { sale_invoices: any[]; purchase_invoices: any[] } }>(`/v1/projects/${id}/invoices`)
