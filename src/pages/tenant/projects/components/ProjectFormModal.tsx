import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createProject, updateProject, type Project } from '@/api/projects'
import { fetchCostCenters, fetchCustomers } from '@/api/tenant'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, 'Project name is required'),
  project_code: z.string().optional(),
  customer_id: z.string().optional().nullable(),
  cost_center_id: z.string().optional().nullable(),
  auto_create_cost_center: z.boolean().default(true),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget_amount: z.coerce.number().min(0, 'Budget must be positive').default(0),
  description: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

interface ProjectFormModalProps {
  project?: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProjectFormModal({ project, open, onOpenChange }: ProjectFormModalProps) {
  const qc = useQueryClient()
  const isEdit = !!project

  const { data: customersData } = useQuery({
    queryKey: ['customers-list-projects'],
    queryFn: () => fetchCustomers({ per_page: 200 }).then((r) => r.data),
    enabled: open,
  })

  const { data: costCentersData } = useQuery({
    queryKey: ['cost-centers-list-projects'],
    queryFn: () => fetchCostCenters({ per_page: 200 }).then((r) => r.data),
    enabled: open,
  })

  const customers = customersData?.data ?? []
  const costCenters = costCentersData?.data ?? []

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'planning',
      auto_create_cost_center: true,
      budget_amount: 0,
    },
  })

  const autoCreateCC = watch('auto_create_cost_center')

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        project_code: project.project_code,
        customer_id: project.customer_id ?? '',
        cost_center_id: project.cost_center_id ?? '',
        auto_create_cost_center: false,
        status: project.status,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        end_date: project.end_date ? project.end_date.split('T')[0] : '',
        budget_amount: Number(project.budget_amount) || 0,
        description: project.description ?? '',
      })
    } else {
      reset({
        name: '',
        project_code: '',
        customer_id: '',
        cost_center_id: '',
        auto_create_cost_center: true,
        status: 'planning',
        start_date: '',
        end_date: '',
        budget_amount: 0,
        description: '',
      })
    }
  }, [project, reset, open])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: any = {
        ...values,
        customer_id: values.customer_id || null,
        cost_center_id: values.cost_center_id || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        description: values.description || null,
      }
      if (isEdit && project) {
        return updateProject(project.id, payload)
      }
      return createProject(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      onOpenChange(false)
    },
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" placeholder="e.g. Modern Logistics Warehouse" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project_code">Project Code</Label>
              <Input
                id="project_code"
                placeholder={isEdit ? '' : 'Auto-generated (e.g. PRJ-00001)'}
                disabled={isEdit}
                {...register('project_code')}
              />
              <p className="text-xs text-muted-foreground">Leave blank to auto-generate sequence.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                {...register('status')}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer_id">Client / Customer (Optional)</Label>
              <select
                id="customer_id"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                {...register('customer_id')}
              >
                <option value="">Internal Project (No Client)</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget_amount">Budget Target (PKR / Base Currency)</Label>
              <Input
                id="budget_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('budget_amount')}
              />
              {errors.budget_amount && <p className="text-xs text-destructive">{errors.budget_amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end_date">Target End Date</Label>
              <Input id="end_date" type="date" {...register('end_date')} />
            </div>

            {!isEdit && (
              <div className="sm:col-span-2 rounded-lg border p-3 bg-muted/30">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    {...register('auto_create_cost_center')}
                  />
                  <div>
                    <span className="text-sm font-medium">Auto-create linked Cost Center in Accounts</span>
                    <p className="text-xs text-muted-foreground">
                      Creates a dedicated Cost Center in the Chart of Accounts for backwards compatibility with general ledger reports.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {!autoCreateCC && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cost_center_id">Link Existing Cost Center</Label>
                <select
                  id="cost_center_id"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  {...register('cost_center_id')}
                >
                  <option value="">None</option>
                  {costCenters.map((cc: any) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description & Scope</Label>
              <textarea
                id="description"
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                placeholder="Brief summary of project objectives, scope, or client contract..."
                {...register('description')}
              />
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as any)?.response?.data?.message || 'Failed to save project.'}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
