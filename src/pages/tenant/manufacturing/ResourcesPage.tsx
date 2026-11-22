import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { hasPermission, canWrite } from '@/utils/permissions'
import {
  fetchWorkCenters,
  createWorkCenter,
  updateWorkCenter,
  deleteWorkCenter,
  fetchMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  fetchOperators,
  createOperator,
  updateOperator,
  deleteOperator,
  type WorkCenter,
  type Machine,
  type Operator,
  type OperatorShift,
  type OperatorWageType,
} from '@/api/manufacturing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2,
  Cpu,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Briefcase,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ResourcesPage() {
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canManage =
    hasPermission('manufacturing.resources.manage') ||
    hasPermission('manufacturing.write') ||
    canWrite(role, 'manufacturing')

  const [activeTab, setActiveTab] = useState<'work-centers' | 'machines' | 'operators'>('work-centers')

  // Search states for each tab
  const [wcSearch, setWcSearch] = useState('')
  const [machineSearch, setMachineSearch] = useState('')
  const [operatorSearch, setOperatorSearch] = useState('')

  // ── Work Centers Modal State ───────────────────────────────────────────────
  const [wcModalOpen, setWcModalOpen] = useState(false)
  const [editingWc, setEditingWc] = useState<WorkCenter | null>(null)
  const [wcFormData, setWcFormData] = useState({
    code: '',
    name: '',
    location: '',
    type: 'assembly',
    hourly_capacity: 0,
    daily_capacity: 0,
    standard_availability_hours: 8,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    notes: '',
  })

  // ── Machines Modal State ───────────────────────────────────────────────────
  const [machineModalOpen, setMachineModalOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [machineFormData, setMachineFormData] = useState({
    code: '',
    name: '',
    work_center_id: '',
    model_number: '',
    serial_number: '',
    manufacturer: '',
    hourly_capacity: 0,
    daily_capacity: 0,
    standard_availability_hours: 8,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    notes: '',
  })

  // ── Operators Modal State ──────────────────────────────────────────────────
  const [operatorModalOpen, setOperatorModalOpen] = useState(false)
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null)
  const [operatorFormData, setOperatorFormData] = useState({
    operator_code: '',
    name: '',
    shift: 'general' as OperatorShift,
    wage_type: 'per_hour' as OperatorWageType,
    wage_rate: 0,
    speciality: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  })

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: workCenters, isLoading: loadingWc } = useQuery({
    queryKey: ['work-centers', wcSearch],
    queryFn: () => fetchWorkCenters({ search: wcSearch, all: true }).then((r) => r.data.data),
  })

  const { data: machines, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines', machineSearch],
    queryFn: () => fetchMachines({ search: machineSearch, all: true }).then((r) => r.data.data),
  })

  const { data: operators, isLoading: loadingOperators } = useQuery({
    queryKey: ['operators', operatorSearch],
    queryFn: () => fetchOperators({ search: operatorSearch, all: true }).then((r) => r.data.data),
  })

  // ── Work Center Mutations ──────────────────────────────────────────────────
  const saveWcMutation = useMutation({
    mutationFn: (payload: any) =>
      editingWc ? updateWorkCenter(editingWc.id, payload) : createWorkCenter(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] })
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      setWcModalOpen(false)
      setEditingWc(null)
      toast.success(editingWc ? 'Work center updated' : 'Work center created')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save work center')
    },
  })

  const deleteWcMutation = useMutation({
    mutationFn: (id: string) => deleteWorkCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] })
      toast.success('Work center deleted')
    },
    onError: () => toast.error('Failed to delete work center'),
  })

  // ── Machine Mutations ──────────────────────────────────────────────────────
  const saveMachineMutation = useMutation({
    mutationFn: (payload: any) =>
      editingMachine ? updateMachine(editingMachine.id, payload) : createMachine(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['work-centers'] })
      setMachineModalOpen(false)
      setEditingMachine(null)
      toast.success(editingMachine ? 'Machine updated' : 'Machine created')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save machine')
    },
  })

  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      toast.success('Machine deleted')
    },
    onError: () => toast.error('Failed to delete machine'),
  })

  // ── Operator Mutations ────────────────────────────────────────────────────
  const saveOperatorMutation = useMutation({
    mutationFn: (payload: any) =>
      editingOperator ? updateOperator(editingOperator.id, payload) : createOperator(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      setOperatorModalOpen(false)
      setEditingOperator(null)
      toast.success(editingOperator ? 'Operator updated' : 'Operator created')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save operator')
    },
  })

  const deleteOperatorMutation = useMutation({
    mutationFn: (id: string) => deleteOperator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      toast.success('Operator deleted')
    },
    onError: () => toast.error('Failed to delete operator'),
  })

  // ── Handlers: Open Work Center Modal ───────────────────────────────────────
  const handleOpenWcModal = (wc?: WorkCenter) => {
    if (wc) {
      setEditingWc(wc)
      setWcFormData({
        code: wc.code,
        name: wc.name,
        location: wc.location || '',
        type: wc.type || 'assembly',
        hourly_capacity: Number(wc.hourly_capacity || 0),
        daily_capacity: Number(wc.daily_capacity || 0),
        standard_availability_hours: Number(wc.standard_availability_hours || 8),
        status: wc.status,
        notes: wc.notes || '',
      })
    } else {
      setEditingWc(null)
      setWcFormData({
        code: '',
        name: '',
        location: '',
        type: 'assembly',
        hourly_capacity: 0,
        daily_capacity: 0,
        standard_availability_hours: 8,
        status: 'active',
        notes: '',
      })
    }
    setWcModalOpen(true)
  }

  // ── Handlers: Open Machine Modal ───────────────────────────────────────────
  const handleOpenMachineModal = (machine?: Machine) => {
    if (machine) {
      setEditingMachine(machine)
      setMachineFormData({
        code: machine.code,
        name: machine.name,
        work_center_id: machine.work_center_id || '',
        model_number: machine.model_number || '',
        serial_number: machine.serial_number || '',
        manufacturer: machine.manufacturer || '',
        hourly_capacity: Number(machine.hourly_capacity || 0),
        daily_capacity: Number(machine.daily_capacity || 0),
        standard_availability_hours: Number(machine.standard_availability_hours || 8),
        status: machine.status,
        notes: machine.notes || '',
      })
    } else {
      setEditingMachine(null)
      setMachineFormData({
        code: '',
        name: '',
        work_center_id: '',
        model_number: '',
        serial_number: '',
        manufacturer: '',
        hourly_capacity: 0,
        daily_capacity: 0,
        standard_availability_hours: 8,
        status: 'active',
        notes: '',
      })
    }
    setMachineModalOpen(true)
  }

  // ── Handlers: Open Operator Modal ──────────────────────────────────────────
  const handleOpenOperatorModal = (op?: Operator) => {
    if (op) {
      setEditingOperator(op)
      setOperatorFormData({
        operator_code: op.operator_code || '',
        name: op.name,
        shift: op.shift || 'general',
        wage_type: op.wage_type || 'per_hour',
        wage_rate: Number(op.wage_rate || 0),
        speciality: op.speciality || '',
        phone: op.phone || '',
        status: op.status || 'active',
        notes: op.notes || '',
      })
    } else {
      setEditingOperator(null)
      setOperatorFormData({
        operator_code: '',
        name: '',
        shift: 'general',
        wage_type: 'per_hour',
        wage_rate: 0,
        speciality: '',
        phone: '',
        status: 'active',
        notes: '',
      })
    }
    setOperatorModalOpen(true)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Manufacturing Resources
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage factory production resources: physical plant locations (Work Centers), equipment assets (Machines), and shop-floor personnel (Operators).
          </p>
        </div>

        {!canManage && (
          <Badge variant="outline" className="text-xs text-muted-foreground py-1 px-3 gap-1.5 self-start sm:self-auto">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Read-Only (Resources Management Permission Required)
          </Badge>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="w-full space-y-6">
        <div className="grid grid-cols-3 w-full max-w-xl h-11 p-1 bg-muted/60 border border-border/60 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('work-centers')}
            className={`flex items-center justify-center gap-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'work-centers'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4 text-blue-500" />
            Work Centers
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
              {workCenters?.length ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('machines')}
            className={`flex items-center justify-center gap-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'machines'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu className="h-4 w-4 text-purple-500" />
            Machines
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
              {machines?.length ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('operators')}
            className={`flex items-center justify-center gap-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'operators'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4 text-emerald-500" />
            Operators
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
              {operators?.length ?? 0}
            </span>
          </button>
        </div>

        {/* ── TAB 1: WORK CENTERS ───────────────────────────────────────────── */}
        {activeTab === 'work-centers' && (
          <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Work Center Locations & Departments
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Physical bays, department zones, and production shop floors where machines and assembly lines reside.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={wcSearch}
                    onChange={(e) => setWcSearch(e.target.value)}
                    placeholder="Search work centers or location..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {canManage && (
                  <Button onClick={() => handleOpenWcModal()} size="sm" className="h-8 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Work Center
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Work Center Name</TableHead>
                    <TableHead>Location / Bay</TableHead>
                    <TableHead>Process Type</TableHead>
                    <TableHead className="text-center">Installed Machines</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingWc ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-xs text-muted-foreground">
                        Loading work centers...
                      </TableCell>
                    </TableRow>
                  ) : workCenters && workCenters.length > 0 ? (
                    workCenters.map((wc) => (
                      <TableRow key={wc.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-primary">{wc.code}</TableCell>
                        <TableCell className="font-semibold text-xs text-foreground">
                          {wc.name}
                          {wc.notes && <p className="text-[11px] text-muted-foreground font-normal line-clamp-1">{wc.notes}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {wc.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              {wc.location}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {wc.type?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-foreground">
                            {wc.machines_count ?? 0} machines
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              wc.status === 'active'
                                ? 'success'
                                : wc.status === 'maintenance'
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {wc.status}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenWcModal(wc)}
                                title="Edit Work Center"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete work center "${wc.name}"?`)) {
                                    deleteWcMutation.mutate(wc.id)
                                  }
                                }}
                                title="Delete Work Center"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-xs text-muted-foreground">
                        No work centers configured yet. Click &quot;Add Work Center&quot; to define plant bays.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 2: MACHINES ──────────────────────────────────────────────── */}
      {activeTab === 'machines' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-500" />
                  Production Machines & Equipment
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Machines, models, serial specifications, and their assigned Work Center locations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={machineSearch}
                    onChange={(e) => setMachineSearch(e.target.value)}
                    placeholder="Search machine code, model, maker..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {canManage && (
                  <Button onClick={() => handleOpenMachineModal()} size="sm" className="h-8 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Machine
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine Code</TableHead>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Work Center Location</TableHead>
                    <TableHead>Model / Serial No</TableHead>
                    <TableHead className="text-right">Hourly Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMachines ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-xs text-muted-foreground">
                        Loading machines...
                      </TableCell>
                    </TableRow>
                  ) : machines && machines.length > 0 ? (
                    machines.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-primary">{m.code}</TableCell>
                        <TableCell className="font-semibold text-xs text-foreground">
                          {m.name}
                          {m.manufacturer && <span className="block text-[11px] text-muted-foreground font-normal">{m.manufacturer}</span>}
                        </TableCell>
                        <TableCell>
                          {m.work_center ? (
                            <div className="text-xs">
                              <span className="font-medium text-foreground">{m.work_center.name}</span>
                              {m.work_center.location && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                                  {m.work_center.location}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">(Unassigned)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {m.model_number || m.serial_number ? (
                            <div>
                              <span>{m.model_number || '—'}</span>
                              {m.serial_number && <span className="block text-[10px] text-muted-foreground">S/N: {m.serial_number}</span>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Number(m.hourly_capacity) > 0 ? `${m.hourly_capacity} /hr` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.status === 'active'
                                ? 'success'
                                : m.status === 'maintenance'
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {m.status}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenMachineModal(m)}
                                title="Edit Machine"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete machine "${m.name}"?`)) {
                                    deleteMachineMutation.mutate(m.id)
                                  }
                                }}
                                title="Delete Machine"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-xs text-muted-foreground">
                        No machines registered yet. Click &quot;Add Machine&quot; to catalogue your production equipment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: OPERATORS ─────────────────────────────────────────────── */}
      {activeTab === 'operators' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Machine Operators & Shop-Floor Personnel
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track machine operators, shifts (General/Day/Night), wage rates (Per Hour/Per Piece), and technical specialities.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={operatorSearch}
                    onChange={(e) => setOperatorSearch(e.target.value)}
                    placeholder="Search name, code, speciality..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {canManage && (
                  <Button onClick={() => handleOpenOperatorModal()} size="sm" className="h-8 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Operator
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Badge / ID</TableHead>
                    <TableHead>Operator Name</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Wage Type</TableHead>
                    <TableHead className="text-right">Wage Rate</TableHead>
                    <TableHead>Speciality</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOperators ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-xs text-muted-foreground">
                        Loading operators...
                      </TableCell>
                    </TableRow>
                  ) : operators && operators.length > 0 ? (
                    operators.map((op) => (
                      <TableRow key={op.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {op.operator_code || '—'}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-foreground">
                          {op.name}
                          {op.phone && <span className="block text-[11px] text-muted-foreground font-normal">{op.phone}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              op.shift === 'day'
                                ? 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                : op.shift === 'night'
                                ? 'border-indigo-500/40 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10'
                                : 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10'
                            }
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {op.shift === 'day' ? 'Day Shift' : op.shift === 'night' ? 'Night Shift' : 'General Shift'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            <Briefcase className="h-3 w-3 mr-1 text-muted-foreground" />
                            {op.wage_type === 'per_piece' ? 'Per Piece' : 'Per Hour'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          <span className="text-foreground">
                            {Number(op.wage_rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {op.wage_type === 'per_piece' ? '/piece' : '/hr'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {op.speciality ? (
                            <Badge variant="outline" className="text-[10px] bg-muted/40 font-normal">
                              {op.speciality}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={op.status === 'active' ? 'success' : 'secondary'} className="text-[10px]">
                            {op.status}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenOperatorModal(op)}
                                title="Edit Operator"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete operator "${op.name}"?`)) {
                                    deleteOperatorMutation.mutate(op.id)
                                  }
                                }}
                                title="Delete Operator"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-xs text-muted-foreground">
                        No operators registered yet. Click &quot;Add Operator&quot; to configure shop-floor personnel.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>

      {/* ── WORK CENTER CREATE/EDIT MODAL ────────────────────────────────────── */}
      <Dialog open={wcModalOpen} onOpenChange={setWcModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              {editingWc ? 'Edit Work Center' : 'Create Work Center Location'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveWcMutation.mutate(wcFormData)
            }}
            className="space-y-3.5 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Code *</Label>
                <Input
                  required
                  placeholder="e.g. WC-MOLD-01"
                  className="h-8 text-xs font-mono uppercase"
                  value={wcFormData.code}
                  onChange={(e) => setWcFormData({ ...wcFormData, code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Process Type</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  value={wcFormData.type}
                  onChange={(e) => setWcFormData({ ...wcFormData, type: e.target.value })}
                >
                  <option value="assembly">Assembly</option>
                  <option value="injection_molding">Injection Molding</option>
                  <option value="packaging">Packaging</option>
                  <option value="quality_control">Quality Control</option>
                  <option value="machining">Machining / Fabrication</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Work Center Name *</Label>
              <Input
                required
                placeholder="e.g. Main Molding Floor Bay A"
                className="h-8 text-xs"
                value={wcFormData.name}
                onChange={(e) => setWcFormData({ ...wcFormData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                Physical Location / Bay / Floor
              </Label>
              <Input
                placeholder="e.g. Building B, Ground Floor, Bay 3"
                className="h-8 text-xs"
                value={wcFormData.location}
                onChange={(e) => setWcFormData({ ...wcFormData, location: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Specifies where production machines in this center are physically stationed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Standard Hours / Day</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  className="h-8 text-xs font-mono"
                  value={wcFormData.standard_availability_hours}
                  onChange={(e) => setWcFormData({ ...wcFormData, standard_availability_hours: parseFloat(e.target.value) || 8 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  value={wcFormData.status}
                  onChange={(e) => setWcFormData({ ...wcFormData, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes / Environmental Specs</Label>
              <Input
                placeholder="Air conditioning, 3-phase power line, or access restrictions..."
                className="h-8 text-xs"
                value={wcFormData.notes}
                onChange={(e) => setWcFormData({ ...wcFormData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setWcModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveWcMutation.isPending}>
                {saveWcMutation.isPending ? 'Saving...' : editingWc ? 'Update Work Center' : 'Create Work Center'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MACHINE CREATE/EDIT MODAL ────────────────────────────────────────── */}
      <Dialog open={machineModalOpen} onOpenChange={setMachineModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-500" />
              {editingMachine ? 'Edit Machine Details' : 'Register New Machine'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveMachineMutation.mutate(machineFormData)
            }}
            className="space-y-3.5 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Machine Code *</Label>
                <Input
                  required
                  placeholder="e.g. INJ-150-01"
                  className="h-8 text-xs font-mono uppercase"
                  value={machineFormData.code}
                  onChange={(e) => setMachineFormData({ ...machineFormData, code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assigned Work Center Location</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  value={machineFormData.work_center_id}
                  onChange={(e) => setMachineFormData({ ...machineFormData, work_center_id: e.target.value })}
                >
                  <option value="">(None / Mobile Equipment)</option>
                  {workCenters?.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.name} ({wc.code}) {wc.location ? `— ${wc.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Machine Name *</Label>
              <Input
                required
                placeholder="e.g. 150T Haitian Injection Molding Press #1"
                className="h-8 text-xs"
                value={machineFormData.name}
                onChange={(e) => setMachineFormData({ ...machineFormData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Manufacturer</Label>
                <Input
                  placeholder="e.g. Haitian, Fanuc"
                  className="h-8 text-xs"
                  value={machineFormData.manufacturer}
                  onChange={(e) => setMachineFormData({ ...machineFormData, manufacturer: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model No.</Label>
                <Input
                  placeholder="e.g. MA1200II"
                  className="h-8 text-xs font-mono"
                  value={machineFormData.model_number}
                  onChange={(e) => setMachineFormData({ ...machineFormData, model_number: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Serial Number</Label>
                <Input
                  placeholder="e.g. SN-88912"
                  className="h-8 text-xs font-mono"
                  value={machineFormData.serial_number}
                  onChange={(e) => setMachineFormData({ ...machineFormData, serial_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Hourly Capacity (units/hr)</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="h-8 text-xs font-mono"
                  value={machineFormData.hourly_capacity}
                  onChange={(e) => setMachineFormData({ ...machineFormData, hourly_capacity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Machine Status</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  value={machineFormData.status}
                  onChange={(e) => setMachineFormData({ ...machineFormData, status: e.target.value as any })}
                >
                  <option value="active">Active (Operational)</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="inactive">Decommissioned / Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Engineering Notes / Preventive Maintenance</Label>
              <Input
                placeholder="Oil grade ISO 46, hydraulic clamp specs, or warranty details..."
                className="h-8 text-xs"
                value={machineFormData.notes}
                onChange={(e) => setMachineFormData({ ...machineFormData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setMachineModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveMachineMutation.isPending}>
                {saveMachineMutation.isPending ? 'Saving...' : editingMachine ? 'Update Machine' : 'Create Machine'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── OPERATOR CREATE/EDIT MODAL ───────────────────────────────────────── */}
      <Dialog open={operatorModalOpen} onOpenChange={setOperatorModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              {editingOperator ? 'Edit Operator Profile' : 'Register Machine Operator'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveOperatorMutation.mutate(operatorFormData)
            }}
            className="space-y-3.5 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Badge / Operator Code</Label>
                <Input
                  placeholder="e.g. OP-101"
                  className="h-8 text-xs font-mono uppercase"
                  value={operatorFormData.operator_code}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, operator_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Shift *</Label>
                <select
                  required
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                  value={operatorFormData.shift}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, shift: e.target.value as OperatorShift })}
                >
                  <option value="general">General Shift (Standard Day)</option>
                  <option value="day">Day Shift (Morning / Afternoon)</option>
                  <option value="night">Night Shift (Graveyard)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Operator Full Name *</Label>
              <Input
                required
                placeholder="e.g. Muhammad Rashid"
                className="h-8 text-xs"
                value={operatorFormData.name}
                onChange={(e) => setOperatorFormData({ ...operatorFormData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/80 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1 font-semibold">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  Wage Type *
                </Label>
                <select
                  required
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-semibold"
                  value={operatorFormData.wage_type}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, wage_type: e.target.value as OperatorWageType })}
                >
                  <option value="per_hour">Per Hour (Hourly Rate)</option>
                  <option value="per_piece">Per Piece (Piecework Rate)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1 font-semibold">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  {operatorFormData.wage_type === 'per_piece' ? 'Rate / Piece *' : 'Rate / Hour *'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="h-8 text-xs font-mono font-semibold"
                  value={operatorFormData.wage_rate}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, wage_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Speciality / Core Competencies (Optional)</Label>
              <Input
                placeholder="e.g. Injection Mold Setup, Blow Molding, Die Alignment, CNC Lathe"
                className="h-8 text-xs"
                value={operatorFormData.speciality}
                onChange={(e) => setOperatorFormData({ ...operatorFormData, speciality: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Optional skill tag for assigning qualified operators to specific machine types.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Contact Phone</Label>
                <Input
                  placeholder="e.g. +92 300 1234567"
                  className="h-8 text-xs"
                  value={operatorFormData.phone}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  value={operatorFormData.status}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, status: e.target.value as any })}
                >
                  <option value="active">Active (Available)</option>
                  <option value="inactive">Inactive / On Leave</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Operator Notes / Certifications</Label>
              <Input
                placeholder="Forklift certified, electrical safety clearance, or shift notes..."
                className="h-8 text-xs"
                value={operatorFormData.notes}
                onChange={(e) => setOperatorFormData({ ...operatorFormData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setOperatorModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveOperatorMutation.isPending}>
                {saveOperatorMutation.isPending ? 'Saving...' : editingOperator ? 'Update Operator' : 'Register Operator'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
