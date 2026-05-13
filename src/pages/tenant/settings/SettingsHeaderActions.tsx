import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  children: ReactNode
}

export default function SettingsHeaderActions({ children }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const el = document.getElementById('settings-header-actions')
  if (!el) return null

  return createPortal(children, el)
}
