import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Download,
  UploadCloud,
  FileSpreadsheet,
  Check,
  Loader2,
  X,
} from 'lucide-react'
import {
  validateImportFile,
  commitImportFile,
  downloadImportTemplate,
  type ImportValidationResult,
} from '@/api/import'
import ImportPreviewTable from './ImportPreviewTable'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: string
  title: string
  description?: string
  extraFields?: React.ReactNode
  extraOptions?: Record<string, any>
  getExtraOptions?: () => Record<string, any>
  onSuccess?: (res: any) => void
}

export default function BulkImportModal({
  open,
  onOpenChange,
  type,
  title,
  description,
  extraFields,
  extraOptions,
  getExtraOptions,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const extraOptionsRef = React.useRef<Record<string, any> | undefined>(extraOptions)
  extraOptionsRef.current = extraOptions

  const getExtraOptionsRef = React.useRef(getExtraOptions)
  getExtraOptionsRef.current = getExtraOptions

  // Track the unique key of file + options last validated to prevent looping
  const lastValidatedKeyRef = React.useRef<string>('')

  const runValidation = React.useCallback(
    async (selectedFile: File, optionsKey: string) => {
      if (lastValidatedKeyRef.current === optionsKey) {
        return
      }
      lastValidatedKeyRef.current = optionsKey

      setIsValidating(true)
      try {
        const extra = extraOptionsRef.current ?? (getExtraOptionsRef.current ? getExtraOptionsRef.current() : {})
        const res = await validateImportFile(type, selectedFile, extra)
        setValidationResult(res)
        if (res.errors.length === 0) {
          toast.success(`Validated ${res.total_rows} rows successfully`, { id: 'import-validation' })
        } else {
          toast.error(`Validation found ${res.errors.length} error${res.errors.length > 1 ? 's' : ''}`, { id: 'import-validation' })
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to validate file', { id: 'import-validation' })
      } finally {
        setIsValidating(false)
      }
    },
    [type]
  )

  // Reset states when closed
  React.useEffect(() => {
    if (!open) {
      setFile(null)
      setValidationResult(null)
      setIsValidating(false)
      setIsCommitting(false)
      lastValidatedKeyRef.current = ''
    }
  }, [open])

  // Re-run validation ONLY when extraOptions actually changes while a file is already loaded
  const extraOptionsSerialized = JSON.stringify(extraOptions ?? {})
  React.useEffect(() => {
    if (!open || !file) return
    const key = `${file.name}_${file.size}_${file.lastModified}_${extraOptionsSerialized}`
    if (key !== lastValidatedKeyRef.current) {
      runValidation(file, key)
    }
  }, [extraOptionsSerialized, file, open, runValidation])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setValidationResult(null)
    const extra = extraOptionsRef.current ?? (getExtraOptionsRef.current ? getExtraOptionsRef.current() : {})
    const key = `${selected.name}_${selected.size}_${selected.lastModified}_${JSON.stringify(extra)}`
    runValidation(selected, key)
  }

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    try {
      await downloadImportTemplate(type)
      toast.success('Template downloaded successfully')
    } catch (err: any) {
      toast.error('Failed to download template')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCommit = async () => {
    if (!file) return

    setIsCommitting(true)
    try {
      const extra = extraOptions ?? (getExtraOptions ? getExtraOptions() : {})
      const res = await commitImportFile(type, file, extra)
      toast.success(res.message || 'Data imported successfully')
      onOpenChange(false)
      if (onSuccess) {
        onSuccess(res.data)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Import failed')
    } finally {
      setIsCommitting(false)
    }
  }

  const canCommit =
    file &&
    validationResult &&
    validationResult.errors.length === 0 &&
    !isValidating &&
    !isCommitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <div>
              <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {description || 'Upload a CSV or Excel file to bulk insert or update records.'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download Template
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {extraFields && <div className="p-3 bg-muted/40 rounded-lg border">{extraFields}</div>}

          {/* Upload Drop Area */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform mb-2">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Click or drag & drop file to upload</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv and .xlsx files (up to 20MB)</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/60 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {isValidating ? 'Validating…' : 'Ready'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setFile(null)
                  setValidationResult(null)
                }}
                disabled={isValidating || isCommitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isValidating && (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Validating file rows and columns…
            </div>
          )}

          {validationResult && (
            <ImportPreviewTable
              headers={validationResult.headers}
              rows={validationResult.preview}
              errors={validationResult.errors}
              warnings={validationResult.warnings}
            />
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {validationResult && (
              <span>
                Total Rows: <strong>{validationResult.total_rows}</strong> | Valid: <strong>{validationResult.valid_rows}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isCommitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCommit}
              disabled={!canCommit}
              className="gap-1.5"
            >
              {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isCommitting ? 'Importing…' : 'Start Import'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
