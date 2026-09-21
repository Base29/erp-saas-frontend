import apiClient from './client'

export interface GenieAction {
  id: string
  conversation_id: string
  message_id?: string
  action_type: string
  title: string
  description?: string
  payload: Record<string, any>
  status: 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed'
  execution_result?: Record<string, any>
  error_message?: string
  created_at?: string
  approved_at?: string
  executed_at?: string
}

export interface GenieMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  reasoning_content?: string | null
  attachments?: Array<{
    file_name: string
    file_path: string
    file_size?: number
    file_type?: string
    preview?: any
  }> | null
  metadata?: {
    navigation?: {
      target: string
      path: string
      label: string
    }
    quick_actions?: Array<{
      label: string
      prompt: string
      icon: string
    }>
  } | null
  actions?: GenieAction[]
  created_at?: string
}

export interface GenieConversation {
  id: string
  title: string
  messages_count?: number
  updated_at?: string
  created_at?: string
}

export interface GenieStatus {
  name: string
  model: string
  is_online: boolean
  quick_prompts: Array<{
    label: string
    prompt: string
    icon: string
  }>
}

export interface ChatResponseData {
  conversation_id: string
  conversation_title: string
  message_id: string
  content: string
  reasoning_content?: string | null
  actions: GenieAction[]
  navigation?: {
    target: string
    path: string
    label: string
  } | null
  quick_actions?: Array<{
    label: string
    prompt: string
    icon: string
  }> | null
  metadata?: {
    navigation?: {
      target: string
      path: string
      label: string
    }
    quick_actions?: Array<{
      label: string
      prompt: string
      icon: string
    }>
  } | null
}

export const fetchGenieStatus = () =>
  apiClient.get<{ data: GenieStatus }>('/v1/genie/status')

export const sendGenieChat = (
  prompt: string,
  conversationId?: string | null,
  attachments?: any[]
) =>
  apiClient.post<{ data: ChatResponseData }>('/v1/genie/chat', {
    prompt,
    conversation_id: conversationId,
    attachments,
  })

export const fetchGenieConversations = () =>
  apiClient.get<{ data: GenieConversation[] }>('/v1/genie/conversations')

export const fetchGenieConversation = (id: string) =>
  apiClient.get<{
    data: {
      id: string
      title: string
      messages: GenieMessage[]
      actions: GenieAction[]
    }
  }>(`/v1/genie/conversations/${id}`)

export const deleteGenieConversation = (id: string) =>
  apiClient.delete(`/v1/genie/conversations/${id}`)

export const uploadGenieFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post<{
    data: {
      file_name: string
      file_path: string
      file_size: number
      file_type: string
      preview?: any
    }
  }>('/v1/genie/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const approveGenieAction = (actionId: string) =>
  apiClient.post<{
    status: string
    message: string
    action: GenieAction
    result: Record<string, any>
  }>(`/v1/genie/actions/${actionId}/approve`)

export const rejectGenieAction = (actionId: string) =>
  apiClient.post<{
    status: string
    message: string
    action: GenieAction
  }>(`/v1/genie/actions/${actionId}/reject`)
