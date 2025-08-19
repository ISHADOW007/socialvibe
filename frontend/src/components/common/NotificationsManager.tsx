import { useState, useEffect } from 'react'
import socketService, { type NotificationEvent } from '@/services/socketService'
import NotificationToast from './NotificationToast'

interface NotificationWithId extends NotificationEvent {
  id: string
}

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([])

  useEffect(() => {
    // Listen for real-time notifications
    const unsubscribe = socketService.onNotification((notification) => {
      const notificationWithId: NotificationWithId = {
        ...notification,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }

      setNotifications(prev => [...prev, notificationWithId])

      // Request permission for browser notifications if not already granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(getNotificationTitle(notification), {
          body: getNotificationBody(notification),
          icon: notification.by.avatar || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: notification.type, // This prevents duplicate notifications
          requireInteraction: false
        })

        // Close after 5 seconds
        setTimeout(() => {
          browserNotification.close()
        }, 5000)

        browserNotification.onclick = () => {
          // Handle notification click - navigate to relevant page
          handleNotificationClick(notification)
          browserNotification.close()
        }
      }
    })

    return unsubscribe
  }, [])

  const getNotificationTitle = (notification: NotificationEvent): string => {
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
        return 'New notification'
    }
  }

  const getNotificationBody = (notification: NotificationEvent): string => {
    switch (notification.type) {
      case 'like':
        return 'Click to view'
      case 'comment':
        return 'Click to see the comment'
      case 'follow':
        return 'Click to view profile'
      case 'story_view':
        return 'Click to see who viewed your story'
      default:
        return 'Click to view details'
    }
  }

  const handleNotificationClick = (notification: NotificationEvent) => {
    // Navigate to relevant page based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.postId) {
          window.location.href = `/posts/${notification.postId}`
        } else if (notification.reelId) {
          window.location.href = `/reels/${notification.reelId}`
        }
        break
      case 'follow':
        window.location.href = `/profile/${notification.by.username}`
        break
      case 'story_view':
        if (notification.storyId) {
          window.location.href = `/stories/${notification.storyId}`
        }
        break
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Only show the most recent 3 notifications to avoid cluttering
  const visibleNotifications = notifications.slice(-3)

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="space-y-2 p-4">
        {visibleNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              transform: `translateY(${index * 10}px)`,
              zIndex: 50 - index
            }}
          >
            <NotificationToast
              notification={notification}
              onClose={() => removeNotification(notification.id)}
              autoClose={true}
              duration={5000}
            />
          </div>
        ))}
      </div>
    </div>
  )
}