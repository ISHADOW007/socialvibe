import { useState, useEffect } from 'react'
import { type NotificationEvent } from '@/services/socketService'

interface NotificationToastProps {
  notification: NotificationEvent
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export default function NotificationToast({ 
  notification, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100)

    // Auto close
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, duration])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      case 'follow':
        return '👤'
      case 'story_view':
        return '👁️'
      default:
        return '🔔'
    }
  }

  const getTitle = () => {
    switch (notification.type) {
      case 'like':
        return 'New Like'
      case 'comment':
        return 'New Comment'
      case 'follow':
        return 'New Follower'
      case 'story_view':
        return 'Story View'
      default:
        return 'Notification'
    }
  }

  const getMessage = () => {
    const username = notification.by.username
    switch (notification.type) {
      case 'like':
        return `${username} liked your ${notification.postId ? 'post' : 'reel'}`
      case 'comment':
        return `${username} commented on your post`
      case 'follow':
        return `${username} started following you`
      case 'story_view':
        return `${username} viewed your story`
      default:
        return 'You have a new notification'
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out ${
        isVisible && !isClosing
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-lg">
              {getIcon()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getTitle()}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  {getMessage()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Just now
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Avatar */}
          {notification.by.avatar && (
            <div className="flex-shrink-0">
              <img
                src={notification.by.avatar}
                alt={notification.by.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Progress bar for auto-close */}
        {autoClose && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${duration}ms linear`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}