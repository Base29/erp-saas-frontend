import apiClient from './client'

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface ImportWarning {
  row: number
  field: string
  message: string
}

export interface ImportValidationResult {
  headers: string[]
  total_rows: number
  valid_rows: number
  errors: ImportError[]
  warnings: ImportWarning[]
  preview: Array<Record<string, any>>
}

export interface ImportCommitResult {
  created?: number
  updated?: number
  customers_created?: number
  customers_updated?: number
  suppliers_created?: number
  suppliers_updated?: number
  bank_statement_id?: string
  lines_imported?: number
  vouchers_created?: number
  lines_created?: number
  opening_balances_recorded?: number
  [key: string]: any
}

export const validateImportFile = async (
  type: string,
  file: File,
  options?: Record<string, any>
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        formData.append(k, String(v))
      }
    })
  }

  const res = await apiClient.post<{ status: string; data: ImportValidationResult }>(
    '/v1/import/validate',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return res.data.data
}

export const commitImportFile = async (
  type: string,
  file: File,
  options?: Record<string, any>
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        formData.append(k, String(v))
      }
    })
  }

  const res = await apiClient.post<{ status: string; message: string; data: ImportCommitResult }>(
    '/v1/import/commit',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return res.data
}

export const downloadImportTemplate = async (type: string) => {
  const res = await apiClient.get(`/v1/import/templates/${type}`, {
    responseType: 'blob',
  })

  // Extract filename from header or fallback
  const contentDisposition = res.headers['content-disposition']
  let filename = `${type}_template.csv`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match && match[1]) {
      filename = match[1]
    }
  }

  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.parentNode?.removeChild(link)
  window.URL.revokeObjectURL(url)
}
