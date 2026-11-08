import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react'
import { previewAttachment, downloadAttachment } from '@/api/tenant'

interface AttachmentPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachmentId: string | null
  filename: string
  mimeType?: string
}

export default function AttachmentPreviewModal({
  open,
  onOpenChange,
  attachmentId,
  filename,
  mimeType,
}: AttachmentPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [detectedType, setDetectedType] = useState<string>('')

  useEffect(() => {
    let activeUrl: string | null = null

    if (open && attachmentId) {
      setLoading(true)
      setError(null)
      previewAttachment(attachmentId)
        .then(({ blob, contentType }) => {
          const type = mimeType || contentType || blob.type
          setDetectedType(type)
          const url = URL.createObjectURL(blob)
          activeUrl = url
          setObjectUrl(url)
        })
        .catch((err) => {
          console.error('Preview error:', err)
          setError('Failed to load attachment preview.')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setObjectUrl(null)
      setError(null)
    }

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl)
      }
    }
  }, [open, attachmentId, mimeType])

  const isPdf = detectedType.includes('pdf') || filename.toLowerCase().endsWith('.pdf')
  const isImage = detectedType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(filename)

  const handleDownload = () => {
    if (attachmentId) {
      downloadAttachment(attachmentId, filename)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 rounded-2xl border-border/70 bg-card/95 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2.5 overflow-hidden mr-4">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <DialogTitle className="truncate text-base font-semibold text-foreground">{filename}</DialogTitle>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs rounded-xl" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 text-primary" />
            Download
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-auto my-3 min-h-[400px] flex items-center justify-center bg-muted/20 backdrop-blur-md rounded-xl border border-border/60">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading document preview…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-destructive p-8 text-center max-w-md">
              <AlertCircle className="h-8 w-8" />
              <p className="text-xs font-medium">{error}</p>
              <Button variant="secondary" size="sm" onClick={handleDownload} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Download file directly
              </Button>
            </div>
          )}

          {!loading && !error && objectUrl && (
            <>
              {isPdf && (
                <iframe
                  src={objectUrl}
                  title={filename}
                  className="w-full h-[72vh] rounded-xl border-none"
                />
              )}

              {isImage && (
                <div className="p-4 flex items-center justify-center w-full h-full">
                  <img
                    src={objectUrl}
                    alt={filename}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-elevated"
                  />
                </div>
              )}

              {!isPdf && !isImage && (
                <div className="flex flex-col items-center gap-3 p-8 text-center max-w-md">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">In-system preview not available</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Spreadsheets and binary files must be opened in their respective desktop applications.
                    </p>
                  </div>
                  <Button onClick={handleDownload} size="sm" className="gap-2 mt-2">
                    <Download className="h-4 w-4" />
                    Download {filename}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border/70 flex justify-end">
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
