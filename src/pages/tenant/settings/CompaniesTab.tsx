import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchCompanies, createCompany, updateCompany, deleteCompany, type Company } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { useAuthStore } from '@/store/authStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MoreHorizontal, Building2, Check, Globe, Mail, Phone, MapPin } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  registration_number: z.string().optional(),
  tax_number: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CompaniesTab() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [page, setPage] = useState(1)
  const { activeCompanyId, setActiveCompanyId } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page],
    queryFn: () => fetchCompanies({ page }).then((r) => r.data),
  })

  const companies = data?.data ?? []

  const create = useMutation({
    mutationFn: (v: FormValues) => createCompany({
      name: v.name,
      email: v.email || null,
      phone: v.phone || null,
      website: v.website || null,
      address: v.address || null,
      registration_number: v.registration_number || null,
      tax_number: v.tax_number || null,
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setOpen(false)
    },
  })

  const update = useMutation({
    mutationFn: (v: FormValues) => updateCompany(editingCompany!.id, {
      name: v.name,
      email: v.email || null,
      phone: v.phone || null,
      website: v.website || null,
      address: v.address || null,
      registration_number: v.registration_number || null,
      tax_number: v.tax_number || null,
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setOpen(false)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (v: FormValues) => {
    if (editingCompany) {
      update.mutate(v)
    } else {
      create.mutate(v)
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    reset({
      name: company.name,
      email: company.email ?? '',
      phone: company.phone ?? '',
      website: company.website ?? '',
      address: company.address ?? '',
      registration_number: company.registration_number ?? '',
      tax_number: company.tax_number ?? '',
    })
    setOpen(true)
  }

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: 'name',
      header: 'Company Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
            <Building2 size={16} />
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {row.original.name}
              {activeCompanyId === row.original.id && (
                <Badge variant="success" className="h-4 px-1 text-[10px]">Active</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'registration_number',
      header: 'Reg #',
    },
    {
      accessorKey: 'tax_number',
      header: 'Tax #',
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
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreHorizontal size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveCompanyId(row.original.id)}>
                <Check size={14} className="mr-2" /> Set as Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>Edit Details</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this company?')) {
                    remove.mutate(row.original.id)
                  }
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Companies</h3>
          <p className="text-sm text-muted-foreground">Manage multi-company entities within your tenant</p>
        </div>
        <Button size="sm" onClick={() => { setEditingCompany(null); reset({ name: '', email: '', phone: '', website: '', address: '', registration_number: '', tax_number: '' }); setOpen(true) }}>
          Add Company
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={companies}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="name"
        filterPlaceholder="Search companies…"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="c-name">Company Name</Label>
                <Input id="c-name" {...register('name')} placeholder="e.g. Acme Corp" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="c-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="c-email" className="pl-8" {...register('email')} placeholder="office@acme.com" />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="c-phone" className="pl-8" {...register('phone')} placeholder="+1 234..." />
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="c-website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="c-website" className="pl-8" {...register('website')} placeholder="https://..." />
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="c-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="c-address" className="pl-8" {...register('address')} />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-reg">Reg. Number</Label>
                <Input id="c-reg" {...register('registration_number')} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-tax">Tax Number</Label>
                <Input id="c-tax" {...register('tax_number')} />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {editingCompany ? 'Save Changes' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
