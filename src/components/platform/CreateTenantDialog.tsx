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
import { Building2, Shield, User, Globe, Loader2 } from 'lucide-react'

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
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/80 bg-card/95 backdrop-blur-2xl shadow-elevated">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">Create New Tenant</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Provision an isolated ERP instance and tenant database.</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-3" noValidate>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">Company Name</Label>
                <Input id="name" {...register('name')} placeholder="Acme Corp" className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70" />
                {errors.name && <p className="text-[11px] text-destructive font-medium">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subdomain" className="text-xs font-semibold flex items-center gap-1">
                  <Globe className="h-3 w-3 text-muted-foreground" /> Subdomain
                </Label>
                <Input id="subdomain" {...register('subdomain')} placeholder="acme" className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70" />
                {errors.subdomain && (
                  <p className="text-[11px] text-destructive font-medium">{errors.subdomain.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan_name" className="text-xs font-semibold">Subscription Plan (optional)</Label>
              <Input id="plan_name" {...register('plan_name')} placeholder="standard" className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70" />
            </div>
          </div>

          <div className="border-t border-border/50 pt-3.5">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-foreground/90 uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Admin Credentials</span>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="admin_name" className="text-xs font-semibold flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" /> Full Name
                </Label>
                <Input id="admin_name" {...register('admin_name')} placeholder="John Doe" className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70" />
                {errors.admin_name && (
                  <p className="text-[11px] text-destructive font-medium">{errors.admin_name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="admin_email" className="text-xs font-semibold">Email address</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    {...register('admin_email')}
                    placeholder="admin@acme.com"
                    className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70"
                  />
                  {errors.admin_email && (
                    <p className="text-[11px] text-destructive font-medium">{errors.admin_email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin_password" className="text-xs font-semibold">Password</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    {...register('admin_password')}
                    placeholder="••••••••"
                    className="rounded-xl h-9.5 text-xs bg-background/50 border-border/70"
                  />
                  {errors.admin_password && (
                    <p className="text-[11px] text-destructive font-medium">{errors.admin_password.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {serverError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
              {serverError}
            </div>
          )}
          
          <DialogFooter className="pt-3.5 border-t border-border/50 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="min-w-[120px] rounded-xl text-xs h-9 shadow-glow-primary active:scale-[0.97]"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Provisioning...
                </span>
              ) : (
                'Create Tenant'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
