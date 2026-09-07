import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Users,
  Building2,
  RefreshCcw,
  FileSpreadsheet,
  Download,
  Upload,
  ExternalLink,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import BulkImportModal from '@/components/import/BulkImportModal'
import { downloadImportTemplate } from '@/api/import'
import { useQuery } from '@tanstack/react-query'
import { fetchAccounts } from '@/api/tenant'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function DataMigrationPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('')
  const [customerVendorType, setCustomerVendorType] = useState<string>('customer')
  const [updateExistingAccounts, setUpdateExistingAccounts] = useState<boolean>(true)

  // Load bank accounts for bank statement upload
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', { is_active: 1 }],
    queryFn: () => fetchAccounts({ is_active: 1, per_page: 200 }).then((r) => r.data),
  })

  const bankAccounts = (accountsData?.data ?? []).filter((a) => {
    const cat = (a.account_category?.name ?? '').toLowerCase()
    return cat.includes('bank') || cat.includes('cash') || a.account_code.startsWith('111')
  })

  const handleDownload = async (type: string) => {
    try {
      await downloadImportTemplate(type)
      toast.success('Template downloaded successfully')
    } catch {
      toast.error('Failed to download template')
    }
  }

  const migrationCards = [
    {
      id: 'accounts',
      title: 'Chart of Accounts',
      icon: BookOpen,
      badge: 'CSV',
      description: 'Import ledger account codes, categories, GST tax codes, descriptions, and opening balances.',
      destinationUrl: '/accounts/chart-of-accounts',
      destinationLabel: 'View Chart of Accounts',
      templateType: 'accounts',
    },
    {
      id: 'customers',
      title: 'Customers & Vendors',
      icon: Users,
      badge: 'CSV',
      description: 'Import customer profiles, supplier master records, addresses, tax NTN, payment terms, and contacts.',
      destinationUrl: '/sales/customers',
      destinationLabel: 'View Customers & Suppliers',
      templateType: 'customers',
    },
    {
      id: 'bank_statements',
      title: 'Bank Statements',
      icon: RefreshCcw,
      badge: 'CSV',
      description: 'Import bank statement lines with dates, debits, credits, payees, and check numbers for reconciliation.',
      destinationUrl: '/accounts/bank-reconciliation',
      destinationLabel: 'View Bank Reconciliation',
      templateType: 'bank_statements',
    },
    {
      id: 'manual_journals',
      title: 'Manual Journals',
      icon: FileSpreadsheet,
      badge: 'CSV',
      description: 'Import multi-line balanced journal entries with automated zero-sum debit/credit balance validation.',
      destinationUrl: '/accounts/journal-vouchers',
      destinationLabel: 'View Journal Vouchers',
      templateType: 'manual_journal',
    },
    {
      id: 'general_ledger',
      title: 'General Ledger Migration',
      icon: Building2,
      badge: 'XLSX / CSV',
      description: 'Comprehensive historical general ledger transactions migration with balancing accounts and dimensions.',
      destinationUrl: '/accounts/reports/general-ledger',
      destinationLabel: 'View General Ledger',
      templateType: 'general_ledger',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Data Migration Hub</h1>
          <Badge variant="outline" className="text-xs">Bulk Upload</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Seamlessly migrate and bulk upload your historical and setup data using standardized templates.
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Migration Best Practices</p>
          <p>
            1. We recommend importing in sequence: <strong>Chart of Accounts</strong> first, followed by <strong>Customers & Vendors</strong>, and then <strong>Journals / Historical General Ledger</strong>.
          </p>
          <p>
            2. Every file undergoes a safe dry-run validation check before committing, so you can preview rows and inspect any formatting errors without corrupting existing records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {migrationCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    {card.badge}
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-3">{card.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-3 leading-relaxed">
                  {card.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={() => handleDownload(card.templateType)}
                  >
                    <Download className="h-3.5 w-3.5" /> Template
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={() => setActiveModal(card.id)}
                  >
                    <Upload className="h-3.5 w-3.5" /> Bulk Upload
                  </Button>
                </div>

                <div className="pt-2 border-t flex justify-end">
                  <Link
                    to={card.destinationUrl}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    {card.destinationLabel} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart of Accounts Modal */}
      <BulkImportModal
        open={activeModal === 'accounts'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        type="accounts"
        title="Import Chart of Accounts"
        description="Upload CSV to insert or update ledger accounts, categories, and opening balances."
        extraFields={
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Update Existing Accounts</Label>
              <p className="text-[11px] text-muted-foreground">If checked, existing account codes will have their names and categories updated.</p>
            </div>
            <input
              type="checkbox"
              checked={updateExistingAccounts}
              onChange={(e) => setUpdateExistingAccounts(e.target.checked)}
              className="h-4 w-4 rounded"
            />
          </div>
        }
        getExtraOptions={() => ({ update_existing: updateExistingAccounts ? '1' : '0' })}
      />

      {/* Customers & Vendors Modal */}
      <BulkImportModal
        open={activeModal === 'customers'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        type="customers"
        title="Import Customers & Vendors"
        description="Upload CSV containing customers or suppliers. Rows are classified by the Type column."
        extraFields={
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Default Contact Type (if Type column is blank)</Label>
            <Select value={customerVendorType} onValueChange={setCustomerVendorType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor / Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        getExtraOptions={() => ({ default_type: customerVendorType })}
      />

      {/* Bank Statements Modal */}
      <BulkImportModal
        open={activeModal === 'bank_statements'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        type="bank_statements"
        title="Import Bank Statement"
        description="Select the destination bank account and upload CSV containing transactions."
        extraFields={
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Destination Bank Account *</Label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select bank account…" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_code} - {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        getExtraOptions={() => ({ bank_account_id: selectedBankAccountId })}
      />

      {/* Manual Journals Modal */}
      <BulkImportModal
        open={activeModal === 'manual_journals'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        type="manual_journal"
        title="Import Manual Journals"
        description="Upload CSV containing balanced journal voucher entries. Debits and credits must balance to zero."
      />

      {/* General Ledger Migration Modal */}
      <BulkImportModal
        open={activeModal === 'general_ledger'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        type="general_ledger"
        title="Import General Ledger Historical Postings"
        description="Upload Excel (.xlsx) or CSV containing historical GL migration lines."
      />
    </div>
  )
}
