import React, { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGenieStore } from '@/store/genieStore'

export const GenieHeaderButton: React.FC = () => {
  const { toggleOpen, isOpen } = useGenieStore()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleOpen}
      className={`relative h-9 gap-2 rounded-full px-3 text-xs font-medium transition-all ${
        isOpen
          ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
          : 'hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
      }`}
      title="Ask Genie (Cmd+J / Ctrl+J)"
    >
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-xs">
        <Sparkles className="h-2.5 w-2.5" />
      </div>
      <span className="hidden sm:inline">Genie AI</span>
      <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
        ⌘J
      </kbd>
    </Button>
  )
}

export const GenieFloatingTrigger: React.FC = () => {
  const { toggleOpen, isOpen, loadStatus } = useGenieStore()

  useEffect(() => {
    loadStatus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        toggleOpen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleOpen, loadStatus])

  if (isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={toggleOpen}
        className="group relative flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-0.5 text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-hidden"
        title="Chat with Genie (Cmd+J)"
      >
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background"></span>
        </span>
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 transition group-hover:bg-opacity-90">
          <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" />
        </div>
      </button>
    </div>
  )
}
