import React from 'react'
import { isModuleActive, isExtensionActive } from '@/utils/permissions'

interface FeatureGateProps {
  module?: string
  extension?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function FeatureGate({ module, extension, fallback = null, children }: FeatureGateProps) {
  if (module && !isModuleActive(module)) {
    return <>{fallback}</>
  }
  if (extension && !isExtensionActive(extension)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

interface ExtensionGateProps {
  extension: string
  parentModule?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function ExtensionGate({ extension, parentModule = 'manufacturing', fallback = null, children }: ExtensionGateProps) {
  if (parentModule && !isModuleActive(parentModule)) {
    return <>{fallback}</>
  }
  if (!isExtensionActive(extension)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

export default FeatureGate
