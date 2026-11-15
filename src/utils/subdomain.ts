/**
 * Helper to extract tenant subdomain from current hostname.
 * Handles *.geniecloud.dev, *.localhost, and environment overrides.
 */
export function getSubdomain(): string | null {
  // 1. Explicit environment variable override (useful in local dev)
  if (import.meta.env.VITE_TENANT_SUBDOMAIN) {
    return import.meta.env.VITE_TENANT_SUBDOMAIN.toLowerCase().trim()
  }

  const hostname = window.location.hostname.toLowerCase()

  // 2. Localhost development (e.g. acme.localhost or tenant.localhost)
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.replace(/\.localhost$/, '')
    return sub && sub !== 'localhost' ? sub : null
  }

  // 3. Raw IP address (e.g. 127.0.0.1, 10.10.10.4) - no subdomain
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return null
  }

  // 4. Standard domains (e.g. acme.geniecloud.dev, demo.app.com)
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    // Exclude reserved platform subdomains
    const reserved = ['control', 'platform', 'admin', 'www', 'api', 'gateway', 'mail']
    if (reserved.includes(sub)) {
      return null
    }
    return sub
  }

  return null
}
