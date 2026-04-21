import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createTenant } from '@/api/platform'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const schema = z.object({
  name: z.string().min(1, 'Company Name is required'),
  subdomain: z
    .string()
    .min(1, 'Subdomain is required')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  plan_name: z.string().optional(),
  admin_name: z.string().min(1, 'Admin Name is required'),
  admin_email: z.string().email('Invalid email address'),
  admin_password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

interface CreateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateTenantDialog({ open, onOpenChange, onSuccess }: CreateTenantDialogProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] })
      onOpenChange(false)
      reset()
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create tenant'
      setServerError(msg)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    setServerError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" {...register('name')} placeholder="Acme Corp" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input id="subdomain" {...register('subdomain')} placeholder="acme" />
              {errors.subdomain && (
                <p className="text-xs text-destructive">{errors.subdomain.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan_name">Subscription Plan (optional)</Label>
            <Input id="plan_name" {...register('plan_name')} placeholder="standard" />
          </div>

          <div className="border-t border-zinc-100 pt-4 mt-2">
            <h3 className="text-sm font-semibold mb-3">Admin Credentials</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Full Name</Label>
                <Input id="admin_name" {...register('admin_name')} placeholder="John Doe" />
                {errors.admin_name && (
                  <p className="text-xs text-destructive">{errors.admin_name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_email">Email address</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    {...register('admin_email')}
                    placeholder="admin@acme.com"
                  />
                  {errors.admin_email && (
                    <p className="text-xs text-destructive">{errors.admin_email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_password">Password</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    {...register('admin_password')}
                    placeholder="••••••••"
                  />
                  {errors.admin_password && (
                    <p className="text-xs text-destructive">{errors.admin_password.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive font-medium">{serverError}</p>}
          
          <DialogFooter className="pt-4 mt-2 border-t border-zinc-100">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending} className="min-w-[100px]">
              {mutation.isPending ? 'Provisioning...' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
