import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Sparkles,
  Send,
  Paperclip,
  Plus,
  History,
  FileText,
  PieChart,
  Package,
  ShoppingCart,
  Trash2,
  Loader2,
  User as UserIcon,
  Compass,
  ArrowRight,
  Volume2,
  VolumeX,
  Mic,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useGenieStore } from '@/store/genieStore'
import { GenieActionCard } from './GenieActionCard'
import { GenieThinkingAccordion } from './GenieThinkingAccordion'
import { GenieMarkdown, isUrduOrArabic } from './GenieMarkdown'
import { GenieReasoningState } from './GenieReasoningState'
import { GenieVoiceInput } from './GenieVoiceInput'
import { useNavigate } from 'react-router-dom'

export const GenieAssistantDrawer: React.FC = () => {
  const {
    isOpen,
    setIsOpen,
    messages,
    isLoading,
    isUploading,
    status,
    conversations,
    currentAttachments,
    isListening,
    isSpeaking,
    voiceLanguage,
    voiceResponseEnabled,
    preferredVoiceUri,
    availableMaleVoices,
    activeVoiceName,
    toggleVoiceResponse,
    setPreferredVoiceUri,
    refreshAvailableVoices,
    testVoiceSample,
    stopSpeaking,
    sendMessage,
    uploadAttachment,
    removeAttachment,
    startNewConversation,
    selectConversation,
    deleteConversation,
    loadConversations,
  } = useGenieStore()

  const [input, setInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      loadConversations()
      refreshAvailableVoices()
    }
  }, [isOpen, loadConversations, refreshAvailableVoices])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() && currentAttachments.length === 0) return
    sendMessage(input)
    setInput('')
  }

  const handleTranscript = React.useCallback((text: string) => {
    setInput(text)
  }, [])

  const handleVoiceSend = React.useCallback((text: string) => {
    setInput('')
    sendMessage(text)
  }, [sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAttachment(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getQuickIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText':
        return <FileText className="h-3.5 w-3.5 text-blue-500" />
      case 'PieChart':
        return <PieChart className="h-3.5 w-3.5 text-emerald-500" />
      case 'Package':
        return <Package className="h-3.5 w-3.5 text-amber-500" />
      case 'ShoppingCart':
        return <ShoppingCart className="h-3.5 w-3.5 text-indigo-500" />
      default:
        return <Sparkles className="h-3.5 w-3.5 text-purple-500" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl transition-all duration-300 sm:max-w-xl md:max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">Genie</h3>
              <Badge variant="outline" className="h-5 gap-1.5 border-border/80 bg-muted/40 px-2 text-[10px] font-normal text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>AI Assistant</span>
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Genie Cloud Native Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Action Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-purple-600 hover:bg-purple-50/50 dark:hover:text-purple-400 dark:hover:bg-purple-950/30"
            onClick={() => sendMessage("Show me the quick action menu")}
            disabled={isLoading}
            title="Open Quick Action Menu"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline text-[11px] font-medium">Quick Actions</span>
          </Button>

          {/* Voice Speech Response Menu & Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 gap-1.5 px-2 text-xs transition-colors ${
                  voiceResponseEnabled
                    ? 'text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400 font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Voice playback options (Click to open menu)"
              >
                {voiceResponseEnabled ? (
                  <Volume2 className="h-4 w-4 text-purple-600" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-[11px]">
                  {voiceResponseEnabled ? 'Voice' : 'Muted'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="flex items-center justify-between text-xs">
                <span>Voice Playback</span>
                <Badge variant={voiceResponseEnabled ? 'default' : 'secondary'} className="text-[10px] h-4">
                  {voiceResponseEnabled ? 'Enabled' : 'Muted'}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={toggleVoiceResponse}
                className="text-xs cursor-pointer flex items-center justify-between font-medium"
              >
                <span>{voiceResponseEnabled ? 'Disable Audio Playback' : 'Enable Audio Playback'}</span>
                {voiceResponseEnabled ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => testVoiceSample(voiceLanguage === 'ur-PK' ? 'ur' : 'en')}
                className="text-xs cursor-pointer flex items-center justify-between text-purple-600 dark:text-purple-400"
              >
                <span>Listen to Voice Sample</span>
                <Sparkles className="h-3.5 w-3.5" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                Male Voice Profile
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setPreferredVoiceUri(null)}
                className="text-xs cursor-pointer flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-[11px]">✨ Smart Human Male (Auto)</span>
                  <span className="text-[10px] text-muted-foreground">Highest-quality neural male voice</span>
                </div>
                {!preferredVoiceUri && <Check className="h-3.5 w-3.5 text-purple-600 ml-1" />}
              </DropdownMenuItem>
              {availableMaleVoices.slice(0, 6).map((v) => (
                <DropdownMenuItem
                  key={v.voiceURI}
                  onClick={() => setPreferredVoiceUri(v.voiceURI)}
                  className="text-xs cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col truncate max-w-[210px]">
                    <span className="truncate font-medium text-[11px]">{v.name}</span>
                    <span className="text-[10px] text-muted-foreground">{v.lang}</span>
                  </div>
                  {preferredVoiceUri === v.voiceURI && <Check className="h-3.5 w-3.5 text-purple-600 ml-1 shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* History dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <History className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Past Conversations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {conversations.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">No past chats yet.</div>
              ) : (
                conversations.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className="flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="truncate max-w-[170px]">{c.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(c.id)
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New Chat Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={startNewConversation}
            title="New Conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400 mb-4 shadow-inner">
              <Sparkles className="h-7 w-7" />
            </div>
            <h4 className="text-base font-semibold text-foreground">Welcome to Genie Cloud</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              I am Genie, your conversational assistant for Genie Cloud. Ask me anything about accounts, sales, inventory, or let me draft actions for you.
            </p>

            {/* Voice Prompt Tip Banner */}
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-purple-200/80 bg-purple-50/70 p-2.5 text-xs text-purple-900 dark:border-purple-805/60 dark:bg-purple-950/40 dark:text-purple-300 max-w-md w-full">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <Mic className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-[11px] text-foreground">Voice Prompts Enabled</div>
                <div className="text-[10px] text-muted-foreground">Click the microphone icon below or speak prompts naturally.</div>
              </div>
            </div>

            {/* Quick Action Prompts */}
            <div className="mt-5 w-full max-w-md space-y-2 text-left">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                Ask Genie to...
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(status?.quick_prompts || []).map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(qp.prompt)}
                    className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs text-foreground transition-all hover:border-purple-300 hover:bg-purple-50/40 hover:shadow-xs dark:hover:bg-purple-950/20 text-left"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                      {getQuickIcon(qp.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[12px]">{qp.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{qp.prompt}</div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs text-xs mt-0.5">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}

              <div className={`flex flex-col ${msg.role === 'user' ? 'max-w-[85%] items-end' : 'w-full max-w-[94%] items-start'}`}>
                {/* Attachments preview on message if any */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {msg.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground"
                      >
                        <FileText className="h-3 w-3 text-purple-600" />
                        <span className="font-mono">{att.file_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reasoning Accordion */}
                {msg.reasoning_content && (
                  <GenieThinkingAccordion reasoning={msg.reasoning_content} />
                )}

                {/* Main Content Bubble */}
                {msg.content && (
                  <div
                    dir={isUrduOrArabic(msg.content) ? 'rtl' : 'ltr'}
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? `bg-primary text-primary-foreground rounded-tr-xs ${
                            isUrduOrArabic(msg.content) ? 'text-right font-urdu leading-[1.85]' : 'text-left'
                          }`
                        : `w-full bg-muted/70 text-foreground border border-border/50 rounded-tl-xs shadow-xs ${
                            isUrduOrArabic(msg.content) ? 'text-right font-urdu' : 'text-left'
                          }`
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div
                        dir="auto"
                        className={`whitespace-pre-wrap font-sans ${
                          isUrduOrArabic(msg.content) ? 'text-right font-urdu leading-[1.85]' : 'text-left'
                        }`}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <GenieMarkdown content={msg.content} />
                    )}
                  </div>
                )}

                {/* Navigation Link Chip if suggested by Genie */}
                {msg.metadata?.navigation && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(msg.metadata!.navigation!.path)
                      setIsOpen(false)
                    }}
                    className="mt-2 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <Compass className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Go to {msg.metadata.navigation.label}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}

                {/* Quick Action Chips in Chat */}
                {(msg.metadata?.quick_actions || (msg.role === 'assistant' && msg.content?.includes('Genie Quick Actions Menu'))) && (
                  <div className="w-full mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(msg.metadata?.quick_actions || status?.quick_prompts || []).map((qa, qidx) => (
                      <button
                        key={qidx}
                        type="button"
                        disabled={isLoading}
                        onClick={() => sendMessage(qa.prompt)}
                        className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/80 p-2.5 text-left transition hover:border-purple-300 hover:bg-purple-50/50 hover:shadow-xs dark:hover:bg-purple-950/20 group"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40">
                          {getQuickIcon(qa.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[12px] text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300">
                            {qa.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {qa.prompt}
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-purple-600 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* HITL Action Cards */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="w-full mt-2">
                    {msg.actions.map((act) => (
                      <GenieActionCard key={act.id} action={act} />
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-primary/20 text-primary text-xs mt-0.5">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Behind-the-Scenes Reasoning State */}
        {isLoading && (
          <div className="flex items-start gap-3 w-full animate-in fade-in-50 duration-300">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs mt-1">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            </div>
            <GenieReasoningState
              userPrompt={messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-3 bg-card/60 backdrop-blur-xs">
        {/* Attachment chips */}
        {currentAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {currentAttachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-200"
              >
                <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span className="font-mono text-[11px] truncate max-w-[140px]">
                  {att.file_name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-purple-500 hover:text-purple-800 dark:hover:text-purple-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Realtime Voice Listening Indicator */}
        {isListening && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50/95 dark:bg-purple-950/70 rounded-xl border border-purple-300 dark:border-purple-700 animate-pulse shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <div>
                <span className="font-semibold text-[11px] block text-foreground">
                  {voiceLanguage === 'ur-PK' ? '🎙️ آواز سن رہا ہوں...' : 'Listening to your voice...'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {voiceLanguage === 'ur-PK'
                    ? 'اردو میں بولیں یا "منظور کریں" / "رد کریں" کہیں'
                    : 'Speak prompt or say "Approve" / "Cancel"'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-4 border-purple-300 dark:border-purple-700 bg-white/80 dark:bg-gray-900/80 font-mono">
                {voiceLanguage === 'ur-PK' ? 'اردو ur-PK' : 'EN en-US'}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => useGenieStore.getState().setIsListening(false)}
                className="h-5 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              >
                Stop
              </Button>
            </div>
          </div>
        )}

        {/* Active Speaking Indicator */}
        {isSpeaking && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800 animate-in fade-in">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <Volume2 className="h-3.5 w-3.5 text-indigo-600 animate-pulse shrink-0" />
              <span className="font-medium text-[11px] truncate max-w-[280px]">
                {activeVoiceName ? `Speaking (${activeVoiceName})...` : 'Genie is reading response aloud (Human Male)...'}
              </span>
            </div>
            <button
              type="button"
              onClick={stopSpeaking}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-200 px-2 py-0.5 rounded bg-indigo-100/80 hover:bg-indigo-200/80 transition-colors shrink-0"
            >
              Stop
            </button>
          </div>
        )}

        {/* Input box */}
        <div className="relative flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 shadow-xs focus-within:ring-1 focus-within:ring-ring">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.json,.txt,.pdf"
            className="hidden"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            title="Attach file (CSV, JSON, PDF)"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          {/* Voice Input Microphone */}
          <GenieVoiceInput
            disabled={isLoading}
            onTranscript={handleTranscript}
            onSend={handleVoiceSend}
            autoSend={true}
          />

          {/* Quick Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-purple-600 hover:bg-purple-50/50 dark:hover:text-purple-400 dark:hover:bg-purple-950/30"
                disabled={isLoading}
                title="Quick Action Menu"
              >
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-72 p-1.5 shadow-xl">
              <DropdownMenuLabel className="flex items-center justify-between text-xs px-2 py-1">
                <span className="font-semibold text-foreground">Genie Quick Actions</span>
                <span className="text-[10px] text-muted-foreground font-normal">Instant Prompts</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(status?.quick_prompts || []).map((qp, idx) => (
                <DropdownMenuItem
                  key={idx}
                  onClick={() => sendMessage(qp.prompt)}
                  className="flex items-center gap-2.5 p-2 text-xs cursor-pointer rounded-lg hover:bg-purple-50/60 dark:hover:bg-purple-950/30"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70">
                    {getQuickIcon(qp.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[11px] text-foreground">{qp.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{qp.prompt}</div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => sendMessage("Show me the quick action menu")}
                className="text-[11px] text-purple-600 dark:text-purple-400 justify-center font-medium cursor-pointer py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                Post Menu in Chat Stream
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Textarea
            dir="auto"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? (voiceLanguage === 'ur-PK'
                    ? "🎙️ سن رہا ہوں... اردو میں بولیں یا 'منظور کریں' کہیں..."
                    : "🎙️ Listening... Speak your prompt or 'Approve'...")
                : (voiceLanguage === 'ur-PK'
                    ? "جینی سے پوچھیں، ڈیٹا تلاش کریں، یا ایکشن تجویز کریں..."
                    : "Ask Genie anything, query data, or propose an action...")
            }
            rows={1}
            disabled={isLoading}
            className={`min-h-[36px] max-h-32 resize-none border-0 p-1.5 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isListening ? 'placeholder:text-purple-600 dark:placeholder:text-purple-400 font-medium' : ''
            } ${isUrduOrArabic(input) ? 'text-right font-urdu leading-[1.8]' : 'text-left'}`}
          />

          <Button
            type="button"
            size="icon"
            disabled={isLoading || (!input.trim() && currentAttachments.length === 0)}
            onClick={handleSend}
            className="h-8 w-8 shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <div className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Genie AI Assistant with Human-In-The-Loop action approvals. Press <kbd className="font-mono">Enter</kbd> to send.
        </div>
      </div>
    </div>
  )
}
