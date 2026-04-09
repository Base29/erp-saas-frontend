import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSequences, updateSequence, type Sequence } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences'],
    queryFn: () => fetchSequences().then((r) => r.data.data),
  })

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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Configure document numbering sequences.</p>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Document Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prefix</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Suffix</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Next #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reset</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sequences.map((seq) => {
              const isEditing = editing === seq.id
              return (
                <tr key={seq.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{seq.document_type}</td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <Input className="h-7 w-20" value={draft.prefix ?? ''} onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value }))} />
                    ) : seq.prefix || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <Input className="h-7 w-20" value={draft.suffix ?? ''} onChange={(e) => setDraft((d) => ({ ...d, suffix: e.target.value }))} />
                    ) : seq.suffix || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <Input className="h-7 w-24" type="number" min="1" value={draft.next_number ?? 1} onChange={(e) => setDraft((d) => ({ ...d, next_number: Number(e.target.value) }))} />
                    ) : seq.next_number}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <Select value={draft.reset_rule ?? 'never'} onValueChange={(v) => setDraft((d) => ({ ...d, reset_rule: v as Sequence['reset_rule'] }))}>
                        <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Never</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : seq.reset_rule}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => save.mutate({ id: seq.id, payload: draft })} disabled={save.isPending}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(seq)}>Edit</Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
