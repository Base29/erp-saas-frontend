import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield,
  Plus,
  Copy,
  Trash2,
  Save,
  CheckSquare,
  Square,
  Search,
  Lock,
  Sparkles,
  Users,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert
} from 'lucide-react'
import {
  fetchRoles,
  fetchPermissions,
  initializePermissions,
  createRole,
  updateRole,
  cloneRole,
  deleteRole,
  type TenantRole,
  type TenantPermission,
} from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function RolesTab() {
  const queryClient = useQueryClient()

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [roleSearch, setRoleSearch] = useState('')
  const [permSearch, setPermSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDisplayName, setNewRoleDisplayName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')

  // State for active role editing
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([])
  const [roleDisplayName, setRoleDisplayName] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({})

  const { data: rolesData, isLoading: loadingRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: () => fetchRoles().then((r) => r.data.data),
  })

  const { data: permsData, isLoading: loadingPerms, refetch: refetchPerms } = useQuery({
    queryKey: ['tenant-permissions-grouped'],
    queryFn: () => fetchPermissions().then((r) => r.data),
  })

  const roles = rolesData ?? []
  const allPermissions: TenantPermission[] = permsData?.data ?? []

  // Self-initialize mutation
  const initMutation = useMutation({
    mutationFn: () => initializePermissions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-permissions-grouped'] })
      toast.success('Permissions and system roles initialized successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to initialize catalog.')
    },
  })

  // Group permissions reliably with fallback
  const groupedPermissions = useMemo<Record<string, TenantPermission[]>>(() => {
    if (permsData?.grouped && typeof permsData.grouped === 'object' && Object.keys(permsData.grouped).length > 0) {
      return permsData.grouped
    }
    const map: Record<string, TenantPermission[]> = {}
    for (const p of allPermissions) {
      const mod = p.module || 'general'
      if (!map[mod]) map[mod] = []
      map[mod].push(p)
    }
    return map
  }, [permsData, allPermissions])

  // Synchronize first role selection on data arrival
  useEffect(() => {
    if (roles.length > 0) {
      if (!selectedRoleId || !roles.some((r) => r.id === selectedRoleId)) {
        const firstRole = roles[0]
        setSelectedRoleId(firstRole.id)
        setSelectedPermIds(firstRole.permissions?.map((p) => p.id) ?? [])
        setRoleDisplayName(firstRole.display_name)
        setRoleDesc(firstRole.description ?? '')
      }
    }
  }, [roles, selectedRoleId])

  const currentRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) ?? null
  }, [roles, selectedRoleId])

  const selectRole = (role: TenantRole) => {
    setSelectedRoleId(role.id)
    setSelectedPermIds(role.permissions?.map((p) => p.id) ?? [])
    setRoleDisplayName(role.display_name)
    setRoleDesc(role.description ?? '')
  }

  const toggleModuleCollapse = (moduleName: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }))
  }

  // Save Role Mutation
  const saveRoleMutation = useMutation({
    mutationFn: () => {
      if (!currentRole) return Promise.reject()
      return updateRole(currentRole.id, {
        display_name: roleDisplayName,
        description: roleDesc,
        permissions: selectedPermIds,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] })
      toast.success(`Permissions updated for ${roleDisplayName}.`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not update role.')
    },
  })

  // Create Role Mutation
  const createRoleMutation = useMutation({
    mutationFn: () =>
      createRole({
        name: newRoleName,
        display_name: newRoleDisplayName,
        description: newRoleDesc,
        permissions: [],
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] })
      setCreateOpen(false)
      setNewRoleName('')
      setNewRoleDisplayName('')
      setNewRoleDesc('')
      setSelectedRoleId(res.data.data.id)
      setSelectedPermIds([])
      setRoleDisplayName(res.data.data.display_name)
      setRoleDesc(res.data.data.description ?? '')
      toast.success('New custom role created.')
    },
  })

  // Clone Role Mutation
  const cloneRoleMutation = useMutation({
    mutationFn: () => {
      if (!currentRole) return Promise.reject()
      return cloneRole(currentRole.id, {
        name: newRoleName,
        display_name: newRoleDisplayName,
        description: newRoleDesc,
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] })
      setCloneOpen(false)
      setNewRoleName('')
      setNewRoleDisplayName('')
      setNewRoleDesc('')
      setSelectedRoleId(res.data.data.id)
      setSelectedPermIds(res.data.data.permissions?.map((p) => p.id) ?? [])
      toast.success('Role template successfully cloned.')
    },
  })

  // Delete Role Mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] })
      setSelectedRoleId(null)
      toast.success('Custom role removed.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not delete role.')
    },
  })

  const togglePermission = (permId: string) => {
    if (currentRole?.is_system && currentRole.name === 'tenant_admin') return

    setSelectedPermIds((prev) => {
      if (prev.includes(permId)) {
        return prev.filter((id) => id !== permId)
      } else {
        return [...prev, permId]
      }
    })
  }

  const selectAll = () => {
    if (currentRole?.name === 'tenant_admin') return
    setSelectedPermIds(allPermissions.map((p) => p.id))
  }

  const clearAll = () => {
    if (currentRole?.name === 'tenant_admin') return
    setSelectedPermIds([])
  }

  const selectReadOnlyPreset = () => {
    if (currentRole?.name === 'tenant_admin') return
    const readIds = allPermissions.filter((p) => p.action === 'view' || p.action === 'read').map((p) => p.id)
    setSelectedPermIds(readIds)
  }

  const filteredRoles = roles.filter((r) => {
    if (!roleSearch.trim()) return true
    const q = roleSearch.toLowerCase()
    return r.display_name.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
  })

  const isTenantAdmin = currentRole?.name === 'tenant_admin'
  const isBusy = loadingRoles || loadingPerms || initMutation.isPending

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* ── Left Pane: Roles List ────────────────────────────────────────── */}
      <div className="w-full lg:w-80 flex-none flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Roles</h3>
            <p className="text-xs text-muted-foreground">Manage system & custom roles</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => {
                refetchRoles()
                refetchPerms()
              }}
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              Add Role
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={roleSearch}
            onChange={(e) => setRoleSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingRoles ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs">Loading roles...</span>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-xl bg-muted/20 space-y-2">
              <p className="text-xs text-muted-foreground">No roles found.</p>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => initMutation.mutate()}>
                <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                Initialize Roles
              </Button>
            </div>
          ) : (
            filteredRoles.map((role) => {
              const isSelected = role.id === selectedRoleId
              return (
                <div
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/5 border-primary/40 shadow-sm'
                      : 'bg-card/60 hover:bg-muted/40 border-border/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {role.is_system ? (
                        <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="font-semibold text-sm text-foreground">{role.display_name}</span>
                    </div>
                    <Badge variant={role.is_system ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                      {role.is_system ? 'Built-in' : 'Custom'}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground font-mono mt-1">{role.name}</p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {role.users_count ?? 0} user(s)
                    </span>
                    <span>{role.permissions_count ?? role.permissions?.length ?? 0} perms</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right Pane: Permission Matrix ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-card/60 rounded-2xl border border-border/70 p-6 overflow-hidden">
        {loadingRoles || loadingPerms ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading permission catalog & matrix...</p>
          </div>
        ) : allPermissions.length === 0 ? (
          /* Empty Catalog Banner with 1-Click Initializer */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 mb-4">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Permissions Catalog Not Initialized</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
              The fine-grained permissions matrix has not been seeded yet in this tenant database. Click below to initialize all standard system permissions and built-in role templates.
            </p>
            <Button
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              className="gap-2 shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              {initMutation.isPending ? 'Initializing Catalog...' : 'Initialize Permissions Catalog'}
            </Button>
          </div>
        ) : currentRole ? (
          <>
            {/* Header with Role Details and Actions */}
            <div className="flex-none pb-6 border-b border-border/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-foreground">{roleDisplayName}</h2>
                    <Badge variant={currentRole.is_system ? 'secondary' : 'outline'}>
                      {currentRole.is_system ? 'System Role' : 'Custom Role'}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                      {currentRole.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {roleDesc || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewRoleName(`${currentRole.name}_copy`)
                      setNewRoleDisplayName(`${currentRole.display_name} Copy`)
                      setNewRoleDesc(currentRole.description ?? '')
                      setCloneOpen(true)
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone
                  </Button>

                  {!currentRole.is_system && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete role "${currentRole.display_name}"?`)) {
                          deleteRoleMutation.mutate(currentRole.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => saveRoleMutation.mutate()}
                    disabled={isTenantAdmin || saveRoleMutation.isPending}
                    className="gap-1.5 text-xs shadow-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Permissions
                  </Button>
                </div>
              </div>

              {isTenantAdmin ? (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 text-xs">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    The <strong>Tenant Administrator</strong> role is the root security authority and inherently possesses all current and future permissions across the tenant.
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs gap-1">
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      Select All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs gap-1">
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                      Clear All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={selectReadOnlyPreset} className="h-7 text-xs gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      Read-Only Preset
                    </Button>
                  </div>

                  <div className="w-64">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search matrix permissions..."
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Matrix Accordions */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              {Object.entries(groupedPermissions).map(([moduleName, rawPerms]) => {
                const isCollapsed = collapsedModules[moduleName]
                const permsList: TenantPermission[] = Array.isArray(rawPerms) ? rawPerms : Object.values(rawPerms)

                const filteredPerms = permsList.filter((p) => {
                  if (!permSearch.trim()) return true
                  const q = permSearch.toLowerCase()
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.display_name.toLowerCase().includes(q) ||
                    (p.group && p.group.toLowerCase().includes(q))
                  )
                })

                if (filteredPerms.length === 0) return null

                const modulePermIds = permsList.map((p) => p.id)
                const selectedCount = modulePermIds.filter((id) => selectedPermIds.includes(id)).length

                return (
                  <div
                    key={moduleName}
                    className="border border-border/70 rounded-xl overflow-hidden bg-card/40"
                  >
                    <div
                      onClick={() => toggleModuleCollapse(moduleName)}
                      className="flex items-center justify-between p-3.5 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-bold text-sm uppercase tracking-wider text-foreground">
                          {moduleName}
                        </span>
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {selectedCount} / {permsList.length} granted
                        </Badge>
                      </div>

                      {!isTenantAdmin && (
                        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPermIds((prev) => Array.from(new Set([...prev, ...modulePermIds])))
                            }}
                            className="text-primary hover:underline"
                          >
                            Select All
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPermIds((prev) => prev.filter((id) => !modulePermIds.includes(id)))
                            }}
                            className="text-muted-foreground hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 divide-y-0">
                        {filteredPerms.map((perm) => {
                          const checked = isTenantAdmin || selectedPermIds.includes(perm.id)
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                checked
                                  ? 'bg-primary/5 border-primary/30'
                                  : 'bg-background/40 hover:bg-muted/20 border-border/50'
                              } ${isTenantAdmin ? 'cursor-not-allowed opacity-90' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isTenantAdmin}
                                onChange={() => togglePermission(perm.id)}
                                className="mt-1 rounded border-border/80 text-primary focus:ring-primary h-4 w-4"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs text-foreground">
                                    {perm.display_name}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 font-mono">
                                    {perm.action}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{perm.name}</p>
                                {perm.description && (
                                  <p className="text-[11px] text-muted-foreground mt-1">{perm.description}</p>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8 text-muted-foreground">
            Select a role from the left pane to inspect and customize its permissions matrix.
          </div>
        )}
      </div>

      {/* ── Create Role Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Role Name (Slug)</Label>
              <Input
                placeholder="e.g. junior_accountant"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                className="font-mono text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input
                placeholder="e.g. Junior Accountant"
                value={newRoleDisplayName}
                onChange={(e) => setNewRoleDisplayName(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Role responsibilities and access boundaries"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRoleMutation.mutate()}
              disabled={!newRoleName.trim() || !newRoleDisplayName.trim() || createRoleMutation.isPending}
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clone Role Dialog ──────────────────────────────────────────────── */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone Role: {currentRole?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">New Role Slug</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                className="font-mono text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">New Display Name</Label>
              <Input
                value={newRoleDisplayName}
                onChange={(e) => setNewRoleDisplayName(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => cloneRoleMutation.mutate()}
              disabled={!newRoleName.trim() || !newRoleDisplayName.trim() || cloneRoleMutation.isPending}
            >
              Clone Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
