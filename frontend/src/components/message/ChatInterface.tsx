import { useState, useEffect, useRef } from 'react'
import { messageService, type Conversation, type Message } from '@/services/messageService'
import { useAuthStore } from '@/store/authStore'
import socketService from '@/services/socketService'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

interface ChatInterfaceProps {
  conversation: Conversation
  onClose?: () => void
}

export default function ChatInterface({ conversation, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user: currentUser } = useAuthStore()
  const currentPage = useRef(1)

  useEffect(() => {
    loadMessages()
    markMessagesAsRead()
    
    // Join conversation room for real-time updates
    socketService.joinConversation(conversation._id)
    
    return () => {
      // Leave conversation room on unmount
      socketService.leaveConversation(conversation._id)
    }
  }, [conversation._id])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Set up real-time message listeners
    const unsubscribeNewMessage = socketService.onNewMessage((event) => {
      if (event.conversationId === conversation._id) {
        setMessages(prev => [...prev, event.message])
        // Auto-mark as read if conversation is active
        setTimeout(() => markMessagesAsRead(), 100)
      }
    })

    const unsubscribeTyping = socketService.onTyping((event) => {
      if (event.userId !== currentUser?._id) {
        setTypingUsers(prev => {
          if (!prev.includes(event.username)) {
            return [...prev, event.username]
          }
          return prev
        })
        
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(user => user !== event.username))
        }, 3000)
      }
    })

    const unsubscribeReaction = socketService.onReaction((event) => {
      if (event.conversationId === conversation._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === event.messageId 
            ? { 
                ...msg, 
                reactions: [
                  ...msg.reactions, 
                  {
                    ...event.reaction,
                    user: {
                      _id: event.reaction.user.userId ,//|| event.reaction.user._id,
                      username: event.reaction.user.username,
                      profile: {
                        avatar: event.reaction.user.avatar,
                        // Add other profile fields if needed
                      }
                    }
                  }
                ] 
              }
            : msg
        ))
      }
    })

    // Fallback polling for messages when Socket.IO is not available
    let messagesPollInterval: NodeJS.Timeout | undefined
    
    const startMessagePolling = () => {
      messagesPollInterval = setInterval(async () => {
        if (!socketService.isSocketConnected() && !loading) {
          try {
            const response = await messageService.getConversationMessages(conversation._id, 1, 20)
            const latestMessages = (response.data || []) as unknown as Message[]
            
            // Only update if we have new messages
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m._id))
              const newMessages = latestMessages.filter(m => !existingIds.has(m._id))
              
              if (newMessages.length > 0) {
                return [...prev, ...newMessages].sort((a, b) => 
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
              }
              return prev
            })
          } catch (err) {
            console.warn('Message polling failed:', err)
          }
        }
      }, 5000) // Poll every 5 seconds for messages when offline
    }

    // Start polling after 3 seconds if not connected
    const msgPollTimer = setTimeout(() => {
      if (!socketService.isSocketConnected()) {
        startMessagePolling()
      }
    }, 3000)

    return () => {
      unsubscribeNewMessage()
      unsubscribeTyping()
      unsubscribeReaction()
      clearTimeout(msgPollTimer)
      if (messagesPollInterval) {
        clearInterval(messagesPollInterval)
      }
    }
  }, [conversation._id, currentUser?._id, loading])

  const loadMessages = async (page = 1) => {
    try {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)

      const response = await messageService.getConversationMessages(conversation._id, page, 50)
      const newMessages = response.data || []

      if (page === 1) {
        setMessages(newMessages.reverse()) // Reverse to show oldest first
      } else {
        setMessages(prev => [
          ...(Array.isArray(newMessages) ? newMessages.slice().reverse() : []),
          ...prev
        ])
      }

      setHasMoreMessages(response.pagination?.hasNext || false)
      currentPage.current = page
    } catch (err: any) {
      setError(err.message || 'Failed to load messages')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreMessages = () => {
    if (!loadingMore && hasMoreMessages) {
      loadMessages(currentPage.current + 1)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      await messageService.markMessagesAsRead(conversation._id)
    } catch (err) {
      console.error('Failed to mark messages as read:', err)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (content: string, media?: File, replyTo?: Message) => {
    if ((!content?.trim() && !media) || sending) return

    try {
      setSending(true)
      
      const messageData = {
        content: content?.trim(),
        media,
        replyToMessageId: replyTo?._id
      }

      const newMessage = await messageService.sendMessage(conversation._id, messageData)
      
      // Add message to local state immediately for better UX
      setMessages(prev => [...prev, newMessage])
      
      // Emit real-time event
      socketService.sendMessage({
        conversationId: conversation._id,
        content: content?.trim() || '',
        messageId: newMessage._id
      })

      scrollToBottom()
    } catch (err: any) {
      console.error('Failed to send message:', err)
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (isTyping: boolean) => {
    if (isTyping) {
      socketService.startTyping(conversation._id)
    } else {
      socketService.stopTyping(conversation._id)
    }
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const editedMessage = await messageService.editMessage(
        messageId,
        newContent
      )
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? editedMessage : msg
      ))
    } catch (err: any) {
      console.error('Failed to edit message:', err)
    }
  }

  const handleDeleteMessage = async (messageId: string, deleteFor: 'me' | 'everyone') => {
    try {
      await messageService.deleteMessage(messageId, deleteFor)
      
      if (deleteFor === 'everyone') {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, isDeleted: true, content: 'This message was deleted' }
            : msg
        ))
      } else {
        setMessages(prev => prev.filter(msg => msg._id !== messageId))
      }
    } catch (err: any) {
      console.error('Failed to delete message:', err)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await messageService.addReaction(messageId, emoji)
      // Real-time update will be handled by socket listener
    } catch (err: any) {
      console.error('Failed to add reaction:', err)
    }
  }

  const getConversationTitle = (): string => {
    if (conversation.conversationType === 'group') {
      return conversation.groupInfo?.name || 'Group Chat'
    }
    
    const otherParticipant = conversation.participants.find(p => p._id !== currentUser?._id)
    return otherParticipant?.profile.fullName || otherParticipant?.username || 'Unknown User'
  }

  const getConversationAvatar = (): string | undefined => {
    if (conversation.conversationType === 'group') {
      return conversation.groupInfo?.avatar
    }
    
    const otherParticipant = conversation.participants.find(p => p._id !== currentUser?._id)
    return otherParticipant?.profile.avatar
  }

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container && container.scrollTop === 0 && hasMoreMessages && !loadingMore) {
      loadMoreMessages()
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          {/* Back button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Avatar */}
          <div className="flex-shrink-0">
            {getConversationAvatar() ? (
              <img
                src={getConversationAvatar()}
                alt={getConversationTitle()}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {getConversationTitle().charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Title */}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {getConversationTitle()}
              </h3>
              {!socketService.isSocketConnected() && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Limited real-time features" />
              )}
            </div>
            {typingUsers.length > 0 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Load more button */}
        {hasMoreMessages && (
          <div className="text-center">
            <button
              onClick={loadMoreMessages}
              disabled={loadingMore}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {loadingMore ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Messages list */}
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1]
          const showAvatar = !prevMessage || prevMessage.sender._id !== message.sender._id
          
          return (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={message.sender._id === currentUser?._id}
              showAvatar={showAvatar}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onReaction={handleReaction}
            />
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={sending}
      />
    </div>
  )
}