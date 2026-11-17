import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Shield, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  Building,
  Key,
  Layers,
  Search
} from 'lucide-react'
import {
  fetchUserEffectivePermissions,
  fetchRoles,
  fetchPermissions,
  saveUserOverride,
  deleteUserOverride,
  assignUserRoles,
  type TenantUser,
  fetchCompanies,
} from '@/api/tenant'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface UserPermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: TenantUser | null
}

export default function UserPermissionsModal({ open, onOpenChange, user }: UserPermissionsModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'roles' | 'overrides' | 'effective'>('roles')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedCompany, setSelectedCompany] = useState<string>('__global__')
  const [overridePerm, setOverridePerm] = useState<string>('')
  const [overrideType, setOverrideType] = useState<'grant' | 'deny'>('grant')
  const [overrideCompany, setOverrideCompany] = useState<string>('__global__')
  const [searchPerm, setSearchPerm] = useState('')

  const { data: userPermData } = useQuery({
    queryKey: ['user-effective-permissions', user?.id],
    queryFn: () => (user ? fetchUserEffectivePermissions(user.id).then((r) => r.data.data) : null),
    enabled: Boolean(user && open),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: () => fetchRoles().then((r) => r.data.data),
    enabled: open,
  })

  const { data: permsData } = useQuery({
    queryKey: ['tenant-permissions-all'],
    queryFn: () => fetchPermissions().then((r) => r.data.data),
    enabled: open,
  })

  const { data: companiesData } = useQuery({
    queryKey: ['tenant-companies-list'],
    queryFn: () => fetchCompanies().then((r) => r.data.data),
    enabled: open,
  })

  const roles = rolesData ?? []
  const permissions = permsData ?? []
  const companies = companiesData ?? []

  const saveOverrideMutation = useMutation({
    mutationFn: (payload: { permission_id: string; type: 'grant' | 'deny'; company_id?: string | null }) =>
      saveUserOverride(user!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', user?.id] })
      setOverridePerm('')
      toast.success('Permission override saved.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save override.')
    },
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: (overrideId: string) => deleteUserOverride(user!.id, overrideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', user?.id] })
      toast.success('Override removed.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete override.')
    },
  })

  const assignRoleMutation = useMutation({
    mutationFn: (newRoles: Array<{ role_id: string; company_id?: string | null }>) =>
      assignUserRoles(user!.id, newRoles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', user?.id] })
      setSelectedRole('')
      setSelectedCompany('__global__')
      toast.success('Role assignment updated.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update roles.')
    },
  })

  if (!user) return null

  const assignedRoles = userPermData?.roles ?? []
  const directOverrides = userPermData?.overrides ?? []
  const effectivePerms = userPermData?.permissions ?? []

  const handleAddRoleAssignment = () => {
    if (!selectedRole) return
    const companyId = selectedCompany === '__global__' ? null : selectedCompany
    const exists = assignedRoles.some(
      (r) => r.role_id === selectedRole && (r.company_id ?? null) === companyId
    )
    if (exists) {
      toast.error('This role is already assigned for the selected scope.')
      return
    }

    const updated = [
      ...assignedRoles.map((r) => ({ role_id: r.role_id, company_id: r.company_id ?? null })),
      { role_id: selectedRole, company_id: companyId },
    ]
    assignRoleMutation.mutate(updated)
  }

  const handleRemoveRoleAssignment = (indexToRemove: number) => {
    const updated = assignedRoles
      .filter((_, idx) => idx !== indexToRemove)
      .map((r) => ({ role_id: r.role_id, company_id: r.company_id ?? null }))
    assignRoleMutation.mutate(updated)
  }

  const handleAddOverride = () => {
    if (!overridePerm) return
    const companyId = overrideCompany === '__global__' ? null : overrideCompany
    saveOverrideMutation.mutate({
      permission_id: overridePerm,
      type: overrideType,
      company_id: companyId,
    })
  }

  const filteredPermissions = permissions.filter((p) => {
    if (!searchPerm.trim()) return true
    const q = searchPerm.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.display_name.toLowerCase().includes(q) ||
      p.module.toLowerCase().includes(q)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="flex-none pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Permissions & Role Scopes: {user.name}
                  {userPermData?.is_admin && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Tenant Admin
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pt-4 space-y-6">
          {/* Custom Navigation Tab Buttons */}
          <div className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-xl border border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'roles' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-4 w-4" />
              Assigned Roles & Scopes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overrides')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'overrides' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Key className="h-4 w-4" />
              Direct Overrides ({directOverrides.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('effective')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'effective' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="h-4 w-4" />
              Effective Rights Inspector
            </button>
          </div>

          {/* Tab 1: Roles & Scope Assignment */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Assign Role to User
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.display_name} {r.is_system ? '(System)' : '(Custom)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Entity Scope</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Entity Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__global__">All Companies (Tenant-Wide)</SelectItem>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!selectedRole || assignRoleMutation.isPending}
                  onClick={handleAddRoleAssignment}
                  className="mt-2"
                >
                  Add Role Assignment
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Active Role Assignments</h4>
                {assignedRoles.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 bg-muted/20 rounded-lg">
                    No explicit dynamic roles assigned yet. (User inherits legacy role string '{user.role}').
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedRoles.map((assignment, idx) => (
                      <div
                        key={assignment.id ?? idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-md text-primary">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{assignment.role?.display_name || 'Role'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {assignment.company ? (
                                <Badge variant="secondary" className="text-[11px] gap-1">
                                  <Building className="h-3 w-3" />
                                  {assignment.company.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px] text-primary border-primary/20 bg-primary/5">
                                  Tenant-Wide (All Companies)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveRoleAssignment(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Direct Permission Overrides */}
          {activeTab === 'overrides' && (
            <div className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add Direct Grant / Deny Override
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Permission</Label>
                    <Select value={overridePerm} onValueChange={setOverridePerm}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Permission" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {permissions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.display_name} ({p.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Action Type</Label>
                    <Select value={overrideType} onValueChange={(v: 'grant' | 'deny') => setOverrideType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grant">Explicit GRANT (+)</SelectItem>
                        <SelectItem value="deny">Explicit DENY (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Scope</Label>
                    <Select value={overrideCompany} onValueChange={setOverrideCompany}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__global__">All Companies (Tenant-Wide)</SelectItem>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!overridePerm || saveOverrideMutation.isPending}
                  onClick={handleAddOverride}
                  className="mt-2"
                >
                  Save Override
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Configured Overrides</h4>
                {directOverrides.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 bg-muted/20 rounded-lg">
                    No direct overrides configured. Permissions strictly follow assigned role(s).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {directOverrides.map((ov) => (
                      <div
                        key={ov.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card/60"
                      >
                        <div className="flex items-center gap-3">
                          {ov.type === 'grant' ? (
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-md">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-md">
                              <XCircle className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ov.permission?.display_name || ov.permission_id}</span>
                              <Badge
                                variant="outline"
                                className={
                                  ov.type === 'grant'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                }
                              >
                                {ov.type.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{ov.permission?.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Scope: {ov.company ? ov.company.name : 'Tenant-Wide'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteOverrideMutation.mutate(ov.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Effective Rights Inspector */}
          {activeTab === 'effective' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Live Effective Permissions</h4>
                  <p className="text-xs text-muted-foreground">
                    Evaluated permissions after role inheritance, company scoping, and direct overrides.
                  </p>
                </div>
                <div className="w-64">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter permissions..."
                      value={searchPerm}
                      onChange={(e) => setSearchPerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-border/70 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-border/40">
                {filteredPermissions.map((p) => {
                  const isGranted = userPermData?.is_admin || effectivePerms.includes(p.name) || effectivePerms.includes('*')
                  const override = directOverrides.find((o) => o.permission_id === p.id)

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 px-4 text-xs ${
                        isGranted ? 'bg-card/40' : 'bg-muted/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isGranted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">{p.display_name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{p.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {override ? (
                          <Badge
                            variant="outline"
                            className={
                              override.type === 'grant'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            }
                          >
                            Direct {override.type.toUpperCase()}
                          </Badge>
                        ) : isGranted ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Role Inherited
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Restricted</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
