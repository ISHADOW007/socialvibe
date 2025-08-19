import { useState } from 'react'
import { userService, type User } from '@/services/userService'
import socketService from '@/services/socketService'

interface FollowButtonProps {
  user: User
  onFollowChange?: (isFollowing: boolean, newFollowersCount: number) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
}

export default function FollowButton({ 
  user, 
  onFollowChange, 
  size = 'md',
  variant = 'primary'
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowed || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFollow = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await userService.toggleFollowUser(user._id)
      
      setIsFollowing(response.isFollowing)
      
      // Emit socket event for real-time notification
      if (response.isFollowing) {
        socketService.newFollow(user._id)
      }

      // Notify parent component
      if (onFollowChange) {
        onFollowChange(response.isFollowing, response.followersCount)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to update follow status')
      console.error('Follow error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      case 'md':
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const getVariantClasses = () => {
    if (isFollowing) {
      return 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-red-500 hover:text-white'
    }

    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
      case 'outline':
        return 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
      case 'primary':
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700'
    }
  }

  const getButtonText = () => {
    if (loading) {
      return isFollowing ? 'Unfollowing...' : 'Following...'
    }
    
    return isFollowing ? 'Unfollow' : 'Follow'
  }

  return (
    <div className="relative">
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`
          ${getSizeClasses()}
          ${getVariantClasses()}
          font-semibold rounded-lg transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          group relative overflow-hidden
        `}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
          </div>
        )}
        
        {/* Button text */}
        <span className={loading ? 'opacity-0' : 'opacity-100'}>
          {getButtonText()}
        </span>

        {/* Hover effect for unfollow */}
        {isFollowing && (
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            Unfollow
          </span>
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-100 dark:bg-red-900/20 
                      border border-red-300 dark:border-red-700 rounded text-xs text-red-600 dark:text-red-400 z-10">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}