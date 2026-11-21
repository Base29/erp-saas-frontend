import apiClient from './client'

export interface WorkCenter {
  id: string
  code: string
  name: string
  type: string
  hourly_capacity: number | string
  daily_capacity: number | string
  standard_availability_hours: number | string
  status: 'active' | 'maintenance' | 'inactive'
  notes?: string | null
  created_at: string
  updated_at: string
}

export type ComponentType = 'raw_material' | 'sub_assembly' | 'hardware' | 'packaging'

export interface BomItem {
  id?: string
  bill_of_material_id?: string
  child_bom_id?: string | null
  component_item_id: string
  variant_id?: string | null
  component_type?: ComponentType
  level?: number
  sequence?: number
  quantity_per_parent: number
  scrap_percentage: number
  notes?: string | null
  child_bom?: {
    id: string
    bom_number: string
  } | null
  component_item?: {
    id: string
    item_code: string
    item_name: string
    uom?: {
      code: string
      name?: string
    }
  }
}

export interface BomTreeNode {
  bom_item_id?: string
  component_item_id: string
  component_code: string
  component_name: string
  uom: string
  component_type: ComponentType
  level: number
  sequence: number
  quantity_per_parent: number
  scrap_percentage: number
  child_bom_id?: string | null
  child_bom_number?: string | null
  has_child_bom: boolean
  notes?: string | null
  children: BomTreeNode[]
}

export interface BomTreeResponse {
  bom_id: string
  bom_number: string
  item_id: string
  item_code: string
  item_name: string
  uom: string
  batch_size: number
  level: number
  is_circular: boolean
  children: BomTreeNode[]
}

export interface ExplodedMaterial {
  item_id: string
  item_code: string
  item_name: string
  uom: string
  component_type: ComponentType
  gross_required_quantity: number
  scrap_quantity: number
  net_required_quantity: number
  available_stock?: number
  shortage_qty?: number
  is_sufficient?: boolean
  sources: {
    parent_bom_number: string
    parent_item_name: string
    level: number
    quantity_demanded: number
  }[]
}

export interface BomExplodedResponse {
  bom_id: string
  bom_number: string
  item_id?: string
  item_name?: string
  target_qty: number
  materials: ExplodedMaterial[]
}

export interface BillOfMaterial {
  id: string
  bom_number: string
  item_id: string
  variant_id?: string | null
  batch_size: number
  cycle_time_sec: number
  units_per_carton: number
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
  item?: {
    id: string
    item_code: string
    item_name: string
  }
  items: BomItem[]
}

export interface ProductionPlanItem {
  id: string
  production_plan_id: string
  item_id: string
  variant_id?: string | null
  work_center_id?: string | null
  opening_stock: number
  target_quantity: number
  net_required_quantity: number
  available_capacity_hours: number
  required_capacity_hours: number
  capacity_variance_status: 'adequate' | 'deficit' | 'surplus'
  item?: {
    id: string
    item_code: string
    item_name: string
  }
  work_center?: WorkCenter
}

export interface ProductionPlan {
  id: string
  plan_code: string
  start_date: string
  end_date: string
  status: 'draft' | 'approved' | 'in_progress' | 'hold' | 'closed' | 'completed'
  notes?: string | null
  created_by: string
  created_at: string
  items: ProductionPlanItem[]
  creator?: {
    id: string
    name: string
    email: string
  }
}

export interface ProductionOrder {
  id: string
  production_plan_item_id?: string | null
  order_number: string
  batch_number: string
  item_id: string
  variant_id?: string | null
  work_center_id?: string | null
  planned_quantity: number
  produced_good_quantity: number
  rejected_quantity: number
  start_date?: string | null
  end_date?: string | null
  status: 'planned' | 'in_progress' | 'on_hold' | 'short_closed' | 'completed'
  hold_reason?: string | null
  closure_reason?: string | null
  notes?: string | null
  created_at: string
  item?: {
    id: string
    item_code: string
    item_name: string
  }
  work_center?: WorkCenter
  creator?: {
    id: string
    name: string
  }
  daily_entries?: DailyProductionEntry[]
  downtime_logs?: ProductionDowntimeLog[]
  raw_material_consumptions?: any[]
  component_stock_ledgers?: any[]
}

