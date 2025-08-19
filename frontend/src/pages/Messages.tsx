import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import socketService from '@/services/socketService'
import ConversationsList from '@/components/message/ConversationsList'
import ChatInterface from '@/components/message/ChatInterface'
import NewConversationModal from '@/components/message/NewConversationModal'
import { type Conversation } from '@/services/messageService'

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)

  useEffect(() => {
    // Connect to Socket.IO when component mounts
    socketService.connect()

    // Handle window resize
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // Don't disconnect socket here as it might be used by other components
    }
  }, [])

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  const handleCloseChat = () => {
    setSelectedConversation(null)
  }

  const handleNewConversation = () => {
    setShowNewConversation(true)
  }

  const handleCloseNewConversation = () => {
    setShowNewConversation(false)
  }

  const handleConversationCreated = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowNewConversation(false)
  }

  // Mobile view - show only chat or conversation list
  if (isMobileView) {
    if (selectedConversation) {
      return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900">
          <ChatInterface 
            conversation={selectedConversation} 
            onClose={handleCloseChat}
          />
        </div>
      )
    }

    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
        <ConversationsList
          selectedConversationId={selectedConversation?._id}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
        {showNewConversation && (
          <NewConversationModal
            onClose={handleCloseNewConversation}
            onConversationCreated={handleConversationCreated}
          />
        )}
      </div>
    )
  }

  // Desktop view - show both sides
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-full">
        {/* Conversations sidebar */}
        <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-gray-200 dark:border-gray-700">
          <ConversationsList
            selectedConversationId={selectedConversation?._id}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1">
          {selectedConversation ? (
            <ChatInterface conversation={selectedConversation} />
          ) : (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to Messages
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Select a conversation to start chatting or create a new one
                </p>
                <button
                  onClick={handleNewConversation}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors font-medium"
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNewConversation && (
        <NewConversationModal
          onClose={handleCloseNewConversation}
          onConversationCreated={handleConversationCreated}
        />
      )}
    </div>
  )
}