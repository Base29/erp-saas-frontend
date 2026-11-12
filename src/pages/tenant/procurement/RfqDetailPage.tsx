import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Send,
  Plus,
  Trophy,
  CheckCircle2,
  Building2,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { procurementApi, type Rfq } from '@/api/procurement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/utils/format'
import SupplierQuoteModal from './components/SupplierQuoteModal'
import RfqModal from './components/RfqModal'

export default function RfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)

  const { data: rfqRes, isLoading } = useQuery({
    queryKey: ['rfq-detail', id],
    queryFn: () => procurementApi.getRfq(id!),
    enabled: Boolean(id),
  })

  const { data: matrixRes } = useQuery({
    queryKey: ['rfq-comparison-matrix', id],
    queryFn: () => procurementApi.getRfqComparisonMatrix(id!),
    enabled: Boolean(id),
  })

  const rfq: Rfq | undefined = rfqRes?.data
  const matrixData = matrixRes?.data

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading RFQ tender...</div>
  }

  if (!rfq) {
    return (
      <div className="p-8 text-center text-destructive">
        RFQ not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/procurement/rfqs')}>
            Back to RFQs
          </Button>
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    if (!id) return
    await procurementApi.sendRfq(id)
    qc.invalidateQueries({ queryKey: ['rfq-detail', id] })
  }

  const handleClose = async () => {
    if (!id) return
    await procurementApi.closeRfq(id)
    qc.invalidateQueries({ queryKey: ['rfq-detail', id] })
  }

  const handleAward = async (quotationId: string) => {
    if (!id) return
    setIsAwarding(true)
    try {
      const res = await procurementApi.awardRfqQuotation(id, quotationId)
      qc.invalidateQueries({ queryKey: ['rfq-detail', id] })
      qc.invalidateQueries({ queryKey: ['rfq-comparison-matrix', id] })
      const poId = res.data?.purchase_order?.id
      if (poId) {
        navigate(`/procurement/orders/${poId}`)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to award quotation.')
    } finally {
      setIsAwarding(false)
    }
  }

  const suppliers = matrixData?.suppliers || []
  const matrix = matrixData?.matrix || []

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/procurement/rfqs')}
            className="h-9 w-9 text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {rfq.rfq_number}
              </h1>
              <Badge
                className={
                  rfq.status === 'sent'
                    ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                    : rfq.status === 'closed'
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {rfq.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground mt-0.5">{rfq.title}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {rfq.status === 'draft' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="text-xs">
                Edit RFQ
              </Button>
              <Button size="sm" onClick={handleSend} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                <Send className="h-4 w-4" /> Send to Vendors
              </Button>
            </>
          )}

          {rfq.status === 'sent' && (
            <>
              <Button
                size="sm"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                onClick={() => setQuoteModalOpen(true)}
              >
                <Plus className="h-4 w-4" /> Record Supplier Quote
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs text-muted-foreground">
                Close RFQ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Sourcing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issued Date:</span>
              <span className="font-medium text-foreground">{formatDate(rfq.rfq_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bid Deadline:</span>
              <span className="font-medium text-foreground">
                {rfq.bid_deadline ? formatDate(rfq.bid_deadline) : 'Flexible'}
              </span>
            </div>
            {rfq.requisition && (
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground">Requisition:</span>
                <button
                  onClick={() => navigate(`/procurement/requisitions/${rfq.requisition?.id}`)}
                  className="font-mono text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  {rfq.requisition.requisition_number}
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Invited Vendors ({rfq.invitedSuppliers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs max-h-32 overflow-y-auto">
            {(rfq.invitedSuppliers || []).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-0.5">
                <span className="font-medium text-foreground">{s.supplier?.name}</span>
                <Badge
                  variant="outline"
                  className={
                    s.invitation_status === 'responded'
                      ? 'text-emerald-600 border-emerald-500/30 font-mono text-[10px]'
                      : 'text-muted-foreground font-mono text-[10px]'
                  }
                >
                  {s.invitation_status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Bidding Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bids Received:</span>
              <span className="font-bold text-foreground">{suppliers.length} Quote(s)</span>
            </div>
            {suppliers.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lowest Total Offer:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatCurrency(Math.min(...suppliers.map((s: any) => s.total_amount)))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quotation Comparison Matrix */}
      <Card className="border-indigo-500/20">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Supplier Quotation Comparison Matrix
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Side-by-side pricing, lead time, and payment term evaluation. Lowest unit prices are highlighted in green.
            </p>
          </div>
          {suppliers.length > 0 && rfq.status === 'sent' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuoteModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Quote
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {suppliers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              No supplier quotations recorded yet.
              {rfq.status === 'sent' && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => setQuoteModalOpen(true)} className="gap-1.5 text-xs">
                    <Plus className="h-4 w-4" /> Record First Vendor Quote
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3 text-left w-64 border-r">Requested Items</th>
                    <th className="p-3 text-right w-20 border-r">Target Price</th>
                    {suppliers.map((s: any) => (
                      <th key={s.quotation_id} className="p-3 text-center border-r last:border-r-0 min-w-[200px]">
                        <div className="font-bold text-foreground text-sm">{s.supplier_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {s.quotation_number} {s.payment_terms ? `• ${s.payment_terms}` : ''}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrix.map((row: any) => (
                    <tr key={row.rfq_line_id} className="hover:bg-muted/20">
                      <td className="p-3 border-r font-medium">
                        <div className="text-foreground">{row.item_description}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">Qty: {row.quantity}</div>
                      </td>
                      <td className="p-3 text-right font-mono border-r text-muted-foreground">
                        {row.target_price ? formatCurrency(row.target_price) : '-'}
                      </td>
                      {suppliers.map((s: any) => {
                        const quoteLine = row.quotes[s.quotation_id]
                        if (!quoteLine || quoteLine.unit_price === null) {
                          return (
                            <td key={s.quotation_id} className="p-3 text-center text-muted-foreground border-r last:border-r-0 italic">
                              Not Quoted
                            </td>
                          )
                        }

                        return (
                          <td
                            key={s.quotation_id}
                            className={`p-3 text-right border-r last:border-r-0 ${
                              quoteLine.is_lowest ? 'bg-emerald-500/10 font-bold' : ''
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1.5 font-mono text-sm">
                              {quoteLine.is_lowest && (
                                <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-sans uppercase font-bold tracking-wider">
                                  Best
                                </span>
                              )}
                              <span>{formatCurrency(quoteLine.unit_price)}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Total: <span className="font-mono text-foreground">{formatCurrency(quoteLine.line_total)}</span> • {quoteLine.lead_time_days} days
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>

                {/* Matrix Summary Footer */}
                <tfoot className="bg-muted/50 border-t font-semibold divide-y divide-border">
                  <tr>
                    <td className="p-3 border-r font-bold text-foreground">Total Quoted Value</td>
                    <td className="p-3 border-r text-right font-mono text-muted-foreground">-</td>
                    {suppliers.map((s: any) => (
                      <td key={s.quotation_id} className="p-3 text-right border-r last:border-r-0">
                        <div className="text-base font-bold font-mono text-foreground">
                          {formatCurrency(s.total_amount)}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          Lead: {s.lead_time_days} days
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 border-r font-bold text-foreground">Award / Decision</td>
                    <td className="p-3 border-r text-right">-</td>
                    {suppliers.map((s: any) => (
                      <td key={s.quotation_id} className="p-3 text-center border-r last:border-r-0">
                        {s.awarded ? (
                          <Badge className="bg-emerald-600 text-white gap-1 py-1 px-3">
                            <Trophy className="h-3 w-3" /> Awarded Winner
                          </Badge>
                        ) : rfq.status === 'sent' ? (
                          <Button
                            size="sm"
                            disabled={isAwarding}
                            onClick={() => handleAward(s.quotation_id)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Award Quote & Create PO
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            {s.status}
                          </Badge>
                        )}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SupplierQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        onSuccess={() => {
          setQuoteModalOpen(false)
          qc.invalidateQueries({ queryKey: ['rfq-detail', id] })
          qc.invalidateQueries({ queryKey: ['rfq-comparison-matrix', id] })
        }}
        rfq={rfq}
      />

      <RfqModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false)
          qc.invalidateQueries({ queryKey: ['rfq-detail', id] })
        }}
        rfq={rfq}
      />
    </div>
  )
}
