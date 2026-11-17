import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Loader2,
  Building
} from 'lucide-react'
import { fetchPublicInvitation, acceptPublicInvitation } from '@/api/tenant'
import { useAuthStore, type AuthUser } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ROLE_LABELS } from '@/utils/permissions'
import type { UserRole } from '@/store/authStore'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [hasInitializedName, setHasInitializedName] = useState(false)

  // Fetch invitation details
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['public-invitation', token],
    queryFn: () => fetchPublicInvitation(token).then((r) => r.data.data),
    enabled: Boolean(token),
    retry: false,
  })

  // Pre-fill name when data is loaded
  if (inviteData?.name && !hasInitializedName) {
    setName(inviteData.name)
    setHasInitializedName(true)
  }

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: () =>
      acceptPublicInvitation(token, {
        name: name.trim(),
        password,
        password_confirmation: passwordConfirmation,
      }),
    onSuccess: async (res) => {
      toast.success('Account created successfully! Welcome to Genie Cloud.')
      await login(res.data.token, res.data.user as unknown as AuthUser)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create account. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter your full name.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match.')
      return
    }

    acceptMutation.mutate()
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl text-center space-y-4">
          <div className="p-3 bg-destructive/10 text-destructive rounded-full w-fit mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Missing Invitation Token</h2>
          <p className="text-sm text-muted-foreground">
            No valid invitation token was provided in the link. Please check the URL sent to you by your administrator.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validating invitation link...</p>
        </div>
      </div>
    )
  }

  if (error || !inviteData) {
    const errorMsg =
      (error as any)?.response?.data?.message ||
      'This invitation link has expired or has already been used to create an account.'

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl text-center space-y-4 shadow-lg">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full w-fit mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Invitation Not Available</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <div className="pt-2">
            <Button asChild className="w-full">
              <Link to="/login">Proceed to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const roleLabel = ROLE_LABELS[inviteData.role as UserRole] || inviteData.role

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background/95 to-muted/30">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2 shadow-sm">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to Genie Cloud</h1>
          <p className="text-sm text-muted-foreground">Complete your account registration</p>
        </div>

        {/* Invitation Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-2xl shadow-xl space-y-6">
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Assigned Role
              </span>
              <p className="text-sm font-bold text-foreground">{roleLabel}</p>
            </div>
            {inviteData.company && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Building className="h-3 w-3" />
                {inviteData.company.name}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address (Exact Invited Email - Read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Invited Email Address (Fixed)
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  value={inviteData.email}
                  disabled
                  className="bg-muted/50 cursor-not-allowed font-medium text-foreground text-sm opacity-90 pr-9"
                />
                <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/60" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your account will be permanently registered to this email.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Your Full Name
              </Label>
              <Input
                placeholder="e.g. Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Create Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Confirmation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Confirm Password
              </Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-type your password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                minLength={8}
                className="text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={acceptMutation.isPending}
              className="w-full mt-2 gap-2 font-semibold shadow-md"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Access ERP
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
