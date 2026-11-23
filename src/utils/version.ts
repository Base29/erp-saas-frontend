import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

/**
 * Build-time default application version
 */
export const BUILD_VERSION: string =
  (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ||
  import.meta.env.VITE_APP_VERSION ||
  'v0.2.8'

/**
 * Backward compatibility alias for static references
 */
export const APP_VERSION = BUILD_VERSION

/**
 * Fetch live version from backend API, dev server, or static json
 */
export async function fetchLiveVersion(): Promise<string> {
  // 1. Try backend tenant / system version API
  try {
    const res = await apiClient.get<{ version: string }>('/v1/system/version')
    if (res.data?.version) {
      return res.data.version
    }
  } catch {
    // ignore
  }

  // 2. Try Vite dev server dynamic endpoint (in local dev mode)
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/__version')
      if (res.ok) {
        const data = await res.json()
        if (data?.version) return data.version
      }
    } catch {
      // ignore
    }
  }

  // 3. Try static version.json
  try {
    const res = await fetch('/version.json')
    if (res.ok) {
      const data = await res.json()
      if (data?.version) return data.version
    }
  } catch {
    // ignore
  }

  return BUILD_VERSION
}

/**
 * React hook to reactively retrieve the latest system version tag
 */
export function useAppVersion(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useQuery({
      queryKey: ['system-version'],
      queryFn: fetchLiveVersion,
      staleTime: 30_000,
      initialData: BUILD_VERSION,
      retry: false,
    })

    return data ?? BUILD_VERSION
  } catch {
    return BUILD_VERSION
  }
}
