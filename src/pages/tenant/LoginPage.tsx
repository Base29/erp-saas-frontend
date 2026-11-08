import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { tenantLogin } from '@/api/tenant'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowRight, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function TenantLoginPage() {
  const navigate = useNavigate()
  const { login, token, isPlatform } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      navigate(isPlatform ? '/platform/dashboard' : '/dashboard')
    }
  }, [token, isPlatform, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      const res = await tenantLogin(values.email, values.password)
      await login(res.data.token, res.data.user, false)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid credentials'
      setServerError(msg)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Antigravity Volumetric Mesh Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/15 dark:bg-primary/25 blur-3xl pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/15 dark:bg-purple-500/20 blur-3xl pointer-events-none -z-10 animate-float" />

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in space-y-6">
        {/* Brand Header with Weightless Floating Title */}
        <div className="text-center space-y-2">
          <div className="animate-float inline-block">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground select-none">
              Genie <span className="bg-gradient-to-r from-primary via-indigo-500 to-purple-500 bg-clip-text text-transparent font-bold">Cloud</span>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">Modern Multi-Tenant Cloud ERP</p>
        </div>

        {/* Weightless Glass Login Card */}
        <Card className="rounded-2xl border border-white/60 dark:border-white/10 bg-card/75 dark:bg-card/60 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(99,102,241,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">Sign in</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="h-10 text-xs rounded-xl"
                  {...register('email')}
                />
                {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground/80">
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-10 text-xs rounded-xl"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-[11px] text-destructive">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 rounded-xl text-xs font-semibold shadow-subtle gap-2 transition-all active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/80">
          Protected by end-to-end tenant isolation & encryption
        </p>
      </div>
    </div>
  )
}
