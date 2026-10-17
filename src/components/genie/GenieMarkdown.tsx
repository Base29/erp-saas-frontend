import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Check if the text contains Urdu / Arabic characters.
 */
export const isUrduOrArabic = (text: string): boolean => {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

interface GenieMarkdownProps {
  content: string
  className?: string
}

export const GenieMarkdown: React.FC<GenieMarkdownProps> = ({ content, className = '' }) => {
  const isUrdu = isUrduOrArabic(content)

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={`prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed ${
        isUrdu ? 'text-right leading-[1.85] font-urdu' : 'text-left'
      } ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              dir="auto"
              className={`text-base font-bold text-foreground mt-3 mb-2 flex items-center gap-1.5 ${
                isUrdu ? 'text-right justify-start' : 'text-left'
              }`}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              dir="auto"
              className={`text-sm font-semibold text-foreground mt-3 mb-1.5 flex items-center gap-1.5 ${
                isUrdu ? 'text-right justify-start' : 'text-left'
              }`}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              dir="auto"
              className={`text-xs font-semibold text-foreground mt-2.5 mb-1.5 flex items-center gap-1.5 ${
                isUrdu ? 'text-right justify-start' : 'text-left'
              }`}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p dir="auto" className={`mb-2 last:mb-0 leading-[1.85] ${isUrdu ? 'text-right' : 'text-left'}`}>
              {children}
            </p>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          ul: ({ children }) => (
            <ul className={`my-1.5 list-disc space-y-1 ${isUrdu ? 'mr-4 ml-0 text-right pr-1' : 'ml-3 text-left'}`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`my-1.5 list-decimal space-y-1 ${isUrdu ? 'mr-4 ml-0 text-right pr-1' : 'ml-3 text-left'}`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li dir="auto" className={`leading-[1.85] ${isUrdu ? 'text-right' : 'text-left'}`}>
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto rounded-lg border border-border/60 bg-card shadow-xs">
              <table
                dir={isUrdu ? 'rtl' : 'ltr'}
                className={`w-full border-collapse text-xs ${isUrdu ? 'text-right' : 'text-left'}`}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border/80 bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-border/40 bg-card/40">{children}</tbody>,
          tr: ({ children }) => <tr className="transition-colors hover:bg-muted/30">{children}</tr>,
          th: ({ children }) => (
            <th
              className={`px-3 py-2 font-medium text-foreground whitespace-nowrap ${
                isUrdu ? 'text-right' : 'text-left'
              }`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={`px-3 py-2 text-foreground/90 align-middle ${
                isUrdu ? 'text-right' : 'text-left'
              }`}
            >
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote
              dir="auto"
              className={`my-2 py-1 px-3 text-xs italic text-muted-foreground ${
                isUrdu
                  ? 'border-r-2 border-l-0 border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 rounded-l text-right'
                  : 'border-l-2 border-r-0 border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 rounded-r text-left'
              }`}
            >
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === 'string' && !children.includes('\n')
            if (isInline) {
              return (
                <code
                  dir="ltr"
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-purple-700 dark:text-purple-300 inline-block align-baseline unicode-bidi-isolate"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre
                dir="ltr"
                className="my-2 overflow-x-auto rounded-lg bg-slate-900 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-100 border border-border/50 text-left"
              >
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
