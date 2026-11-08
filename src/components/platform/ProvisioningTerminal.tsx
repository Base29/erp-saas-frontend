import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, Terminal } from 'lucide-react'
import { type ProvisioningLog } from '@/api/platform'
import { cn } from '@/lib/utils'

interface ProvisioningTerminalProps {
  logs: ProvisioningLog[]
  className?: string
  title?: string
}

export function ProvisioningTerminal({ logs, className, title = 'System Provisioning Console' }: ProvisioningTerminalProps) {
  const [displayedLogs, setDisplayedLogs] = useState<ProvisioningLog[]>([])
  const [activeStepText, setActiveStepText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const queueRef = useRef<ProvisioningLog[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const currentTenantIdRef = useRef<string | null>(null)

  // 1. Process Raw Logs into Cleaned/Deduplicated List
  const processLogs = (rawLogs: ProvisioningLog[]) => {
    if (rawLogs.length === 0) return { refinedLogs: [], tenantName: null }

    const sortedTimeline = [...rawLogs].sort((a, b) => {
      const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (timeDiff !== 0) return timeDiff
      return (b.id || "").localeCompare(a.id || "")
    })
    
    const latestTenant = sortedTimeline[0]?.tenant
    const latestTenantId = sortedTimeline[0]?.tenant_id
    const tenantLogs = rawLogs.filter(log => log.tenant_id === latestTenantId)
    const latestMap = new Map<string, ProvisioningLog>()
    
    const sortedTenantLogs = [...tenantLogs].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (timeDiff !== 0) return timeDiff
      return (a.id || "").localeCompare(b.id || "")
    })

    sortedTenantLogs.forEach(log => latestMap.set(log.step, log))

    const refinedLogs = Array.from(latestMap.values()).sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (timeDiff !== 0) return timeDiff
      return (a.id || "").localeCompare(b.id || "")
    })

    return { refinedLogs, tenantName: latestTenant?.name }
  }

  const { refinedLogs, tenantName } = processLogs(logs)

  // 2. Queue management logic
  useEffect(() => {
    const latestTenantId = refinedLogs[0]?.tenant_id || null

    // Detect if we have switched to a different tenant
    if (latestTenantId !== currentTenantIdRef.current) {
      const wasPreviouslyEmpty = currentTenantIdRef.current === null
      currentTenantIdRef.current = latestTenantId
      
      // If we're loading for the first time and have logs, show them instantly
      if (isInitialMount.current && refinedLogs.length > 0) {
        setDisplayedLogs(refinedLogs)
        isInitialMount.current = false
        return
      } 
      
      // If it's a real switch between tenants, reset the console
      if (!wasPreviouslyEmpty) {
        setDisplayedLogs([])
        queueRef.current = []
      }
    }

    // Identify logs in refinedLogs that are NOT in displayedLogs OR have updated status
    const newLogs = refinedLogs.filter(refined => {
      const displayed = displayedLogs.find(d => d.step === refined.step)
      return !displayed || displayed.status !== refined.status
    })

    if (newLogs.length > 0) {
      // Avoid duplicates in the queue
      const filteredNewLogs = newLogs.filter(nl => !queueRef.current.find(q => q.step === nl.step && q.status === nl.status))
      queueRef.current = [...queueRef.current, ...filteredNewLogs]
    }
  }, [refinedLogs, displayedLogs])

  // 3. Sequential Typewriter Effect Loop
  useEffect(() => {
    if (isTyping || queueRef.current.length === 0) return

    const processNextInQueue = async () => {
      setIsTyping(true)
      const nextLog = queueRef.current.shift()
      if (!nextLog) {
        setIsTyping(false)
        return
      }

      const isNewStep = !displayedLogs.find(d => d.step === nextLog.step)
      const isFinishing = nextLog.status === 'completed' || nextLog.status === 'failed'

      if (isNewStep || nextLog.status === 'running') {
        setActiveStepText(`$ executing ${nextLog.step}...`)
        await new Promise(resolve => setTimeout(resolve, isNewStep ? 800 : 400))
      }
      
      setDisplayedLogs(prev => {
        const existingIdx = prev.findIndex(p => p.step === nextLog.step)
        if (existingIdx !== -1) {
          const updated = [...prev]
          updated[existingIdx] = nextLog
          return updated
        }
        return [...prev, nextLog]
      })

      if (isFinishing) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      setActiveStepText('')
      setIsTyping(false)
    }

    processNextInQueue()
  }, [isTyping, displayedLogs])

  // 4. Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedLogs, activeStepText])

  const runningLog = displayedLogs.find(l => l.status === 'running')

  return (
    <div className={cn("bg-zinc-950/95 backdrop-blur-2xl rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl flex flex-col transition-all duration-300", className)}>
      {/* Sleek Obsidian Header */}
      <div className="bg-zinc-900/80 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider font-semibold">
            {title} {tenantName && <span className="text-zinc-600">—</span>} {tenantName && <span className="text-emerald-400 font-bold">{tenantName}</span>}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-xs" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-xs" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-xs" />
        </div>
      </div>

      {/* Terminal Viewport */}
      <div 
        ref={scrollRef}
        className="p-4 font-mono text-xs sm:text-sm h-[320px] overflow-y-auto custom-scrollbar bg-black/60 scroll-smooth flex flex-col"
      >
        <div className="space-y-2 pb-2">
          {displayedLogs.map((log) => (
            <div 
              key={log.id} 
              className={cn(
                "flex items-start gap-3 transition-opacity duration-200",
                log.status === 'running' ? "opacity-100" : "opacity-80"
              )}
            >
              <span className="text-zinc-500 shrink-0 text-[10px] pt-0.5 w-16 select-none font-mono">
                [{new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <div className="shrink-0 flex items-center justify-center w-4 h-4">
                  {log.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
                  {log.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  {log.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                  {log.status === 'pending' && <Clock className="h-3.5 w-3.5 text-zinc-500" />}
                </div>

                <span className={cn(
                  "font-bold uppercase text-[9px] px-1.5 py-0.5 rounded-md shrink-0 border select-none tracking-wider",
                  log.status === 'completed' && "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                  log.status === 'running' && "text-blue-400 border-blue-400/30 bg-blue-400/10",
                  log.status === 'failed' && "text-rose-400 border-rose-500/30 bg-rose-500/10",
                  log.status === 'pending' && "text-zinc-400 border-zinc-500/30 bg-zinc-500/10"
                )}>
                  {log.status}
                </span>

                <span className="text-zinc-100 font-medium tracking-tight truncate">{log.step}</span>
                
                {log.message && (
                  <span className="text-zinc-400 text-xs truncate italic border-l border-zinc-800 pl-2">
                    {log.message}
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2 text-emerald-400 text-xs">
            <span className="shrink-0 font-bold">$</span>
            <span className="font-semibold tracking-wide">
              {activeStepText || (runningLog ? `awaiting ${runningLog.step}...` : "ready")}
              <span className="ml-1 inline-block w-2 h-4 bg-emerald-400/80 animate-pulse align-middle" />
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom Status Bar */}
      <div className="bg-zinc-900/70 px-4 py-1.5 border-t border-zinc-800/80 flex justify-between items-center shrink-0">
        <span className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", displayedLogs.some(l => l.status === 'running') ? "bg-amber-400 animate-ping" : "bg-emerald-400")} />
          {displayedLogs.some(l => l.status === 'running') ? 'status: provisioning' : 'status: idle'}
        </span>
        <div className="flex gap-4">
          <span className="text-[9px] text-zinc-500 font-mono">UTF-8</span>
          <span className="text-[9px] text-zinc-500 font-mono">LN {displayedLogs.length}, COL 1</span>
        </div>
      </div>
    </div>
  )
}
