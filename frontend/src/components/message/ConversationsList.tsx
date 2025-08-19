import { useState, useEffect } from 'react'
import { messageService, type Conversation } from '@/services/messageService'
import { useAuthStore } from '@/store/authStore'
import socketService from '@/services/socketService'

interface ConversationsListProps {
  selectedConversationId?: string
  onSelectConversation: (conversation: Conversation) => void
  onNewConversation: () => void
}

export default function ConversationsList({ 
  selectedConversationId, 
  onSelectConversation, 
  onNewConversation 
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    // Listen for new messages to update conversation list
    const unsubscribe = socketService.onNewMessage((event) => {
      setConversations(prev => {
        // Ensure prev is always an array
        const safeConversations = Array.isArray(prev) ? prev : []
        
        return safeConversations.map(conv => 
          conv._id === event.conversationId 
            ? { ...conv, lastMessage: event.message, lastActivity: event.timestamp }
            : conv
        )
      })
    })

    // Fallback polling when Socket.IO is not available
    let pollInterval: NodeJS.Timeout | undefined
    
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        if (!socketService.isSocketConnected() && !loading) {
          try {
            const response = await messageService.getConversations(1, 50)
            
            // Apply same validation as loadConversations
            if (response && typeof response === 'object' && Array.isArray(response.data)) {
              setConversations(response.data)
            } else {
              console.warn('Polling returned invalid conversations data:', response)
            }
          } catch (err) {
            console.warn('Polling failed:', err)
          }
        }
      }, 10000) // Poll every 10 seconds when offline
    }

    // Start polling after 5 seconds if not connected
    const pollTimer = setTimeout(() => {
      if (!socketService.isSocketConnected()) {
        startPolling()
      }
    }, 5000)

    return () => {
      unsubscribe()
      clearTimeout(pollTimer)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [loading])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const response = await messageService.getConversations(1, 50)
      
      // Add runtime type checking and logging
      if (response && typeof response === 'object') {
        const conversationsData = response.data
        
        if (Array.isArray(conversationsData)) {
          setConversations(conversationsData)
        } else {
          console.warn('API returned non-array data for conversations:', conversationsData)
          setConversations([])
        }
      } else {
        console.warn('Invalid API response structure:', response)
        setConversations([])
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err)
      setError(err.message || 'Failed to load conversations')
      setConversations([]) // Ensure it's always an array even on error
    } finally {
      setLoading(false)
    }
  }

  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.conversationType === 'group') {
      return conversation.groupInfo?.name || 'Group Chat'
    }
    
    const otherParticipant = conversation.participants.find(p => p._id !== currentUser?._id)
    return otherParticipant?.profile.fullName || otherParticipant?.username || 'Unknown User'
  }

  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.conversationType === 'group') {
      return conversation.groupInfo?.avatar
    }
    
    const otherParticipant = conversation.participants.find(p => p._id !== currentUser?._id)
    return otherParticipant?.profile.avatar
  }

  const formatLastMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.lastMessage) {
      return 'No messages yet'
    }

    const message = conversation.lastMessage
    const senderName = message.sender._id === currentUser?._id ? 'You' : message.sender.username

    if (message.media) {
      const mediaType = message.media.type
      return `${senderName}: ${mediaType === 'image' ? '📷 Photo' : '🎥 Video'}`
    }

    if (message.content) {
      const preview = message.content.length > 50 
        ? `${message.content.substring(0, 50)}...` 
        : message.content
      return `${senderName}: ${preview}`
    }

    return `${senderName}: Message`
  }

  // Defensive programming: ensure conversations is always an array
  const safeConversations = Array.isArray(conversations) ? conversations : []
  
  const filteredConversations = safeConversations.filter(conversation =>
    getConversationTitle(conversation).toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadConversations}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
          <button
            onClick={onNewConversation}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
            title="New message"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Start a conversation with your friends!'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewConversation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send your first message
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredConversations.map((conversation) => {
              const isSelected = conversation._id === selectedConversationId
              const title = getConversationTitle(conversation)
              const avatar = getConversationAvatar(conversation)
              const lastMessagePreview = getLastMessagePreview(conversation)
              const lastMessageTime = formatLastMessageTime(conversation.lastActivity)

              return (
                <button
                  key={conversation._id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={title}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                          {title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {lastMessageTime}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {lastMessagePreview}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {conversation.lastMessage && (
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}