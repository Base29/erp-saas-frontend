import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Layers,
  Calendar,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { procurementApi, type Rfq } from '@/api/procurement'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatDate } from '@/utils/format'
import RfqModal from './components/RfqModal'

export default function RfqsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['rfqs-list', searchTerm, statusFilter],
    queryFn: () =>
      procurementApi.getRfqs({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        per_page: 50,
      }),
  })

  const rfqs: Rfq[] = data?.data || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Sent / Open</Badge>
      case 'closed':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Awarded & Closed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" /> Sourcing & RFQs
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage Requests for Quotations, invite multiple vendor bids, and compare proposals.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> New RFQ
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by RFQ #, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('')}
                className="text-xs h-9"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
                className="text-xs h-9"
              >
                Draft
              </Button>
              <Button
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('sent')}
                className="text-xs h-9"
              >
                Sent
              </Button>
              <Button
                variant={statusFilter === 'closed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('closed')}
                className="text-xs h-9"
              >
                Closed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">Requests for Quotations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="p-3 text-left">RFQ #</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Deadline</th>
                  <th className="p-3 text-center">Invited</th>
                  <th className="p-3 text-center">Bids Received</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading sourcing tenders...
                    </td>
                  </tr>
                ) : rfqs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No Requests for Quotation found. Click "New RFQ" to begin sourcing.
                    </td>
                  </tr>
                ) : (
                  rfqs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      onClick={() => navigate(`/procurement/rfqs/${rfq.id}`)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-medium text-foreground">{rfq.rfq_number}</td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{rfq.title}</div>
                        {rfq.requisition && (
                          <span className="text-[11px] text-muted-foreground">
                            PR: {rfq.requisition.requisition_number}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(rfq.rfq_date)}</td>
                      <td className="p-3">
                        {rfq.bid_deadline ? (
                          <span className="font-mono text-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(rfq.bid_deadline)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Flexible</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {rfq.invited_suppliers_count || 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                          <FileText className="h-3 w-3" />
                          {rfq.quotations_count || 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">{getStatusBadge(rfq.status)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                          View Matrix <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <RfqModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          qc.invalidateQueries({ queryKey: ['rfqs-list'] })
        }}
      />
    </div>
  )
}
