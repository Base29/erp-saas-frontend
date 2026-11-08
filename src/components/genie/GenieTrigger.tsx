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
      className={`relative h-8 gap-2 rounded-full px-3 text-xs font-semibold transition-all duration-200 border shadow-xs ${
        isOpen
          ? 'border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
          : 'border-border/70 bg-card/60 backdrop-blur-md hover:border-purple-400/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
      }`}
      title="Ask Genie (Cmd+J / Ctrl+J)"
    >
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-xs">
        <Sparkles className="h-2.5 w-2.5" />
      </div>
      <span className="hidden sm:inline">Genie AI</span>
      <kbd className="hidden rounded bg-muted/80 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground md:inline border border-border/50">
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
      {/* Main Floating Trigger with Antigravity Aura */}
      <button
        type="button"
        onClick={toggleOpen}
        className="group relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 text-white shadow-[0_12px_35px_-5px_rgba(124,58,237,0.4)] transition-all duration-300 hover:scale-108 hover:shadow-[0_18px_45px_-5px_rgba(124,58,237,0.6)] active:scale-95 focus:outline-hidden"
        title="Chat with Genie (Cmd+J)"
      >
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background"></span>
        </span>
        <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-purple-600 to-indigo-700 transition-all duration-200 group-hover:brightness-110">
          <Sparkles className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
        </div>
      </button>
    </div>
  )
}
