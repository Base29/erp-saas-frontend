import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { platformLogin, platformDemoLogin } from '@/api/platform'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

const isDemoMode = import.meta.env.VITE_APP_ENV !== 'production'

export default function PlatformLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

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

  const handleDemoLogin = async () => {
    setServerError(null)
    setIsDemoLoading(true)
    try {
      const res = await platformDemoLogin()
      await login(res.data.token, res.data.user, true)
      navigate('/platform/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Demo login failed'
      setServerError(msg)
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Platform Login</CardTitle>
          <CardDescription>Sign in to the superadmin console</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
            {isDemoMode && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleDemoLogin}
                disabled={isDemoLoading}
              >
                {isDemoLoading ? 'Loading demo…' : 'Demo: Superadmin'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
