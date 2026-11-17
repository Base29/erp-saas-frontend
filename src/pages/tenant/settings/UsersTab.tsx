import { useState } from 'react'
import { 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Pencil, 
  UserX, 
  Mail, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  Users,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react'
import SettingsHeaderActions from './SettingsHeaderActions'
import UserPermissionsModal from './UserPermissionsModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  fetchUsers, 
  createUser,
  updateUser, 
  deactivateUser, 
  type TenantUser,
  fetchInvitations,
  createInvitation,
  resendInvitation,
  deleteInvitation,
  resetUserPassword,
  type UserInvitation,
  fetchRoles,
  fetchCompanies
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { ROLE_LABELS } from '@/utils/permissions'
import type { UserRole } from '@/store/authStore'
import { toast } from 'sonner'

const DEFAULT_ASSIGNABLE_ROLES: { name: string; display_name: string }[] = [
  { name: 'accountant', display_name: 'Accountant' },
  { name: 'sales_manager', display_name: 'Sales Manager' },
  { name: 'sales_person', display_name: 'Sales Person' },
  { name: 'inventory_manager', display_name: 'Inventory Manager' },
  { name: 'viewer', display_name: 'Viewer' },
]

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
  role: z.string().min(1, 'Please select a role'),
  company_id: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().min(1, 'Please select a role'),
  company_id: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
})

type InviteValues = z.infer<typeof inviteSchema>
type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

function generateSecurePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?'
  let res = ''
  for (let i = 0; i < 16; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return res
}

