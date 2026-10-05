import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useGenieStore } from '@/store/genieStore'

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

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

    if (disabled || isRequestingPermission || activeListeningRef.current) return

    stopSpeaking() // Cancel any ongoing TTS before speaking
    setIsRequestingPermission(true)

    // Request microphone permission explicitly to trigger macOS / browser prompt if not already granted
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Immediately release microphone tracks so SpeechRecognition has full exclusive access
        stream.getTracks().forEach((track) => track.stop())
      }
    } catch (err: any) {
      setIsRequestingPermission(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone permission was denied. Please allow microphone access in your browser URL bar.')
        setIsListening(false)
        return
      }
      console.warn('Microphone permission probe warning:', err)
    } finally {
      setIsRequestingPermission(false)
    }

    try {
      // Abort any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = voiceLanguage
      recognition.maxAlternatives = 1

      accumulatedTranscriptRef.current = ''

      recognition.onstart = () => {
        activeListeningRef.current = true
        setIsListening(true)
        if (voiceLanguage === 'ur-PK') {
          toast.info('🎙️ سن رہا ہوں... اردو میں بولیں')
        } else {
          toast.info('🎙️ Listening... Speak your prompt naturally.')
        }
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            final += item[0].transcript
          } else {
            interim += item[0].transcript
          }
        }

        if (final) {
          accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + final
          onTranscriptRef.current(accumulatedTranscriptRef.current, true)

          // Reset silence debounce timer (auto-send 1.6s after finishing speech)
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          if (autoSendRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stopListening(true)
            }, 1600)
          }
        } else if (interim) {
          const liveText = accumulatedTranscriptRef.current
            ? `${accumulatedTranscriptRef.current} ${interim}`
            : interim
          onTranscriptRef.current(liveText, false)

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('SpeechRecognition error:', event.error, event.message)
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was blocked. Please enable microphone permissions in your browser.')
          stopListening(false)
        } else if (event.error === 'no-speech') {
          // Keep listening or reset on prolonged silence
        } else if (event.error === 'network') {
          toast.error('Speech recognition network error. Please check your internet connection.')
          stopListening(false)
        } else if (event.error !== 'aborted') {
          toast.error(`Voice error: ${event.error}`)
          stopListening(false)
        }
      }

      recognition.onend = () => {
        // If recognition stopped unexpectedly while we intended to keep listening, auto-restart
        if (activeListeningRef.current) {
          try {
            recognition.start()
          } catch {
            activeListeningRef.current = false
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.error('Failed to start SpeechRecognition:', err)
      toast.error('Could not activate microphone. Please try again.')
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

  // Handle external trigger (e.g. user clicked mic on floating trigger or header button)
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
    <div className="flex items-center gap-1 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || isRequestingPermission}
        onClick={toggleListening}
        className={`relative h-8 w-8 shrink-0 transition-all ${
          isListening
            ? 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 dark:text-rose-400 dark:bg-rose-950/40 ring-2 ring-rose-500/40 animate-pulse'
            : 'text-purple-600 dark:text-purple-400 hover:bg-purple-100/70 dark:hover:bg-purple-950/40'
        }`}
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
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        ) : isListening ? (
          <MicOff className="h-4 w-4 animate-pulse text-rose-600 dark:text-rose-400" />
        ) : (
          <Mic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        )}
      </Button>

      {/* Language Toggle Pill: EN | اردو */}
      <button
        type="button"
        disabled={isListening}
        onClick={toggleVoiceLanguage}
        className={`h-7 px-2 rounded-md text-[11px] font-semibold border transition-all flex items-center justify-center select-none ${
          voiceLanguage === 'ur-PK'
            ? 'border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs font-sans'
            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
        } ${isListening ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-300'}`}
        title={voiceLanguage === 'ur-PK' ? 'اردو منتخب ہے (انگلش میں تبدیل کرنے کے لیے کلک کریں)' : 'English selected (Click to switch to Urdu)'}
      >
        {voiceLanguage === 'ur-PK' ? 'اردو' : 'EN'}
      </button>
    </div>
  )
}
