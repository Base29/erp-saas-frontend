import { create } from 'zustand'
import {
  fetchGenieStatus,
  fetchGenieConversations,
  fetchGenieConversation,
  sendGenieChat,
  deleteGenieConversation,
  approveGenieAction,
  rejectGenieAction,
  uploadGenieFile,
  type GenieMessage,
  type GenieConversation,
  type GenieStatus,
} from '@/api/genie'
import { toast } from 'sonner'
import { genieVoicePlayer, getCandidateMaleVoices } from '@/utils/genieVoice'

interface GenieState {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void

  status: GenieStatus | null
  activeConversationId: string | null
  conversations: GenieConversation[]
  messages: GenieMessage[]
  isLoading: boolean
  isUploading: boolean
  currentAttachments: Array<{
    file_name: string
    file_path: string
    file_size?: number
    file_type?: string
    preview?: any
  }>

  loadStatus: () => Promise<void>
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  startNewConversation: () => void
  sendMessage: (prompt: string) => Promise<void>
  uploadAttachment: (file: File) => Promise<void>
  removeAttachment: (index: number) => void
  clearAttachments: () => void
  approveAction: (actionId: string) => Promise<void>
  rejectAction: (actionId: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>

  // Voice capabilities
  isListening: boolean
  setIsListening: (listening: boolean) => void
  isSpeaking: boolean
  voiceResponseEnabled: boolean
  voiceLanguage: 'en-US' | 'ur-PK'
  preferredVoiceUri: string | null
  availableMaleVoices: SpeechSynthesisVoice[]
  activeVoiceName: string | null
  setVoiceLanguage: (lang: 'en-US' | 'ur-PK') => void
  toggleVoiceLanguage: () => void
  toggleVoiceResponse: () => void
  setPreferredVoiceUri: (uri: string | null) => void
  refreshAvailableVoices: () => Promise<void>
  testVoiceSample: (lang?: 'en' | 'ur') => void
  speakText: (text: string) => void
  stopSpeaking: () => void
  shouldStartListening: boolean
  setShouldStartListening: (val: boolean) => void
  openWithVoice: () => void
}

export const useGenieStore = create<GenieState>((set, get) => ({
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  status: null,
  activeConversationId: null,
  conversations: [],
  messages: [],
  isLoading: false,
  isUploading: false,
  currentAttachments: [],

  // Voice state defaults
  isListening: false,
  setIsListening: (listening) => set({ isListening: listening }),
  isSpeaking: false,
  voiceResponseEnabled: typeof window !== 'undefined' && localStorage.getItem('genie-voice-response') === 'true',
  voiceLanguage: (typeof window !== 'undefined' && (localStorage.getItem('genie-voice-lang') as any)) || 'en-US',
  preferredVoiceUri: typeof window !== 'undefined' ? localStorage.getItem('genie-voice-uri') : null,
  availableMaleVoices: [],
  activeVoiceName: null,

  setVoiceLanguage: (lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('genie-voice-lang', lang)
    }
    set({ voiceLanguage: lang })
  },

  toggleVoiceLanguage: () => {
    const next = get().voiceLanguage === 'en-US' ? 'ur-PK' : 'en-US'
    get().setVoiceLanguage(next)
  },

  setPreferredVoiceUri: (uri) => {
    if (typeof window !== 'undefined') {
      if (uri) {
        localStorage.setItem('genie-voice-uri', uri)
      } else {
        localStorage.removeItem('genie-voice-uri')
      }
    }
    set({ preferredVoiceUri: uri })
  },

  refreshAvailableVoices: async () => {
    const list = await getCandidateMaleVoices()
    set({ availableMaleVoices: list })
  },

  testVoiceSample: (lang = 'en') => {
    const isUrdu = lang === 'ur' || get().voiceLanguage === 'ur-PK'
    const sampleText = isUrdu
      ? 'ہیلو، میں جینی ہوں، آپ کا ای آر پی کلاؤڈ اسسٹنٹ۔ میں آپ کی کیا مدد کر سکتا ہوں؟'
      : 'Hello! I am Genie, your ERP cloud assistant. How can I help you today?'
    get().speakText(sampleText)
  },

  shouldStartListening: false,
  setShouldStartListening: (val) => set({ shouldStartListening: val }),
  openWithVoice: () => set({ isOpen: true, shouldStartListening: true }),

  toggleVoiceResponse: () => {
    const next = !get().voiceResponseEnabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('genie-voice-response', String(next))
    }
    if (!next) {
      get().stopSpeaking()
    }
    set({ voiceResponseEnabled: next })
  },

  speakText: (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    genieVoicePlayer.setStateListener((speaking) => {
      const activeVoice = genieVoicePlayer.getActiveVoice()
      set({
        isSpeaking: speaking,
        activeVoiceName: speaking && activeVoice ? activeVoice.name : null,
      })
    })

    genieVoicePlayer.speak(text, get().preferredVoiceUri)
  },

  stopSpeaking: () => {
    genieVoicePlayer.stop()
    set({ isSpeaking: false, activeVoiceName: null })
  },

  loadStatus: async () => {
    try {
      const res = await fetchGenieStatus()
      set({ status: res.data.data })
    } catch {
      // Keep silent fallback if backend is momentarily unreachable
    }
  },

  loadConversations: async () => {
    try {
      const res = await fetchGenieConversations()
      set({ conversations: res.data.data })
    } catch (err) {
      console.error('Failed to load Genie conversations:', err)
    }
  },

  selectConversation: async (id: string) => {
    set({ isLoading: true, activeConversationId: id })
    try {
      const res = await fetchGenieConversation(id)
      const { messages, actions } = res.data.data

      // Map actions to messages if message_id matches
      const messagesWithActions = messages.map((m) => ({
        ...m,
        actions: actions.filter((a) => a.message_id === m.id),
      }))

      set({
        messages: messagesWithActions,
        activeConversationId: id,
        isLoading: false,
      })
    } catch (err: any) {
      toast.error('Failed to load conversation history')
      set({ isLoading: false })
    }
  },

  startNewConversation: () => {
    set({
      activeConversationId: null,
      messages: [],
      currentAttachments: [],
    })
  },

  uploadAttachment: async (file: File) => {
    set({ isUploading: true })
    try {
      const res = await uploadGenieFile(file)
      const uploaded = res.data.data
      set((state) => ({
        currentAttachments: [...state.currentAttachments, uploaded],
        isUploading: false,
      }))
      toast.success(`Attached ${uploaded.file_name}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'File upload failed')
      set({ isUploading: false })
    }
  },

  removeAttachment: (index: number) => {
    set((state) => ({
      currentAttachments: state.currentAttachments.filter((_, i) => i !== index),
    }))
  },

  clearAttachments: () => set({ currentAttachments: [] }),

  sendMessage: async (prompt: string) => {
    if (!prompt.trim() && get().currentAttachments.length === 0) return

    const attachmentsToSend = [...get().currentAttachments]
    const tempUserMessage: GenieMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: prompt,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : null,
      created_at: new Date().toISOString(),
    }

    set((state) => ({
      messages: [...state.messages, tempUserMessage],
      isLoading: true,
      currentAttachments: [],
    }))

    try {
      const res = await sendGenieChat(
        prompt,
        get().activeConversationId,
        attachmentsToSend.length > 0 ? attachmentsToSend : undefined
      )

      const responseData = res.data.data

      const assistantMessage: GenieMessage = {
        id: responseData.message_id,
        role: 'assistant',
        content: responseData.content,
        reasoning_content: responseData.reasoning_content,
        metadata: {
          navigation: responseData.navigation || responseData.metadata?.navigation,
          quick_actions: responseData.quick_actions || responseData.metadata?.quick_actions,
        },
        actions: responseData.actions,
        created_at: new Date().toISOString(),
      }

      set((state) => ({
        activeConversationId: responseData.conversation_id,
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }))

      // Speak response aloud if voice response is enabled
      if (get().voiceResponseEnabled && responseData.content) {
        get().speakText(responseData.content)
      }

      // Refresh conversations list in background
      get().loadConversations()
    } catch (err: any) {
      const rawError = err.response?.data?.message || err.message || ''
      const isUnavailable =
        err.response?.status === 502 ||
        err.response?.status === 503 ||
        err.response?.status === 504 ||
        /network error|econnrefused|failed to fetch|cluster|unavailable|timed out/i.test(rawError)

      const displayMessage = isUnavailable
        ? '⚠️ **The AI cluster is not available at the moment.** Please try again in a few moments, or contact your system administrator if the issue persists.'
        : `⚠️ **Error communicating with Genie Cloud**: ${rawError || 'Please try again in a few moments.'}`

      toast.error(isUnavailable ? 'The AI cluster is not available at the moment.' : (rawError || 'Could not reach Genie'))

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: displayMessage,
            created_at: new Date().toISOString(),
          },
        ],
        isLoading: false,
      }))
    }
  },

  approveAction: async (actionId: string) => {
    try {
      const res = await approveGenieAction(actionId)
      toast.success(res.data.message || 'Action executed successfully!')

      // Update the action state in active messages
      set((state) => ({
        messages: state.messages.map((m) => ({
          ...m,
          actions: m.actions?.map((a) =>
            a.id === actionId
              ? {
                  ...a,
                  status: 'executed',
                  execution_result: res.data.result,
                  executed_at: new Date().toISOString(),
                }
              : a
          ),
        })),
      }))
    } catch (err: any) {
      const errText = err.response?.data?.message || 'Execution failed'
      toast.error(errText)
      set((state) => ({
        messages: state.messages.map((m) => ({
          ...m,
          actions: m.actions?.map((a) =>
            a.id === actionId ? { ...a, status: 'failed', error_message: errText } : a
          ),
        })),
      }))
    }
  },

  rejectAction: async (actionId: string) => {
    try {
      await rejectGenieAction(actionId)
      toast.info('Action proposal rejected.')

      set((state) => ({
        messages: state.messages.map((m) => ({
          ...m,
          actions: m.actions?.map((a) =>
            a.id === actionId ? { ...a, status: 'rejected' } : a
          ),
        })),
      }))
    } catch (err: any) {
      toast.error('Failed to reject action')
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await deleteGenieConversation(id)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        activeConversationId:
          state.activeConversationId === id ? null : state.activeConversationId,
        messages: state.activeConversationId === id ? [] : state.messages,
      }))
      toast.success('Conversation removed.')
    } catch (err) {
      toast.error('Failed to delete conversation')
    }
  },
}))
