import { useState, useEffect } from 'react'
import socketService from '@/services/socketService'

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [serverUnavailable, setServerUnavailable] = useState(false)
  const [showRetryButton, setShowRetryButton] = useState(false)

  useEffect(() => {
    // Initial state check
    const checkInitialState = () => {
      const connected = socketService.isSocketConnected()
      const unavailable = !socketService.isServerAvailable()
      
      setIsConnected(connected)
      setServerUnavailable(unavailable)
      setShowRetryButton(unavailable)
      
      // Debug logging
      console.log('ConnectionStatus: Initial check - Connected:', connected, 'ServerAvailable:', !unavailable)
    }

    checkInitialState()

    // Listen to Socket.IO events directly for real-time updates
    const socket = socketService.getSocket()
    
    if (socket) {
      const handleConnect = () => {
        console.log('ConnectionStatus: Socket connected event')
        setIsConnected(true)
        setServerUnavailable(false)
        setShowRetryButton(false)
      }

      const handleDisconnect = () => {
        console.log('ConnectionStatus: Socket disconnected event')
        setIsConnected(false)
        // Don't immediately show server unavailable - wait for reconnect attempts
      }

      const handleConnectError = () => {
        console.log('ConnectionStatus: Socket connect error event')
        setIsConnected(false)
        setServerUnavailable(!socketService.isServerAvailable())
        setShowRetryButton(!socketService.isServerAvailable())
      }

      // Add event listeners
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      socket.on('connect_error', handleConnectError)

      // Cleanup function
      return () => {
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        socket.off('connect_error', handleConnectError)
      }
    } else {
      // Fallback to periodic checking if socket isn't available yet
      const fallbackInterval = setInterval(() => {
        checkInitialState()
      }, 2000)

      return () => clearInterval(fallbackInterval)
    }
  }, [])

  const handleRetryConnection = () => {
    setShowRetryButton(false)
    socketService.retryConnection()
    
    // Show retry button again after 10 seconds if still not connected
    setTimeout(() => {
      if (!socketService.isSocketConnected()) {
        setShowRetryButton(true)
      }
    }, 10000)
  }

  // Don't show anything if connected
  if (isConnected) {
    return null
  }

  // Show connection status for real-time features
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 shadow-lg max-w-sm">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Limited functionality
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Real-time features unavailable. Messages and interactions will work but may not update immediately.
            </p>
            {showRetryButton && (
              <button
                onClick={handleRetryConnection}
                className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded transition-colors"
              >
                Retry connection
              </button>
            )}
          </div>
          {!showRetryButton && (
            <div className="flex-shrink-0">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}