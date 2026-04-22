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

      // Only show the "executing" typing animation for completely new steps 
      // or when a step starts running. Skip for completions to avoid "double-running" feel.
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

      // Shorter pause after status update
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
    <div className={cn("bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden shadow-2xl flex flex-col", className)}>
      <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            {title} {tenantName && <span className="text-zinc-600">—</span>} {tenantName && <span className="text-emerald-500/80">{tenantName}</span>}
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="p-4 font-mono text-sm h-[320px] overflow-y-auto custom-scrollbar bg-black/40 scroll-smooth flex flex-col"
      >
        <div className="space-y-1.5 pb-2">
          {displayedLogs.map((log) => (
            <div 
              key={log.id} 
              className={cn(
                "flex items-start gap-3 animate-in fade-in slide-in-from-left-1",
                log.status === 'running' ? "opacity-100" : "opacity-70"
              )}
            >
              <span className="text-zinc-600 shrink-0 text-[10px] pt-1 w-16">
                [{new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0 flex items-center justify-center w-4 h-4">
                  {log.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
                  {log.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {log.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-rose-500" />}
                  {log.status === 'pending' && <Clock className="h-3.5 w-3.5 text-zinc-600" />}
                </div>

                <span className={cn(
                  "font-bold uppercase text-[9px] px-1.5 py-0.5 rounded-sm shrink-0 border",
                  log.status === 'completed' && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
                  log.status === 'running' && "text-blue-400 border-blue-400/20 bg-blue-400/5",
                  log.status === 'failed' && "text-rose-500 border-rose-500/20 bg-rose-500/5",
                  log.status === 'pending' && "text-zinc-500 border-zinc-500/20 bg-zinc-500/5"
                )}>
                  {log.status}
                </span>

                <span className="text-zinc-200 font-medium tracking-tight truncate">{log.step}</span>
                
                {log.message && (
                  <span className="text-zinc-500 text-xs truncate italic border-l border-zinc-800 pl-2">
                    {log.message}
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2 text-emerald-500 text-xs">
            <span className="shrink-0">$</span>
            <span className="font-bold">
              {activeStepText || (runningLog ? `awaiting ${runningLog.step}...` : "ready")}
              <span className="ml-1 inline-block w-2 h-4 bg-emerald-500/60 animate-pulse align-middle" />
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-900/60 px-4 py-1.5 border-t border-zinc-800 flex justify-between items-center shrink-0">
        <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">
          {displayedLogs.some(l => l.status === 'running') ? 'status: provisioning' : 'status: idle'}
        </span>
        <div className="flex gap-4">
          <span className="text-[9px] text-zinc-700 font-mono">UTF-8</span>
          <span className="text-[9px] text-zinc-700 font-mono">LN {displayedLogs.length}, COL 1</span>
        </div>
      </div>
    </div>
  )
}
