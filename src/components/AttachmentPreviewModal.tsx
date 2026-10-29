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
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 overflow-hidden mr-4">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <DialogTitle className="truncate text-base">{filename}</DialogTitle>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-auto my-3 min-h-[400px] flex items-center justify-center bg-muted/20 rounded-md border">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading document preview…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-destructive p-8 text-center max-w-md">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="secondary" size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="h-4 w-4" />
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
                  className="w-full h-[72vh] rounded border-none"
                />
              )}

              {isImage && (
                <div className="p-4 flex items-center justify-center w-full h-full">
                  <img
                    src={objectUrl}
                    alt={filename}
                    className="max-h-[70vh] max-w-full object-contain rounded shadow-sm"
                  />
                </div>
              )}

              {!isPdf && !isImage && (
                <div className="flex flex-col items-center gap-3 p-8 text-center max-w-md">
                  <FileText className="h-12 w-12 text-muted-foreground/60" />
                  <div>
                    <h3 className="font-medium text-foreground">In-system preview not available</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Spreadsheets and other binary documents must be opened in their respective desktop applications.
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="gap-2 mt-2">
                    <Download className="h-4 w-4" />
                    Download {filename}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-2 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
