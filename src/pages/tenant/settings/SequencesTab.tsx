import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSequences, updateSequence, type Sequence } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DataTable from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

export default function SequencesTab() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<Partial<Sequence>>({})
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['sequences', page],
    queryFn: () => fetchSequences({ page }).then((r) => r.data),
  })

  const sequences = data?.data ?? []

  const save = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Sequence> }) =>
      updateSequence(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
      setEditing(null)
    },
  })

  const startEdit = (seq: Sequence) => {
    setEditing(seq.id)
    setDraft({ prefix: seq.prefix, suffix: seq.suffix, next_number: seq.next_number, padding_length: seq.padding_length, reset_rule: seq.reset_rule })
  }

  const columns: ColumnDef<Sequence>[] = [
    { accessorKey: 'document_type', header: 'Document Type', cell: ({ row }) => <span className="font-mono text-xs">{row.original.document_type}</span> },
    {
      accessorKey: 'prefix',
      header: 'Prefix',
      cell: ({ row }) => {
        const isEditing = editing === row.original.id
        return isEditing ? (
          <Input className="h-7 w-20" value={draft.prefix ?? ''} onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value }))} />
        ) : row.original.prefix || '—'
      },
    },
    {
      accessorKey: 'suffix',
      header: 'Suffix',
      cell: ({ row }) => {
        const isEditing = editing === row.original.id
        return isEditing ? (
          <Input className="h-7 w-20" value={draft.suffix ?? ''} onChange={(e) => setDraft((d) => ({ ...d, suffix: e.target.value }))} />
        ) : row.original.suffix || '—'
      },
    },
    {
      accessorKey: 'next_number',
      header: 'Next #',
      cell: ({ row }) => {
        const isEditing = editing === row.original.id
        return isEditing ? (
          <Input className="h-7 w-24" type="number" min="1" value={draft.next_number ?? 1} onChange={(e) => setDraft((d) => ({ ...d, next_number: Number(e.target.value) }))} />
        ) : row.original.next_number
      },
    },
    {
      accessorKey: 'reset_rule',
      header: 'Reset',
      cell: ({ row }) => {
        const isEditing = editing === row.original.id
        return isEditing ? (
          <Select value={draft.reset_rule ?? 'never'} onValueChange={(v) => setDraft((d) => ({ ...d, reset_rule: v as Sequence['reset_rule'] }))}>
            <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        ) : row.original.reset_rule
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isEditing = editing === row.original.id
        return (
          <div className="flex gap-1 justify-end">
            {isEditing ? (
              <>
                <Button size="sm" onClick={() => save.mutate({ id: row.original.id, payload: draft })} disabled={save.isPending}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => startEdit(row.original)}>Edit</Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Configure document numbering sequences.</p>
      <DataTable
        columns={columns}
        data={sequences}
        isLoading={isLoading}
        pagination={data ? { page, per_page: data.per_page, total: data.total } : undefined}
        onPageChange={setPage}
        filterKey="document_type"
        filterPlaceholder="Search by type…"
      />
    </div>
  )
}