export interface DailyProductionEntry {
  id: string
  production_date: string
  shift: 'morning' | 'evening' | 'night'
  operator_name?: string | null
  batch_number: string
  production_order_id: string
  item_id: string
  machine_id: string
  good_quantity: number
  rejected_quantity: number
  standard_cycle_time_sec: number
  actual_running_minutes: number
  expected_quantity: number
  variance_quantity: number
  achievement_percentage: number
  notes?: string | null
  created_at: string
  machine?: WorkCenter
  item?: {
    id: string
    item_code: string
    item_name: string
  }
  production_order?: ProductionOrder
  injection_log?: InjectionProductionLog
}

export interface ProductionDowntimeLog {
  id: string
  machine_id: string
  production_order_id?: string | null
  daily_production_entry_id?: string | null
  reason: 'electricity_shutdown' | 'machine_breakdown' | 'tooling_damage' | 'material_shortage' | 'production_hold' | 'other'
  stopped_at: string
  restarted_at?: string | null
  duration_minutes: number
  remarks?: string | null
  created_at: string
  machine?: WorkCenter
  production_order?: ProductionOrder
}

export interface PackingEntry {
  id: string
  packing_date: string
  shift: 'morning' | 'evening' | 'night'
  batch_number: string
  item_id: string
  production_order_id?: string | null
  packed_quantity: number
  packing_rejected_quantity: number
  units_per_carton: number
  master_cartons_count: number
  loose_pieces_count: number
  notes?: string | null
  created_at: string
  item?: {
    id: string
    item_code: string
    item_name: string
  }
}

export interface ManufacturingOverviewKPIs {
  achievement_percentage: number
  total_good_today: number
  total_rejected_today: number
  reject_rate_percentage: number
  active_machines: number
  maintenance_machines: number
  total_downtime_minutes: number
  packed_cartons_today: number
  packed_pieces_today: number
  open_production_orders: number
  material_shortage_alerts: number
}

// ── Plastics & Injection Molding Extension Types ────────────────────────────

export interface PlasticsMould {
  id: string
  mould_code: string
  name: string
  item_id: string
  total_cavities: number
  default_active_cavities: number
  standard_cycle_time_sec: number
  shot_weight_grams: number
  status: 'active' | 'damaged' | 'under_repair' | 'retired'
  total_shots_lifetime: number
  notes?: string | null
  created_at: string
  item?: {
    id: string
    item_code: string
    item_name: string
  }
}

export interface InjectionProductionLog {
  id: string
  daily_production_entry_id: string
  mould_id: string
  polymer_item_id: string
  color_masterbatch_item_id?: string | null
  number_of_shots: number
  active_pieces_per_cycle: number
  actual_cycle_time_sec: number
  standard_material_kg: number
  actual_material_kg: number
  expected_pieces_from_shots: number
  notes?: string | null
  created_at: string
  mould?: PlasticsMould
  polymer_item?: {
    id: string
    item_code: string
    item_name: string
  }
  color_masterbatch?: {
    id: string
    item_code: string
    item_name: string
  }
}

export interface CrusherBatchLog {
  id: string
  date: string
  shift: 'morning' | 'evening' | 'night'
  source_production_order_id?: string | null
  source_order?: {
    id: string
    order_number: string
  } | null
  polymer_item_id: string
  color_variant?: string | null
  scrap_received_kg: number
  crushed_output_kg: number
  recovered_reusable_kg: number
  crusher_wastage_loss_kg: number
  reusable_balance_kg: number
  remarks?: string | null
  created_at: string
  polymer_item?: {
    id: string
    item_code: string
    item_name: string
  }
}

// ── API Functions: Core Manufacturing ────────────────────────────────────────

// Work Centers
export const fetchWorkCenters = (params?: any) =>
  apiClient.get<{ data: WorkCenter[] }>('/v1/manufacturing/work-centers', { params })

export const createWorkCenter = (data: Partial<WorkCenter>) =>
  apiClient.post<{ data: WorkCenter }>('/v1/manufacturing/work-centers', data)

export const updateWorkCenter = (id: string, data: Partial<WorkCenter>) =>
  apiClient.put<{ data: WorkCenter }>(`/v1/manufacturing/work-centers/${id}`, data)

