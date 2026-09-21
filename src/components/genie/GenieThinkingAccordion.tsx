import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'

interface GenieThinkingAccordionProps {
  reasoning: string
}

export const GenieThinkingAccordion: React.FC<GenieThinkingAccordionProps> = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!reasoning || !reasoning.trim()) return null

  return (
    <div className="mb-2.5 overflow-hidden rounded-lg border border-border/60 bg-muted/25 text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-[11px] font-medium text-foreground/80">Genie's Thought Process</span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/50 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {reasoning}
        </div>
      )}
    </div>
  )
}
