import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface GenieMarkdownProps {
  content: string
  className?: string
}

export const GenieMarkdown: React.FC<GenieMarkdownProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-foreground mt-3 mb-2 flex items-center gap-1.5">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-foreground mt-3 mb-1.5 flex items-center gap-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-foreground mt-2.5 mb-1.5 flex items-center gap-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          ul: ({ children }) => <ul className="my-1.5 ml-3 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 ml-3 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto rounded-lg border border-border/60 bg-card shadow-xs">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border/80 bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-border/40 bg-card/40">{children}</tbody>,
          tr: ({ children }) => <tr className="transition-colors hover:bg-muted/30">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-foreground/90 align-middle">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 px-3 py-1 text-xs italic text-muted-foreground rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === 'string' && !children.includes('\n')
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-purple-700 dark:text-purple-300"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-100 border border-border/50">
                <code {...props}>{children}</code>
              </pre>
            )
          },
          hr: () => <hr className="my-3 border-border/60" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