export const deleteWorkCenter = (id: string) =>
  apiClient.delete(`/v1/manufacturing/work-centers/${id}`)

// BOMs
export const fetchBoms = (params?: any) =>
  apiClient.get<{ data: BillOfMaterial[] }>('/v1/manufacturing/boms', { params })

export const fetchBom = (id: string) =>
  apiClient.get<{ data: BillOfMaterial }>(`/v1/manufacturing/boms/${id}`)

export const fetchBomByItem = (itemId: string) =>
  apiClient.get<{ data: BillOfMaterial }>(`/v1/manufacturing/boms/by-item/${itemId}`)

export const fetchBomTree = (id: string) =>
  apiClient.get<{ data: BomTreeResponse }>(`/v1/manufacturing/boms/${id}/tree`)

export const fetchBomExploded = (id: string, quantity: number = 1) =>
  apiClient.get<{ data: BomExplodedResponse }>(`/v1/manufacturing/boms/${id}/exploded`, {
    params: { quantity },
  })

export const createBom = (data: any) =>
  apiClient.post<{ data: BillOfMaterial }>('/v1/manufacturing/boms', data)

export const updateBom = (id: string, data: any) =>
  apiClient.put<{ data: BillOfMaterial }>(`/v1/manufacturing/boms/${id}`, data)

export const deleteBom = (id: string) =>
  apiClient.delete(`/v1/manufacturing/boms/${id}`)

// Plans
export const fetchPlans = (params?: any) =>
  apiClient.get<{ data: ProductionPlan[] }>('/v1/manufacturing/plans', { params })

export const fetchPlan = (id: string) =>
  apiClient.get<{ data: ProductionPlan }>(`/v1/manufacturing/plans/${id}`)

export const createPlan = (data: any) =>
  apiClient.post<{ data: ProductionPlan }>('/v1/manufacturing/plans', data)

export const updatePlan = (id: string, data: any) =>
  apiClient.put<{ data: ProductionPlan }>(`/v1/manufacturing/plans/${id}`, data)

export const updatePlanStatus = (id: string, status: string) =>
  apiClient.post<{ data: ProductionPlan }>(`/v1/manufacturing/plans/${id}/status`, { status })

export const deletePlan = (id: string) =>
  apiClient.delete(`/v1/manufacturing/plans/${id}`)

export const checkMaterialSufficiency = (itemId: string, targetQuantity: number) =>
  apiClient.post('/v1/manufacturing/plans/check-sufficiency', {
    item_id: itemId,
    target_quantity: targetQuantity,
  })

// Orders
export const fetchOrders = (params?: any) =>
  apiClient.get<{ data: ProductionOrder[] }>('/v1/manufacturing/orders', { params })

export const fetchOrder = (id: string) =>
  apiClient.get<{ data: ProductionOrder }>(`/v1/manufacturing/orders/${id}`)

export const createOrder = (data: any) =>
  apiClient.post<{ data: ProductionOrder }>('/v1/manufacturing/orders', data)

export const updateOrder = (id: string, data: any) =>
  apiClient.put<{ data: ProductionOrder }>(`/v1/manufacturing/orders/${id}`, data)

export const updateOrderStatus = (id: string, status: string, reason?: string) =>
  apiClient.post<{ data: ProductionOrder }>(`/v1/manufacturing/orders/${id}/status`, { status, reason })

export const deleteOrder = (id: string) =>
  apiClient.delete(`/v1/manufacturing/orders/${id}`)

// Daily Production
export const fetchDailyEntries = (params?: any) =>
  apiClient.get<{ data: DailyProductionEntry[] }>('/v1/manufacturing/daily-production', { params })

export const createDailyEntry = (data: any) =>
  apiClient.post<{ data: DailyProductionEntry }>('/v1/manufacturing/daily-production', data)

export const deleteDailyEntry = (id: string) =>
  apiClient.delete(`/v1/manufacturing/daily-production/${id}`)

// Downtime
export const fetchDowntimeLogs = (params?: any) =>
  apiClient.get<{ data: ProductionDowntimeLog[] }>('/v1/manufacturing/downtime-logs', { params })