export default function UsersTab() {
  const queryClient = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'invitations'>('users')

  // Modals state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createShowPassword, setCreateShowPassword] = useState(false)

  const [editUser, setEditUser] = useState<TenantUser | null>(null)
  const [permUser, setPermUser] = useState<TenantUser | null>(null)
  const [resetUser, setResetUser] = useState<TenantUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Filters and pagination for Users
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [status, setStatus] = useState('')

  // Pagination for Invitations
  const [invitePage, setInvitePage] = useState(1)

  // Fetch roles & companies
  const { data: rolesData } = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: () => fetchRoles().then((r) => r.data.data),
  })

  const { data: companiesData } = useQuery({
    queryKey: ['tenant-companies'],
    queryFn: () => fetchCompanies().then((r) => r.data.data),
  })

  const rolesList = (rolesData && rolesData.length > 0)
    ? rolesData.filter((r) => r.name !== 'tenant_admin').map((r) => ({ name: r.name, display_name: r.display_name }))
    : DEFAULT_ASSIGNABLE_ROLES

  const companiesList = companiesData ?? []

  // Fetch Users
  const queryParams: Record<string, string | number | boolean> = { page }
  if (search.trim()) queryParams.search = search.trim()
  if (filterRole && filterRole !== '__all__') queryParams.role = filterRole
  if (status && status !== '__all__') queryParams.is_active = status === 'active'

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['tenant-users', queryParams],
    queryFn: () => fetchUsers(queryParams).then((r) => r.data),
  })

  // Fetch Invitations
  const { data: invitesData, isLoading: isInvitesLoading } = useQuery({
    queryKey: ['tenant-invitations', invitePage],
    queryFn: () => fetchInvitations({ page: invitePage }).then((r) => r.data),
  })

  const users = usersData?.data ?? []
  const invitations = invitesData?.data ?? []
  const pendingCount = invitations.filter((inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date()).length

  // Forms
  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', name: '', role: 'viewer', company_id: '' },
  })

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'viewer', company_id: '' },
  })

  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: (v: InviteValues) =>
      createInvitation({
        email: v.email,
        name: v.name?.trim() ? v.name.trim() : undefined,
        role: v.role,
        company_id: v.company_id && v.company_id !== '__tenant__' ? v.company_id : null,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-invitations'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      const fullInviteUrl = res.data.invite_url.startsWith('http')
        ? res.data.invite_url
        : `${window.location.origin}${res.data.invite_url}`
      setInviteResult({ url: fullInviteUrl, email: res.data.data.email })
      toast.success(res.data.message || 'Invitation created successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create invitation.')
    },
  })

  const createMutation = useMutation({
    mutationFn: (v: CreateValues) =>
      createUser({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        role: v.role,
        company_id: v.company_id && v.company_id !== '__tenant__' ? v.company_id : null,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      setCreateOpen(false)
      toast.success(`User ${res.data.data.name} created successfully!`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create user.')
    },
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-invitations'] })
      const fullInviteUrl = res.data.invite_url.startsWith('http')
        ? res.data.invite_url
        : `${window.location.origin}${res.data.invite_url}`
      navigator.clipboard.writeText(fullInviteUrl)
      toast.success('Invitation resent! Link copied to clipboard.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to resend invitation.')
    },
  })

  const deleteInviteMutation = useMutation({
    mutationFn: (id: string) => deleteInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-invitations'] })
      toast.success('Invitation revoked.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to revoke invitation.')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetUserPassword(userId, password),
    onSuccess: () => {
      setResetUser(null)
      setNewPassword('')
      toast.success('Password reset successfully. Active user sessions have been invalidated.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reset password.')
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TenantUser> }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      setEditUser(null)
      toast.success('User updated successfully.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update user.')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      toast.success('User status updated.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status.')
    },
  })

  const openInviteModal = () => {
    inviteForm.reset({ email: '', name: '', role: 'viewer', company_id: '' })
    setInviteResult(null)
    setCopiedLink(false)
    setInviteOpen(true)
  }

  const openCreateModal = () => {
    createForm.reset({
      name: '',
      email: '',
      password: generateSecurePassword(),
      role: 'viewer',
      company_id: '',
    })
    setCreateShowPassword(true)
    setCreateOpen(true)
  }

  const openEditModal = (u: TenantUser) => {
    editForm.reset({ name: u.name, role: u.role })
    setEditUser(u)
  }

  const openResetPasswordModal = (u: TenantUser) => {
    setResetUser(u)
    setNewPassword(generateSecurePassword())
    setShowPassword(true)
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Invite link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Users Columns
  const userColumns: ColumnDef<TenantUser>[] = [
    { 
      accessorKey: 'name', 
      header: 'Name', 
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      )
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role
        const isMaster = role === 'tenant_admin'
        return (
          <Badge variant={isMaster ? 'default' : 'outline'} className={isMaster ? 'bg-primary text-primary-foreground' : ''}>
            {ROLE_LABELS[role as UserRole] ?? role}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return <span className="text-xs text-muted-foreground">{isNaN(date.getTime()) ? '—' : date.toLocaleDateString()}</span>
      }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end items-center">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-normal"
            onClick={() => setPermUser(row.original)}
            title="Manage Permissions & Overrides"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Permissions
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-normal"
            onClick={() => openResetPasswordModal(row.original)}
            title="Reset Password"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
            Reset Password
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={() => openEditModal(row.original)}
            title="Edit User"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {row.original.is_active && row.original.role !== 'tenant_admin' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => deactivateMutation.mutate(row.original.id)}
              disabled={deactivateMutation.isPending}
              title="Deactivate User"
            >
              <UserX className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  // Invitations Columns
  const invitationColumns: ColumnDef<UserInvitation>[] = [
    {
      accessorKey: 'email',
      header: 'Invited User',
      cell: ({ row }) => {
        const inv = row.original
        return (
          <div>
            <div className="font-medium text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {inv.email}
            </div>
            {inv.name && <div className="text-xs text-muted-foreground">{inv.name}</div>}
          </div>
        )
      }
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">
          {ROLE_LABELS[row.original.role as UserRole] ?? row.original.role}
        </Badge>
      )
    },
    {
      accessorKey: 'company',
      header: 'Scope',
      cell: ({ row }) => {
        const comp = row.original.company
        return (
          <span className="text-xs text-muted-foreground">
            {comp ? comp.name : 'Tenant-Wide'}
          </span>
        )
      }
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      cell: ({ row }) => {
        const exp = new Date(row.original.expires_at)
        const isExpired = exp < new Date()
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className={`h-3 w-3 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {isExpired ? 'Expired' : exp.toLocaleDateString()}
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const inv = row.original
        if (inv.accepted_at) {
          return <Badge variant="success">Accepted</Badge>
        }
        const isExpired = new Date(inv.expires_at) < new Date()
        if (isExpired) {
          return <Badge variant="destructive">Expired</Badge>
        }
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const inv = row.original
        const fullUrl = inv.invite_url?.startsWith('http') 
          ? inv.invite_url 
          : `${window.location.origin}/accept-invite?token=${inv.token}`

        if (inv.accepted_at) {
          return <span className="text-xs text-muted-foreground">Registered</span>
        }

        return (
          <div className="flex gap-1 justify-end items-center">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => handleCopyLink(fullUrl)}
              title="Copy Invitation Link"
            >
              <Copy className="h-3 w-3 text-primary" />
              Copy Link
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => resendMutation.mutate(inv.id)}
              disabled={resendMutation.isPending}
              title="Refresh and resend invitation"
            >
              <RefreshCw className={`h-3 w-3 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
              Resend
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => deleteInviteMutation.mutate(inv.id)}
              disabled={deleteInviteMutation.isPending}
              title="Revoke invitation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <SettingsHeaderActions>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openInviteModal} className="gap-2">
            <Mail className="h-4 w-4" /> Invite User
          </Button>
          <Button size="sm" onClick={openCreateModal} className="gap-2">
            <UserPlus className="h-4 w-4" /> Create User
          </Button>
        </div>
      </SettingsHeaderActions>

      {/* Subtab Switcher */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'users'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Users className="h-4 w-4" />
            Active Users
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSubTab === 'users' ? 'bg-primary-foreground/20 text-white' : 'bg-muted text-muted-foreground'}`}>
              {usersData?.total ?? users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('invitations')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'invitations'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Mail className="h-4 w-4" />
            Pending Invitations
            {pendingCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeSubTab === 'invitations' ? 'bg-amber-400 text-black' : 'bg-amber-500/20 text-amber-600'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'users' ? (
        <DataTable
          columns={userColumns}
          data={users}
          isLoading={isUsersLoading}
          pagination={usersData ? { page, per_page: usersData.per_page, total: usersData.total } : undefined}
          onPageChange={setPage}
          filterKey="search"
          filterPlaceholder="Search users by name or email…"
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val)
            setPage(1)
          }}
          hasActiveFilters={Boolean(search || (filterRole && filterRole !== '__all__') || (status && status !== '__all__'))}
          onClearFilters={() => {
            setSearch('')
            setFilterRole('')
            setStatus('')
            setPage(1)
          }}
          toolbarExtra={
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={filterRole || '__all__'}
                onValueChange={(val) => {
                  setFilterRole(val === '__all__' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Roles</SelectItem>
                  {rolesList.map((r) => (
                    <SelectItem key={r.name} value={r.name}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={status || '__all__'}
                onValueChange={(val) => {
                  setStatus(val === '__all__' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-32 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">User Invitations</h4>
              <p className="text-xs text-muted-foreground">
                Users invited via email receive a single-use onboarding link. Once accepted, their account is provisioned with their exact email address and selected role.
              </p>
            </div>
            <Button size="sm" onClick={openInviteModal} className="gap-2 shrink-0">
              <UserPlus className="h-3.5 w-3.5" /> Invite New User
            </Button>
          </div>

          <DataTable
            columns={invitationColumns}
            data={invitations}
            isLoading={isInvitesLoading}
            pagination={invitesData ? { page: invitePage, per_page: invitesData.per_page, total: invitesData.total } : undefined}
            onPageChange={setInvitePage}
          />
        </div>
      )}

      {/* ── Direct Create User Dialog ───────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Create Tenant User
            </DialogTitle>
            <DialogDescription>
              Directly create a new user account with login credentials and assigned roles.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="create-name"
                placeholder="e.g. Jane Doe"
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-email">Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="create-email"
                type="email"
                placeholder="colleague@company.com"
                {...createForm.register('email')}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="create-password">Initial Password <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary gap-1"
                  onClick={() => createForm.setValue('password', generateSecurePassword())}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Strong Password
                </Button>
              </div>

              <div className="relative">
                <Input
                  id="create-password"
                  type={createShowPassword ? 'text' : 'password'}
                  {...createForm.register('password')}
                  className="pr-10 font-mono text-sm"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setCreateShowPassword(!createShowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {createShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select 
                  value={createForm.watch('role')} 
                  onValueChange={(val) => createForm.setValue('role', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesList.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        {r.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Company Scope</Label>
                <Select 
                  value={createForm.watch('company_id') || '__tenant__'} 
                  onValueChange={(val) => createForm.setValue('company_id', val === '__tenant__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tenant-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__tenant__">Tenant-Wide (All)</SelectItem>
                    {companiesList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Invite User Dialog ──────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invite User to Tenant
            </DialogTitle>
            <DialogDescription>
              Generate a secure invitation link. The recipient will set their own password upon accepting.
            </DialogDescription>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4 py-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <Sparkles className="h-4 w-4" />
                  Invitation Created Successfully!
                </div>
                <p className="text-xs text-muted-foreground">
                  Send this link to <strong className="text-foreground">{inviteResult.email}</strong>. The link expires once used or after 7 days.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Input 
                    value={inviteResult.url} 
                    readOnly 
                    className="text-xs font-mono bg-background" 
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => handleCopyLink(inviteResult.url)}
                    className="shrink-0 gap-1"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  onClick={() => {
                    setInviteOpen(false)
                    setInviteResult(null)
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="invite-email">Email Address <span className="text-destructive">*</span></Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  {...inviteForm.register('email')}
                />
                {inviteForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{inviteForm.formState.errors.email.message}</p>
                )}
                <p className="text-[11px] text-muted-foreground">The user will be created strictly with this email address.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="invite-name">Full Name <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Input
                  id="invite-name"
                  placeholder="e.g. Jane Doe"
                  {...inviteForm.register('name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Assigned Role <span className="text-destructive">*</span></Label>
                  <Select 
                    value={inviteForm.watch('role')} 
                    onValueChange={(val) => inviteForm.setValue('role', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesList.map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {r.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inviteForm.formState.errors.role && (
                    <p className="text-xs text-destructive">{inviteForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Company Scope</Label>
                  <Select 
                    value={inviteForm.watch('company_id') || '__tenant__'} 
                    onValueChange={(val) => inviteForm.setValue('company_id', val === '__tenant__' ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tenant-wide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__tenant__">Tenant-Wide (All)</SelectItem>
                      {companiesList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <span>The generated invitation link will expire automatically once it is accepted or after 7 days.</span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending} className="gap-2">
                  {inviteMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Generate Invitation
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ───────────────────────────────────────────── */}
      <Dialog open={Boolean(resetUser)} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <KeyRound className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Assign a new password for <strong className="text-foreground">{resetUser?.name}</strong> ({resetUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!resetUser) return
              if (newPassword.length < 8) {
                toast.error('Password must be at least 8 characters.')
                return
              }
              resetPasswordMutation.mutate({ userId: resetUser.id, password: newPassword })
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password">New Password</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary gap-1"
                  onClick={() => setNewPassword(generateSecurePassword())}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Strong Password
                </Button>
              </div>

              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 font-mono text-sm"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Security Impact:</strong> Resetting this password will immediately revoke all current active sessions for this user across all devices.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetUser(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={resetPasswordMutation.isPending || newPassword.length < 8}
                className="gap-2"
              >
                {resetPasswordMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm & Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ────────────────────────────────────────────────── */}
      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((v) => editUser && editMutation.mutate({ id: editUser.id, payload: v }))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Assigned Role</Label>
              <Select 
                value={editForm.watch('role')} 
                onValueChange={(val) => editForm.setValue('role', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rolesList.map((r) => (
                    <SelectItem key={r.name} value={r.name}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.role && (
                <p className="text-xs text-destructive">{editForm.formState.errors.role.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── User Permissions & Overrides Modal ─────────────────────────────── */}
      <UserPermissionsModal
        open={Boolean(permUser)}
        onOpenChange={(open) => !open && setPermUser(null)}
        user={permUser}
      />
    </div>
  )
}
