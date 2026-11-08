import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { platformLogin } from '@/api/platform'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function PlatformLoginPage() {
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
      const res = await platformLogin(values.email, values.password)
      await login(res.data.token, res.data.user, true)
      navigate('/platform/dashboard')
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
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-500/15 dark:bg-blue-500/20 blur-3xl pointer-events-none -z-10 animate-float" />

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-primary-foreground shadow-glow-primary mb-1 animate-float">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform <span className="text-primary font-medium text-lg">Admin</span>
          </h1>
          <p className="text-xs text-muted-foreground">Genie Cloud Multi-Tenant System Console</p>
        </div>

        <Card className="rounded-2xl border border-white/60 dark:border-white/10 bg-card/75 dark:bg-card/60 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(99,102,241,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">Superadmin Sign in</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sign in to manage tenants, modules, and platform health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground/80">
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@platform.com"
                  className="h-10 text-xs rounded-xl"
                  {...register('email')}
                />
                {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-foreground/80">
                  Password
                </Label>
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
                    <span>Verifying…</span>
                  </>
                ) : (
                  <>
                    <span>Enter Platform Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
