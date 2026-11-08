import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { isUrduOrArabic } from './GenieMarkdown'
import { cn } from '@/lib/utils'

interface GenieThinkingAccordionProps {
  reasoning: string
}

export const GenieThinkingAccordion: React.FC<GenieThinkingAccordionProps> = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!reasoning || !reasoning.trim()) return null

  const isUrdu = isUrduOrArabic(reasoning)

  return (
    <div className="mb-2.5 overflow-hidden rounded-xl border border-border/60 bg-muted/30 backdrop-blur-md text-xs shadow-2xs transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="text-[11px] font-semibold text-foreground/90 tracking-wide">Genie's Thought Process</span>
        </span>
        <span className="transition-transform duration-200">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </button>

      {isOpen && (
        <div
          dir={isUrdu ? 'rtl' : 'ltr'}
          className={cn(
            "border-t border-border/50 bg-background/70 backdrop-blur-md p-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap select-text",
            isUrdu ? "text-right font-urdu leading-[1.8]" : "text-left"
          )}
        >
          {reasoning}
        </div>
      )}
    </div>
  )
}
