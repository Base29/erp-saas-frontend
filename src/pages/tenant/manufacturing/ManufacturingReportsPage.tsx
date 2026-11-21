import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyProductionReport,
  fetchTargetVsActualReport,
  fetchDailyPackingReport,
  fetchMachineHistoryReport,
  fetchInjectionMachineReport,
  fetchRawMaterialCrusherReport,
} from '@/api/manufacturing'
import { isExtensionActive } from '@/utils/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  BarChart3,
  Sparkles,
  Recycle,
} from 'lucide-react'

export default function ManufacturingReportsPage() {
  const isPlasticsActive = isExtensionActive('plastics_molding')
  const [activeTab, setActiveTab] = useState<'daily' | 'target' | 'packing' | 'history' | 'injection' | 'crusher'>('daily')

  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Queries
  const dailyQuery = useQuery({
    queryKey: ['report-daily', startDate, endDate],
    queryFn: () => fetchDailyProductionReport({ start_date: startDate, end_date: endDate }).then((r) => r.data.data),
    enabled: activeTab === 'daily',
  })

  const targetQuery = useQuery({
    queryKey: ['report-target'],
    queryFn: () => fetchTargetVsActualReport().then((r) => r.data.data),
    enabled: activeTab === 'target',
  })

  const packingQuery = useQuery({
    queryKey: ['report-packing', startDate, endDate],
    queryFn: () => fetchDailyPackingReport({ start_date: startDate, end_date: endDate }).then((r) => r.data.data),
    enabled: activeTab === 'packing',
  })

  const historyQuery = useQuery({
    queryKey: ['report-history'],
    queryFn: () => fetchMachineHistoryReport().then((r) => r.data.data),
    enabled: activeTab === 'history',
  })

  const injectionQuery = useQuery({
    queryKey: ['report-injection', startDate, endDate],
    queryFn: () => fetchInjectionMachineReport({ start_date: startDate, end_date: endDate }).then((r) => r.data.data),
    enabled: activeTab === 'injection' && isPlasticsActive,
  })

  const crusherQuery = useQuery({
    queryKey: ['report-crusher', startDate, endDate],
    queryFn: () => fetchRawMaterialCrusherReport({ start_date: startDate, end_date: endDate }).then((r) => r.data.data),
    enabled: activeTab === 'crusher' && isPlasticsActive,
  })

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Manufacturing Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive production logs, material sufficiency checks, packing runs, and injection analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-9 text-xs w-36"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">&rarr;</span>
          <Input
            type="date"
            className="h-9 text-xs w-36"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === 'daily' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Daily Production Report
        </button>
        <button
          onClick={() => setActiveTab('target')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === 'target' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Target vs. Actual & Sufficiency
        </button>
        <button
          onClick={() => setActiveTab('packing')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === 'packing' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Daily Packing Report
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === 'history' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Machine & Batch History
        </button>

        {isPlasticsActive && (
          <>
            <button
              onClick={() => setActiveTab('injection')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === 'injection' ? 'border-purple-600 text-purple-600 bg-purple-500/10' : 'border-transparent text-purple-600/70 hover:text-purple-600'}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Injection Machine Report
            </button>
            <button
              onClick={() => setActiveTab('crusher')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === 'crusher' ? 'border-purple-600 text-purple-600 bg-purple-500/10' : 'border-transparent text-purple-600/70 hover:text-purple-600'}`}
            >
              <Recycle className="h-3.5 w-3.5" />
              Polymer & Crusher Report
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Daily Production */}
      {activeTab === 'daily' && (
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Daily Production Efficiency</CardTitle>
              <p className="text-xs text-muted-foreground">Detailed logs by shift, operator, good units, and standard cycle time achievement</p>
            </div>
            {dailyQuery.data?.totals && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>Total Good: <strong className="text-emerald-600">{Number(dailyQuery.data.totals.good_quantity).toLocaleString()}</strong></span>
                <span>Total Rejects: <strong className="text-rose-500">{Number(dailyQuery.data.totals.rejected_quantity).toLocaleString()}</strong></span>
                <span>Achievement: <strong>{dailyQuery.data.totals.achievement_percentage}%</strong></span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Shift</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Good Qty</TableHead>
                  <TableHead className="text-right">Rejects</TableHead>
                  <TableHead className="text-right">Running (min)</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Achievement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">Loading report...</TableCell>
                  </TableRow>
                ) : dailyQuery.data?.records && dailyQuery.data.records.length > 0 ? (
                  dailyQuery.data.records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground">{r.production_date}</span>
                        <span className="block text-[10px] text-muted-foreground capitalize">{r.shift}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{r.machine?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.operator_name || '—'}</TableCell>
                      <TableCell className="text-xs">{r.item?.item_name}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(r.good_quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-rose-500">
                        {Number(r.rejected_quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">{r.actual_running_minutes}m</TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">{Number(r.expected_quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold">
                        <span className={Number(r.achievement_percentage) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
                          {r.achievement_percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">No records in selected period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Target vs Actual */}
      {activeTab === 'target' && (
        <Card>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base font-semibold">Target vs. Actual & Raw Material Sufficiency</CardTitle>
            <p className="text-xs text-muted-foreground">Comparison between planned target quantity, produced good quantity, and component usage</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order / Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Planned Target</TableHead>
                  <TableHead className="text-right">Produced Good</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Achievement</TableHead>
                  <TableHead>Raw Material Consumption & Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Loading report...</TableCell>
                  </TableRow>
                ) : targetQuery.data && targetQuery.data.length > 0 ? (
                  targetQuery.data.map((row: any) => (
                    <TableRow key={row.order_number}>
                      <TableCell className="text-xs font-mono">
                        <span className="font-bold text-foreground">{row.order_number}</span>
                        <span className="block text-[10px] text-muted-foreground">{row.batch_number}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{row.item_name}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium">{row.planned_quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.produced_good_quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-mono font-semibold ${row.variance_quantity >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {row.variance_quantity > 0 ? `+${row.variance_quantity}` : row.variance_quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold">{row.achievement_pct}%</TableCell>
                      <TableCell className="text-xs">
                        {row.materials?.length > 0 ? (
                          <div className="space-y-1">
                            {row.materials.map((m: any, idx: number) => (
                              <div key={idx} className="text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground">{m.material_name}:</span> Std: {m.standard_consumed} | Act: {m.actual_consumed} | Wastage: {m.wastage}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">No materials consumed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No orders found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Daily Packing */}
      {activeTab === 'packing' && (
        <Card>
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Daily Packing Output</CardTitle>
              <p className="text-xs text-muted-foreground">Master cartons and loose pieces breakdown by batch</p>
            </div>
            {packingQuery.data?.totals && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>Total Cartons: <strong className="text-primary">{packingQuery.data.totals.master_cartons_count}</strong></span>
                <span>Packed Pieces: <strong>{packingQuery.data.totals.packed_quantity.toLocaleString()}</strong></span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Shift</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Packed Pieces</TableHead>
                  <TableHead className="text-right">Units / Carton</TableHead>
                  <TableHead className="text-right">Master Cartons</TableHead>
                  <TableHead className="text-right">Loose Pieces</TableHead>
                  <TableHead className="text-right">Rejects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packingQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Loading packing report...</TableCell>
                  </TableRow>
                ) : packingQuery.data?.records && packingQuery.data.records.length > 0 ? (
                  packingQuery.data.records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground">{r.packing_date}</span>
                        <span className="block text-[10px] text-muted-foreground capitalize">{r.shift}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.batch_number}</TableCell>
                      <TableCell className="text-xs font-medium">{r.item?.item_name}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-foreground">{Number(r.packed_quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">{r.units_per_carton}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-primary">{r.master_cartons_count} ctns</TableCell>
                      <TableCell className="text-right text-xs font-mono text-amber-600 dark:text-amber-400">{r.loose_pieces_count} pcs</TableCell>
                      <TableCell className="text-right text-xs font-mono text-rose-500">{Number(r.packing_rejected_quantity).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No packing entries found in period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Machine History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-base font-semibold">Machine Production Run History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Good Qty</TableHead>
                    <TableHead className="text-right">Rejects</TableHead>
                    <TableHead className="text-right">Achievement %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.production_history?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{e.production_date}</TableCell>
                      <TableCell className="text-xs font-medium">{e.machine?.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{e.batch_number}</TableCell>
                      <TableCell className="text-xs">{e.item?.item_name}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{Number(e.good_quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-rose-500">{Number(e.rejected_quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold">{e.achievement_percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-base font-semibold">Machine Stoppage & Downtime History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Stopped At</TableHead>
                    <TableHead>Restarted At</TableHead>
                    <TableHead className="text-right">Duration (min)</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.downtime_history?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs font-medium">{d.machine?.name}</TableCell>
                      <TableCell className="text-xs capitalize">{d.reason.replace('_', ' ')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(d.stopped_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.restarted_at ? new Date(d.restarted_at).toLocaleString() : 'Ongoing'}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{d.duration_minutes}m</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.remarks || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Injection Machine Report (Plastics Extension) */}
      {isPlasticsActive && activeTab === 'injection' && (
        <Card className="border-purple-500/30">
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Injection Machine Production Report
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Mould tracking, shot logs, cycle times, standard vs. actual cycle efficiency, and downtime
              </p>
            </div>
            {injectionQuery.data?.totals && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>Total Shots: <strong className="text-purple-600">{injectionQuery.data.totals.total_shots.toLocaleString()}</strong></span>
                <span>Actual Output: <strong className="text-emerald-600">{Number(injectionQuery.data.totals.total_actual_output).toLocaleString()} pcs</strong></span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Shift</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Mould & Cavities</TableHead>
                  <TableHead>Polymer & Color</TableHead>
                  <TableHead className="text-right">Shots</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual Output</TableHead>
                  <TableHead className="text-right">Cycle (Std / Act)</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead className="text-right">Downtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {injectionQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">Loading injection report...</TableCell>
                  </TableRow>
                ) : injectionQuery.data?.records && injectionQuery.data.records.length > 0 ? (
                  injectionQuery.data.records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <span className="font-medium">{r.production_date}</span>
                        <span className="block text-[10px] text-muted-foreground capitalize">{r.shift}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{r.machine_name}</TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground">{r.mould_name}</span>
                        <span className="block text-[10px] text-muted-foreground">{r.active_pieces_per_cycle} cav</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.polymer_name}
                        <span className="block text-[10px] text-muted-foreground">{r.color_variant}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                        {Number(r.number_of_shots).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">{Number(r.expected_output).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(r.actual_output).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {r.standard_cycle_sec}s / {r.actual_cycle_sec}s
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.is_above_standard ? 'success' : 'outline'}
                          className={!r.is_above_standard ? 'border-amber-500/40 text-amber-600 bg-amber-500/10' : ''}
                        >
                          {r.is_above_standard ? 'Above Std' : 'Below Std'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {r.downtime_minutes > 0 ? `${r.downtime_minutes}m` : '0m'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">No injection records found in period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Raw Material & Crusher Report (Plastics Extension) */}
      {isPlasticsActive && activeTab === 'crusher' && (
        <Card className="border-purple-500/30">
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Recycle className="h-5 w-5 text-purple-600" />
              Polymer Consumption & Crusher Regrind Balance
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Compares standard vs. actual polymer consumption, scrap sent to crusher, recovered regrind, net material loss, and closing reusable balances.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Polymer Raw Material</TableHead>
                  <TableHead className="text-right">Std. Consumed</TableHead>
                  <TableHead className="text-right">Actual Consumed</TableHead>
                  <TableHead className="text-right">Consumption Variance</TableHead>
                  <TableHead className="text-right">Scrap Sent to Crusher</TableHead>
                  <TableHead className="text-right">Recovered Regrind</TableHead>
                  <TableHead className="text-right">Net Crushing Loss</TableHead>
                  <TableHead className="text-right">Closing Regrind Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crusherQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Loading polymer report...</TableCell>
                  </TableRow>
                ) : crusherQuery.data?.comparison && crusherQuery.data.comparison.length > 0 ? (
                  crusherQuery.data.comparison.map((row: any) => (
                    <TableRow key={row.polymer_id}>
                      <TableCell className="text-xs font-semibold">{row.polymer_name}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{Number(row.standard_consumed_kg).toLocaleString()} kg</TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium">{Number(row.actual_consumed_kg).toLocaleString()} kg</TableCell>
                      <TableCell className={`text-right text-xs font-mono font-semibold ${row.consumption_variance_kg <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {row.consumption_variance_kg > 0 ? `+${row.consumption_variance_kg}` : row.consumption_variance_kg} kg
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">{Number(row.scrap_sent_to_crusher_kg).toLocaleString()} kg</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{Number(row.recovered_reusable_regrind_kg).toLocaleString()} kg
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-rose-500 font-semibold">
                        -{Number(row.net_crushing_loss_kg).toLocaleString()} kg
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                        {Number(row.closing_reusable_balance_kg).toLocaleString()} kg
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No polymer consumption or crusher records found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
