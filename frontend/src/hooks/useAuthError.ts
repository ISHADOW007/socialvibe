import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export interface AuthError {
  status?: number
  message?: string
  code?: string
}

export const useAuthError = () => {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuthStore()

  const handleAuthError = async (error: AuthError) => {
    // Handle different types of auth errors
    switch (error.status) {
      case 401:
        // Unauthorized - token expired or invalid
        if (isAuthenticated) {
          toast.error('Your session has expired. Please log in again.')
          await logout()
          navigate('/login', { replace: true })
        }
        break

      case 403:
        // Forbidden - profile incomplete or access denied
        if (error.message?.includes('profile')) {
          toast.error('Please complete your profile to continue.')
        } else {
          toast.error('Access denied. You do not have permission to perform this action.')
        }
        break

      case 429:
        // Rate limiting
        toast.error('Too many requests. Please wait a moment and try again.')
        break

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        toast.error('Server is temporarily unavailable. Please try again later.')
        break

      default:
        // Generic error handling
        if (error.message) {
          toast.error(error.message)
        } else {
          toast.error('An unexpected error occurred. Please try again.')
        }
    }
  }

  const isAuthError = (error: any): error is AuthError => {
    return error && (
      typeof error.status === 'number' ||
      typeof error.message === 'string' ||
      typeof error.code === 'string'
    )
  }

  return {
    handleAuthError,
    isAuthError
  }
}

// Hook for automatically handling auth errors in components
export const useAuthErrorHandler = () => {
  const { handleAuthError, isAuthError } = useAuthError()

  const withErrorHandling = async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      return await asyncFn()
    } catch (error) {
      if (isAuthError(error)) {
        await handleAuthError(error)
      } else {
        console.error('Unhandled error:', error)
        toast.error('An unexpected error occurred')
      }
      return null
    }
  }

  return {
    withErrorHandling,
    handleAuthError,
    isAuthError
  }
}

// Hook for monitoring token expiration
export const useTokenExpiration = () => {
  const { tokens, refreshToken, logout } = useAuthStore()

  useEffect(() => {
    if (!tokens?.accessToken) return

    // Parse JWT to get expiration time
    try {
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]))
      const expirationTime = payload.exp * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime

      // If token expires in less than 5 minutes, try to refresh
      const refreshThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds

      if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
        // Token is about to expire, try to refresh
        refreshToken().catch(async (error) => {
          console.error('Failed to refresh token:', error)
          toast.error('Your session has expired. Please log in again.')
          await logout()
        })
      } else if (timeUntilExpiry <= 0) {
        // Token has already expired
        logout().then(() => {
          toast.error('Your session has expired. Please log in again.')
        })
      }
    } catch (error) {
      console.error('Failed to parse token:', error)
    }
  }, [tokens?.accessToken, refreshToken, logout])
}