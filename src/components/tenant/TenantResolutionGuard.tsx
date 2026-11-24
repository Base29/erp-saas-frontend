import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { getSubdomain } from '@/utils/subdomain'
import { apiClient } from '@/api/client'
import { setAppVersion } from '@/utils/version'
import TenantNotFoundPage from '@/pages/tenant/TenantNotFoundPage'

export interface TenantInfo {
  valid: boolean
  name: string
  subdomain: string
  status: string
  version?: string
}

export default function TenantResolutionGuard() {
  const subdomain = getSubdomain()
  const [resolution, setResolution] = useState<'checking' | 'valid' | 'not_found'>('checking')
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)

  useEffect(() => {
    // If not on a tenant subdomain (e.g. control plane, raw IP, or base domain), bypass
    if (!subdomain) {
      setResolution('valid')
      return
    }

    let isMounted = true

    apiClient
      .get<TenantInfo>('/v1/auth/tenant-info', {
        headers: {
          'X-Tenant-Subdomain': subdomain,
        },
      })
      .then((res) => {
        if (!isMounted) return
        setTenantInfo(res.data)
        if (res.data?.version) {
          setAppVersion(res.data.version)
        }
        setResolution('valid')
      })
      .catch((err) => {
        if (!isMounted) return
        const status = err.response?.status
        const msg = err.response?.data?.message
        if (status === 404 || msg === 'Tenant not found.') {
          setResolution('not_found')
        } else {
          // If server error or unauthenticated, the tenant connection check succeeded!
          // Only true 404 means the tenant does not exist.
          setResolution('valid')
        }
      })

    return () => {
      isMounted = false
    }
  }, [subdomain])

  if (resolution === 'checking' && subdomain) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">Resolving workspace</p>
          <p className="text-xs text-muted-foreground font-mono">{subdomain}.geniecloud.dev</p>
        </div>
      </div>
    )
  }

  if (resolution === 'not_found' && subdomain) {
    return <TenantNotFoundPage subdomain={subdomain} />
  }

  return <Outlet context={{ tenantInfo }} />
}
