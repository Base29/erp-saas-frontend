import { useRef, useState, DragEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, Trash2, Upload } from 'lucide-react'
import { uploadAttachment, deleteAttachment, fetchAttachments } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AttachmentUploadProps {
  attachableType: string
  attachableId: string
  readonly?: boolean
}

export default function AttachmentUpload({ attachableType, attachableId, readonly }: AttachmentUploadProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const queryKey = ['attachments', attachableType, attachableId]

  const { data: attachments = [] } = useQuery({
    queryKey,
    queryFn: () => fetchAttachments(attachableType, attachableId).then((r) => r.data.data),
    enabled: !!attachableId,
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadAttachment(attachableType, attachableId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const validate = (file: File): string | null => {
    if (!ALLOWED_MIME.includes(file.type)) return 'File type not allowed. Use PDF, PNG, JPG, XLSX, or CSV.'
    if (file.size > MAX_SIZE_BYTES) return 'File exceeds 10 MB limit.'
    return null
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const err = validate(file)
    if (err) { setValidationError(err); return }
    setValidationError(null)
    upload.mutate(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {!readonly && (
        <>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, XLSX, CSV — max 10 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {validationError && <p className="text-xs text-destructive">{validationError}</p>}
          {upload.isPending && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {upload.isError && <p className="text-xs text-destructive">Upload failed. Please try again.</p>}
        </>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.original_filename}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatBytes(a.file_size_bytes)}</span>
              </div>
              {!readonly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