export const createDowntimeLog = (data: any) =>
  apiClient.post<{ data: ProductionDowntimeLog }>('/v1/manufacturing/downtime-logs', data)

export const restartMachine = (id: string, restartedAt?: string) =>
  apiClient.post<{ data: ProductionDowntimeLog }>(`/v1/manufacturing/downtime-logs/${id}/restart`, {
    restarted_at: restartedAt,
  })

export const deleteDowntimeLog = (id: string) =>
  apiClient.delete(`/v1/manufacturing/downtime-logs/${id}`)

// Packing
export const fetchPackingEntries = (params?: any) =>
  apiClient.get<{ data: PackingEntry[] }>('/v1/manufacturing/packing-entries', { params })

export const createPackingEntry = (data: any) =>
  apiClient.post<{ data: PackingEntry }>('/v1/manufacturing/packing-entries', data)

export const deletePackingEntry = (id: string) =>
  apiClient.delete(`/v1/manufacturing/packing-entries/${id}`)

// Reports
export const fetchManufacturingOverview = () =>
  apiClient.get<{ data: { kpis: ManufacturingOverviewKPIs; recent_entries: DailyProductionEntry[]; active_downtimes: ProductionDowntimeLog[] } }>('/v1/manufacturing/reports/overview')

export const fetchDailyProductionReport = (params?: any) =>
  apiClient.get('/v1/manufacturing/reports/daily-production', { params })

export const fetchTargetVsActualReport = (params?: any) =>
  apiClient.get('/v1/manufacturing/reports/target-vs-actual', { params })

export const fetchDailyPackingReport = (params?: any) =>
  apiClient.get('/v1/manufacturing/reports/daily-packing', { params })

export const fetchMachineHistoryReport = (params?: any) =>
  apiClient.get('/v1/manufacturing/reports/machine-history', { params })

// Settings
export const fetchManufacturingSettings = () =>
  apiClient.get('/v1/manufacturing/settings')

export const updateManufacturingSettings = (data: any) =>
  apiClient.put('/v1/manufacturing/settings', data)

// ── API Functions: Plastics & Injection Molding Extension ───────────────────

export const fetchMoulds = (params?: any) =>
  apiClient.get<{ data: PlasticsMould[] }>('/v1/extentions/plastics-molding/moulds', { params })

export const createMould = (data: Partial<PlasticsMould>) =>
  apiClient.post<{ data: PlasticsMould }>('/v1/extentions/plastics-molding/moulds', data)

export const updateMould = (id: string, data: Partial<PlasticsMould>) =>
  apiClient.put<{ data: PlasticsMould }>(`/v1/extentions/plastics-molding/moulds/${id}`, data)

export const deleteMould = (id: string) =>
  apiClient.delete(`/v1/extentions/plastics-molding/moulds/${id}`)

export const fetchInjectionLogs = (params?: any) =>
  apiClient.get<{ data: InjectionProductionLog[] }>('/v1/extentions/plastics-molding/injection-logs', { params })

export const createInjectionLog = (data: any) =>
  apiClient.post<{ data: InjectionProductionLog }>('/v1/extentions/plastics-molding/injection-logs', data)

export const deleteInjectionLog = (id: string) =>
  apiClient.delete(`/v1/extentions/plastics-molding/injection-logs/${id}`)

export const fetchCrusherLogs = (params?: any) =>
  apiClient.get<{ data: CrusherBatchLog[] }>('/v1/extentions/plastics-molding/crusher-logs', { params })

export const createCrusherLog = (data: any) =>
  apiClient.post<{ data: CrusherBatchLog }>('/v1/extentions/plastics-molding/crusher-logs', data)

export const deleteCrusherLog = (id: string) =>
  apiClient.delete(`/v1/extentions/plastics-molding/crusher-logs/${id}`)

export const fetchRegrindSummary = () =>
  apiClient.get('/v1/extentions/plastics-molding/crusher-logs/inventory-summary')

export const fetchInjectionMachineReport = (params?: any) =>
  apiClient.get('/v1/extentions/plastics-molding/reports/injection-machine', { params })

export const fetchRawMaterialCrusherReport = (params?: any) =>
  apiClient.get('/v1/extentions/plastics-molding/reports/raw-material-crusher', { params })
