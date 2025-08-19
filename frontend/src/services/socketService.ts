import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

export interface TypingIndicator {
  userId: string
  username: string
}

export interface UserOnlineStatus {
  userId: string
  username: string
}

export interface NewMessageEvent {
  messageId: string
  conversationId: string
  message: any
  timestamp: string
}

export interface MessageReactionEvent {
  messageId: string
  conversationId: string
  reaction: {
    user: {
      userId: string
      username: string
      avatar?: string
    }
    emoji: string
    createdAt: string
  }
  timestamp: string
}

export interface NotificationEvent {
  type: 'like' | 'comment' | 'follow' | 'story_view'
  postId?: string
  reelId?: string
  storyId?: string
  by: {
    userId: string
    username: string
    avatar?: string
  }
  timestamp: string
}

class SocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private serverUnavailable = false

  // Event listeners
  private messageListeners: ((event: NewMessageEvent) => void)[] = []
  private typingListeners: ((event: TypingIndicator) => void)[] = []
  private userOnlineListeners: ((event: UserOnlineStatus) => void)[] = []
  private userOfflineListeners: ((event: UserOnlineStatus) => void)[] = []
  private messageReadListeners: ((event: any) => void)[] = []
  private reactionListeners: ((event: MessageReactionEvent) => void)[] = []
  private notificationListeners: ((event: NotificationEvent) => void)[] = []

  connect() {
    if ((this.socket && this.isConnected) || this.serverUnavailable) {
      return
    }

    const token = useAuthStore.getState().getToken()
    if (!token) {
      console.warn('No authentication token available for Socket.IO connection')
      return
    }

    // Determine the socket server URL
    const serverUrl = import.meta.env.VITE_SOCKET_URL || 
                     import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
                     'http://localhost:5001'

    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      const serverUrl = import.meta.env.VITE_SOCKET_URL || 
                       import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
                       'http://localhost:5001'
      console.log(`✅ Connected to Socket.IO server at ${serverUrl}`)
      this.isConnected = true
      this.reconnectAttempts = 0
      this.serverUnavailable = false
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason)
      this.isConnected = false
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      
      // Provide helpful development hints
      if (import.meta.env.DEV) {
        const serverUrl = import.meta.env.VITE_SOCKET_URL || 
                         import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
                         'http://localhost:5001'
        console.warn(`💡 Socket.IO connection failed to: ${serverUrl}`)
        console.warn('💡 Make sure the backend server is running on the correct port')
        console.warn('💡 Check VITE_SOCKET_URL in .env if needed')
      }
      
      this.handleReconnect()
    })

    // Message events
    this.socket.on('new_message', (data: NewMessageEvent) => {
      this.messageListeners.forEach(listener => listener(data))
    })

    this.socket.on('message_edited', (data: any) => {
      // Handle message edited event
      console.log('Message edited:', data)
    })

    this.socket.on('message_deleted', (data: any) => {
      // Handle message deleted event
      console.log('Message deleted:', data)
    })

    this.socket.on('message_reaction_added', (data: MessageReactionEvent) => {
      this.reactionListeners.forEach(listener => listener(data))
    })

    this.socket.on('message_reaction_removed', (data: any) => {
      // Handle reaction removed
      console.log('Reaction removed:', data)
    })

    this.socket.on('messages_read', (data: any) => {
      this.messageReadListeners.forEach(listener => listener(data))
    })

    // Typing events
    this.socket.on('user_typing', (data: TypingIndicator) => {
      this.typingListeners.forEach(listener => listener(data))
    })

    this.socket.on('user_stopped_typing', (data: TypingIndicator) => {
      // Handle typing stopped
      console.log('User stopped typing:', data)
    })

    // User status events
    this.socket.on('user_online', (data: UserOnlineStatus) => {
      this.userOnlineListeners.forEach(listener => listener(data))
    })

    this.socket.on('user_offline', (data: UserOnlineStatus) => {
      this.userOfflineListeners.forEach(listener => listener(data))
    })

    // Notification events
    this.socket.on('new_like', (data: NotificationEvent) => {
      this.notificationListeners.forEach(listener => listener({ ...data, type: 'like' }))
    })

    this.socket.on('new_reel_like', (data: NotificationEvent) => {
      this.notificationListeners.forEach(listener => listener({ ...data, type: 'like' }))
    })

    this.socket.on('new_comment_notification', (data: NotificationEvent) => {
      this.notificationListeners.forEach(listener => listener({ ...data, type: 'comment' }))
    })

    this.socket.on('new_follower', (data: NotificationEvent) => {
      this.notificationListeners.forEach(listener => listener({ ...data, type: 'follow' }))
    })

    this.socket.on('story_viewed', (data: NotificationEvent) => {
      this.notificationListeners.forEach(listener => listener({ ...data, type: 'story_view' }))
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached. Socket.IO will remain disconnected.')
      this.serverUnavailable = true
      return
    }

    setTimeout(() => {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect()
    }, Math.min(this.reconnectDelay * this.reconnectAttempts, 10000)) // Cap at 10 seconds
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Room management
  joinConversation(conversationId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_conversation', conversationId)
    } else if (!this.serverUnavailable) {
      console.warn('Cannot join conversation: Socket not connected')
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_conversation', conversationId)
    }
  }

  // Message events
  sendMessage(data: { conversationId: string; content: string; messageId: string }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', data)
    } else if (!this.serverUnavailable) {
      console.warn('Cannot send real-time message: Socket not connected. Message will be sent via API only.')
    }
  }

  startTyping(conversationId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { conversationId })
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { conversationId })
    }
  }

  markMessageRead(conversationId: string, messageId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_message_read', { conversationId, messageId })
    }
  }

  // Social interaction events
  likePost(postId: string, postAuthorId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('like_post', { postId, postAuthorId })
    }
  }

  likeReel(reelId: string, reelAuthorId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('like_reel', { reelId, reelAuthorId })
    }
  }

  newComment(postId: string, postAuthorId: string, comment: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('new_comment', { postId, postAuthorId, comment })
    }
  }

  newFollow(followedUserId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('new_follow', { followedUserId })
    }
  }

  viewStory(storyId: string, storyAuthorId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('view_story', { storyId, storyAuthorId })
    }
  }

  // Event listeners
  onNewMessage(callback: (event: NewMessageEvent) => void) {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter(listener => listener !== callback)
    }
  }

  onTyping(callback: (event: TypingIndicator) => void) {
    this.typingListeners.push(callback)
    return () => {
      this.typingListeners = this.typingListeners.filter(listener => listener !== callback)
    }
  }

  onUserOnline(callback: (event: UserOnlineStatus) => void) {
    this.userOnlineListeners.push(callback)
    return () => {
      this.userOnlineListeners = this.userOnlineListeners.filter(listener => listener !== callback)
    }
  }

  onUserOffline(callback: (event: UserOnlineStatus) => void) {
    this.userOfflineListeners.push(callback)
    return () => {
      this.userOfflineListeners = this.userOfflineListeners.filter(listener => listener !== callback)
    }
  }

  onMessageRead(callback: (event: any) => void) {
    this.messageReadListeners.push(callback)
    return () => {
      this.messageReadListeners = this.messageReadListeners.filter(listener => listener !== callback)
    }
  }

  onReaction(callback: (event: MessageReactionEvent) => void) {
    this.reactionListeners.push(callback)
    return () => {
      this.reactionListeners = this.reactionListeners.filter(listener => listener !== callback)
    }
  }

  onNotification(callback: (event: NotificationEvent) => void) {
    this.notificationListeners.push(callback)
    return () => {
      this.notificationListeners = this.notificationListeners.filter(listener => listener !== callback)
    }
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected
  }

  isServerAvailable(): boolean {
    return !this.serverUnavailable
  }

  retryConnection() {
    this.serverUnavailable = false
    this.reconnectAttempts = 0
    this.connect()
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

// Export singleton instance
export const socketService = new SocketService()
export default socketService