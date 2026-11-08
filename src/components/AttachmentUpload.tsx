import { useRef, useState, DragEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, Trash2, Upload, FileText, Loader2 } from 'lucide-react'
import { uploadAttachment, deleteAttachment, fetchAttachments, downloadAttachment, type Attachment } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import AttachmentPreviewModal from '@/components/AttachmentPreviewModal'

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
  const [previewItem, setPreviewItem] = useState<Attachment | null>(null)

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
    <div className="space-y-3.5">
      {!readonly && (
        <>
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 bg-card/40 backdrop-blur-md',
              dragOver
                ? 'border-primary bg-primary/10 -translate-y-1 shadow-[0_12px_30px_0_rgba(79,70,229,0.15)]'
                : 'border-border/70 hover:border-primary/50 hover:bg-card/70 hover:-translate-y-0.5'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2.5 transition-transform group-hover:scale-110">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              Drag & drop or <span className="text-primary hover:underline">browse</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">PDF, PNG, JPG, XLSX, CSV — max 10 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {validationError && (
            <p className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
              {validationError}
            </p>
          )}
          {upload.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Uploading attachment…</span>
            </div>
          )}
          {upload.isError && (
            <p className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
              Upload failed. Please try again.
            </p>
          )}
        </>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 backdrop-blur-md px-3 py-2 text-xs hover:border-primary/30 transition-all duration-150"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="truncate font-medium text-foreground">{a.original_filename}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono tabular-nums">
                  {formatBytes(a.file_size_bytes)}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                  title="Preview attachment"
                  onClick={() => setPreviewItem(a)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="sr-only">Preview</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                  title="Download attachment"
                  onClick={() => downloadAttachment(a.id, a.original_filename)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="sr-only">Download</span>
                </Button>
                {!readonly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                    title="Delete attachment"
                    onClick={() => remove.mutate(a.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {previewItem && (
        <AttachmentPreviewModal
          open={!!previewItem}
          onOpenChange={(o) => !o && setPreviewItem(null)}
          attachmentId={previewItem.id}
          filename={previewItem.original_filename}
          mimeType={previewItem.mime_type}
        />
      )}
    </div>
  )
}
