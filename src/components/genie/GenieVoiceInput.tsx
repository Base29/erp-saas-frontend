import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useGenieStore } from '@/store/genieStore'
import { cn } from '@/lib/utils'

interface GenieVoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void
  onSend: (text: string) => void
  disabled?: boolean
  autoSend?: boolean
}

export const GenieVoiceInput: React.FC<GenieVoiceInputProps> = ({
  onTranscript,
  onSend,
  disabled = false,
  autoSend = true,
}) => {
  const {
    isListening,
    setIsListening,
    stopSpeaking,
    voiceLanguage,
    toggleVoiceLanguage,
    shouldStartListening,
    setShouldStartListening,
  } = useGenieStore()

  const [isSupported, setIsSupported] = useState(true)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  // Keep latest callbacks in refs to prevent useEffect re-triggering and aborting recognition
  const onTranscriptRef = useRef(onTranscript)
  const onSendRef = useRef(onSend)
  const autoSendRef = useRef(autoSend)
  const silenceTimerRef = useRef<any>(null)
  const recognitionRef = useRef<any>(null)
  const accumulatedTranscriptRef = useRef<string>('')
  const activeListeningRef = useRef<boolean>(false)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onSendRef.current = onSend
    autoSendRef.current = autoSend
  })

  // Detect Web Speech API support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
    }
  }, [])

  // Safely stop recognition
  const stopListening = useCallback((triggerSend = true) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    activeListeningRef.current = false
    setIsListening(false)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null
    }

    const finalText = accumulatedTranscriptRef.current.trim()
    if (triggerSend && autoSendRef.current && finalText) {
      onSendRef.current(finalText)
      accumulatedTranscriptRef.current = ''
    }
  }, [setIsListening])

  // Start speech recognition session
  const startListening = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error('Voice input requires Web Speech API (supported in Google Chrome, Microsoft Edge, and Safari).')
      return
    }

    if (disabled || isRequestingPermission) return

    stopSpeaking()
    accumulatedTranscriptRef.current = ''
    activeListeningRef.current = true
    setIsListening(true)

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = useGenieStore.getState().voiceLanguage || 'en-US'
      recognition.maxAlternatives = 1

      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          if (activeListeningRef.current) {
            stopListening(true)
          }
        }, 3500)
      }

      recognition.onstart = () => {
        setIsRequestingPermission(false)
        resetSilenceTimer()
      }

      recognition.onresult = (event: any) => {
        resetSilenceTimer()
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          accumulatedTranscriptRef.current += finalTranscript
          onTranscriptRef.current(accumulatedTranscriptRef.current.trim(), true)
        } else if (interimTranscript) {
          const fullDraft = (accumulatedTranscriptRef.current + ' ' + interimTranscript).trim()
          onTranscriptRef.current(fullDraft, false)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          return
        }
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission was denied. Please allow microphone access in your browser settings.')
          stopListening(false)
          return
        }
        if (event.error === 'aborted') {
          return
        }
        toast.error(`Voice error: ${event.error || 'Failed to capture audio'}`)
        stopListening(false)
      }

      recognition.onend = () => {
        if (activeListeningRef.current) {
          stopListening(true)
        }
      }

      recognition.start()
    } catch {
      toast.error('Could not start speech recognition')
      setIsListening(false)
      activeListeningRef.current = false
    }
  }, [disabled, isRequestingPermission, setIsListening, stopSpeaking, stopListening])

  const toggleListening = () => {
    if (!isSupported) {
      toast.error('Voice input requires Web Speech API (supported in Google Chrome, Microsoft Edge, and Safari).')
      return
    }

    if (isListening || activeListeningRef.current) {
      stopListening(true)
    } else {
      startListening()
    }
  }

  // Handle external trigger
  useEffect(() => {
    if (shouldStartListening) {
      setShouldStartListening(false)
      const timer = setTimeout(() => {
        startListening()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [shouldStartListening, setShouldStartListening, startListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || isRequestingPermission}
        onClick={toggleListening}
        className={cn(
          "relative h-8 w-8 shrink-0 rounded-xl transition-all duration-200 active:scale-95",
          isListening
            ? "bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 dark:text-rose-400 dark:bg-rose-950/50 ring-2 ring-rose-500/50 shadow-subtle"
            : "text-primary hover:bg-primary/10"
        )}
        title={
          isListening
            ? (voiceLanguage === 'ur-PK' ? 'سننا بند کریں (بھیجنے کے لیے کلک کریں)' : 'Stop listening (Voice active - Click to send)')
            : isRequestingPermission
            ? 'Requesting microphone access...'
            : isSupported
            ? (voiceLanguage === 'ur-PK' ? 'آواز کے ذریعے بولیں (اردو)' : 'Click to speak voice prompt (English)')
            : 'Voice input (Requires Chrome, Edge, or Safari)'
        }
      >
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
          </span>
        )}
        {isRequestingPermission ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : isListening ? (
          <MicOff className="h-4 w-4 animate-pulse text-rose-600 dark:text-rose-400" />
        ) : (
          <Mic className="h-4 w-4 text-primary" />
        )}
      </Button>

      {/* Language Toggle Pill: EN | اردو */}
      <button
        type="button"
        disabled={isListening}
        onClick={toggleVoiceLanguage}
        className={cn(
          "h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 flex items-center justify-center select-none active:scale-95",
          voiceLanguage === 'ur-PK'
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-2xs font-sans"
            : "border-border/70 bg-card/60 backdrop-blur-md text-foreground/80 hover:border-primary/50 hover:text-primary",
          isListening && "opacity-50 cursor-not-allowed"
        )}
        title={voiceLanguage === 'ur-PK' ? 'اردو منتخب ہے (انگلش میں تبدیل کرنے کے لیے کلک کریں)' : 'English selected (Click to switch to Urdu)'}
      >
        {voiceLanguage === 'ur-PK' ? 'اردو' : 'EN'}
      </button>
    </div>
  )
}
