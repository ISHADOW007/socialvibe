import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'file'
  url: string
  thumbnail?: string
  name?: string
  size?: number
  mimeType?: string
}

export interface MessageReaction {
  user: {
    _id: string
    username: string
    profile: {
      avatar?: string
    }
  }
  emoji: string
  createdAt: string
}

export interface ReadReceipt {
  user: {
    _id: string
    username: string
  }
  readAt: string
}

export interface Message {
  _id: string
  conversation: string
  sender: {
    _id: string
    username: string
    profile: {
      avatar?: string
      fullName?: string
      isVerified: boolean
    }
  }
  content?: string
  media?: MessageMedia
  replyTo?: {
    _id: string
    content?: string
    sender: {
      _id: string
      username: string
    }
  }
  messageType: 'text' | 'media' | 'system'
  readBy: ReadReceipt[]
  reactions: MessageReaction[]
  isEdited: boolean
  editedAt?: string
  isDeleted: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  _id: string
  participants: Array<{
    _id: string
    username: string
    profile: {
      avatar?: string
      fullName?: string
      isVerified: boolean
    }
  }>
  conversationType: 'direct' | 'group'
  groupInfo?: {
    name: string
    description?: string
    avatar?: string
    admins: string[]
    createdBy: string
  }
  lastMessage?: Message
  lastActivity: string
  isArchived: boolean
  mutedBy: Array<{
    user: string
    mutedUntil?: string
  }>
  pinnedBy: string[]
  createdAt: string
  updatedAt: string
}

export interface SendMessageData {
  content?: string
  replyToMessageId?: string
  media?: File
}

export const messageService = {
  // Get user's conversations
  getConversations: async (page = 1, limit = 20): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get<PaginatedResponse<Conversation>>('/messages/conversations', {
      params: { page, limit }
    })
    return response.data
  },

  // Get or create direct conversation
  getOrCreateDirectConversation: async (userId: string): Promise<Conversation> => {
    const response = await api.get<ApiResponse<{ conversation: Conversation }>>(
      `/messages/conversations/direct/${userId}`
    )
    return response.data.data!.conversation
  },

  // Get conversation messages
  getConversationMessages: async (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Message>> => {
    const response = await api.get<PaginatedResponse<Message>>(
      `/messages/conversations/${conversationId}/messages`,
      {
        params: { page, limit }
      }
    )
    return response.data
  },

  // Send message
  sendMessage: async (conversationId: string, data: SendMessageData): Promise<Message> => {
    const formData = new FormData()
    
    if (data.content) {
      formData.append('content', data.content)
    }
    
    if (data.replyToMessageId) {
      formData.append('replyToMessageId', data.replyToMessageId)
    }
    
    if (data.media) {
      formData.append('media', data.media)
    }

    const response = await api.post<ApiResponse<{ message: Message }>>(
      `/messages/conversations/${conversationId}/messages`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    )
    return response.data.data!.message
  },

  // Edit message
  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const response = await api.put<ApiResponse<{ message: Message }>>(
      `/messages/messages/${messageId}`,
      { content }
    )
    return response.data.data!.message
  },

  // Delete message
  deleteMessage: async (messageId: string, deleteFor: 'me' | 'everyone' = 'me'): Promise<void> => {
    await api.delete(`/messages/messages/${messageId}`, {
      data: { deleteFor }
    })
  },

  // Add reaction to message
  addReaction: async (messageId: string, emoji: string): Promise<void> => {
    await api.post(`/messages/messages/${messageId}/reactions`, { emoji })
  },

  // Remove reaction from message
  removeReaction: async (messageId: string): Promise<void> => {
    await api.delete(`/messages/messages/${messageId}/reactions`)
  },

  // Mark messages as read
  markMessagesAsRead: async (conversationId: string): Promise<void> => {
    await api.post(`/messages/conversations/${conversationId}/read`)
  },

  // Search messages in conversation
  searchMessages: async (
    conversationId: string,
    query: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Message> & { query: string }> => {
    const response = await api.get<PaginatedResponse<Message> & { query: string }>(
      `/messages/conversations/${conversationId}/search`,
      {
        params: { query, page, limit }
      }
    )
    return response.data
  },

  // Get unread message count
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get<ApiResponse<{ count: number }>>('/messages/unread-count')
    return response.data.data!
  },

  // Archive/Unarchive conversation
  toggleArchiveConversation: async (conversationId: string): Promise<{ isArchived: boolean }> => {
    const response = await api.post<ApiResponse<{ isArchived: boolean }>>(
      `/messages/conversations/${conversationId}/archive`
    )
    return response.data.data!
  },

  // Mute/Unmute conversation
  toggleMuteConversation: async (conversationId: string, muteUntil?: string): Promise<{ isMuted: boolean }> => {
    const response = await api.post<ApiResponse<{ isMuted: boolean }>>(
      `/messages/conversations/${conversationId}/mute`,
      { muteUntil }
    )
    return response.data.data!
  },

  // Pin/Unpin conversation
  togglePinConversation: async (conversationId: string): Promise<{ isPinned: boolean }> => {
    const response = await api.post<ApiResponse<{ isPinned: boolean }>>(
      `/messages/conversations/${conversationId}/pin`
    )
    return response.data.data!
  }
}

export default messageService