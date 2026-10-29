import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  BookOpen,
  Edit,
} from 'lucide-react'
import {
  fetchPurchaseInvoices,
  fetchSupplierPayments,
  type Supplier,
} from '@/api/tenant'
import { format } from 'date-fns'

interface SupplierProfileDrawerProps {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (supplier: Supplier) => void
}

export default function SupplierProfileDrawer({
  supplier,
  open,
  onOpenChange,
  onEdit,
}: SupplierProfileDrawerProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')

  const supplierId = supplier?.id

  // Fetch recent invoices
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['supplier-invoices', supplierId],
    queryFn: () => fetchPurchaseInvoices({ supplier_id: supplierId!, per_page: 15 }).then((r) => r.data),
    enabled: open && !!supplierId,
  })

  // Fetch recent payments
  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: () => fetchSupplierPayments({ supplier_id: supplierId!, per_page: 15 }).then((r) => r.data),
    enabled: open && !!supplierId,
  })

  const invoices = invoicesData?.data ?? []
  const payments = paymentsData?.data ?? []

  if (!supplier) return null

  const balance = Number(supplier.current_balance ?? 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {supplier.name}
                  <Badge variant={supplier.is_active ? 'success' : 'secondary'} className="text-[10px]">
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </DialogTitle>
                <p className="text-xs font-mono text-muted-foreground">Code: {supplier.supplier_code}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onEdit(supplier)}
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2 text-xs">
          {/* Top Balance & Quick Action Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Current Balance Due
              </span>
              <span className="text-2xl font-bold font-mono text-primary mt-1">
                ${balance.toFixed(2)}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">
                Net amount currently payable to this vendor
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-muted/10 space-y-1.5 col-span-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block mb-2">
                Contact & Accounting Info
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{supplier.email || 'No email on file'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{supplier.phone || 'No phone on file'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground col-span-2 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{supplier.address || 'No address provided'}</span>
                </div>
                {supplier.tax_number && (
                  <div className="text-muted-foreground col-span-2">
                    Tax / VAT #: <span className="font-mono text-foreground font-medium">{supplier.tax_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                onOpenChange(false)
                navigate(`/accounts/reports/supplier-statement?supplier_id=${supplier.id}`)
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              View Full Statement / Ledger
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                onOpenChange(false)
                navigate('/accounts/supplier-payments/new')
              }}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Record Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                onOpenChange(false)
                navigate('/accounts/purchase-invoices/new')
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Purchase Invoice
            </Button>
          </div>

          {/* Tabs for Recent Transactions */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex border-b bg-muted/20 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`py-2 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'invoices'
                    ? 'border-primary text-primary bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Recent Invoices ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`py-2 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'payments'
                    ? 'border-primary text-primary bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Recent Payments ({payments.length})
              </button>
            </div>

            <div className="p-3">
              {activeTab === 'invoices' && (
                <div>
                  {loadingInvoices ? (
                    <p className="text-center py-4 text-muted-foreground">Loading invoices…</p>
                  ) : invoices.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No purchase invoices on record.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground border-b text-[11px]">
                        <tr>
                          <th className="py-2 text-left">Invoice #</th>
                          <th className="py-2 text-left">Date</th>
                          <th className="py-2 text-left">Posting</th>
                          <th className="py-2 text-right">Total</th>
                          <th className="py-2 text-right">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-muted/10">
                            <td className="py-2 font-medium">{inv.invoice_number}</td>
                            <td className="py-2 text-muted-foreground">
                              {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="py-2">
                              <Badge variant={inv.posting_status === 'posted' ? 'success' : 'warning'} className="text-[9px] uppercase">
                                {inv.posting_status || 'unposted'}
                              </Badge>
                            </td>
                            <td className="py-2 text-right font-mono">${Number(inv.total_amount).toFixed(2)}</td>
                            <td className="py-2 text-right font-mono font-medium text-amber-600">
                              ${Number(inv.balance_due ?? inv.total_amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div>
                  {loadingPayments ? (
                    <p className="text-center py-4 text-muted-foreground">Loading payments…</p>
                  ) : payments.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No payments recorded yet.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground border-b text-[11px]">
                        <tr>
                          <th className="py-2 text-left">Date</th>
                          <th className="py-2 text-left">Reference</th>
                          <th className="py-2 text-left">Bank / Cash</th>
                          <th className="py-2 text-left">Posting</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/10">
                            <td className="py-2 text-muted-foreground">
                              {p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="py-2 font-medium">{p.payment_reference || '—'}</td>
                            <td className="py-2 text-muted-foreground">{p.bank_account?.account_name || '—'}</td>
                            <td className="py-2">
                              <Badge variant={p.posting_status === 'posted' ? 'success' : 'warning'} className="text-[9px] uppercase">
                                {p.posting_status || 'unposted'}
                              </Badge>
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-emerald-600">
                              ${Number(p.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
