import { useState, useEffect } from 'react'
import { userService, type User } from '@/services/userService'
import { messageService } from '@/services/messageService'
import Modal from '@/components/ui/Modal'
import FollowButton from './FollowButton'
import { useAuthStore } from '@/store/authStore'

interface UserSearchModalProps {
  onClose: () => void
  onUserSelect?: (user: User) => void
  showMessageButton?: boolean
  title?: string
}

export default function UserSearchModal({ 
  onClose, 
  onUserSelect,
  showMessageButton = false,
  title = "Search People" 
}: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    loadSuggestedUsers()
  }, [])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(1)
      } else {
        setSearchResults([])
        setHasMore(false)
        setPage(1)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  const loadSuggestedUsers = async () => {
    try {
      setLoadingSuggestions(true)
      const response = await userService.getSuggestedUsers(10)
      setSuggestedUsers(response.users || [])
    } catch (err) {
      console.error('Failed to load suggested users:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const searchUsers = async (pageNum: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await userService.searchUsers(searchQuery.trim(), pageNum, 20)
      const newUsers = response.data?.items || []

      if (pageNum === 1) {
        setSearchResults(newUsers)
      } else {
        setSearchResults(prev => [...prev, ...newUsers])
      }

      setHasMore(response.data?.pagination?.hasNext || false)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore && searchQuery.trim()) {
      searchUsers(page + 1)
    }
  }

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    // Update user follow status in search results
    setSearchResults(prev => prev.map(u => 
      u._id === userId ? { ...u, isFollowed: isFollowing } : u
    ))
    
    // Update user follow status in suggested users
    setSuggestedUsers(prev => prev.map(u => 
      u._id === userId ? { ...u, isFollowed: isFollowing } : u
    ))
  }

  const handleStartMessage = async (user: User) => {
    try {
      const conversation = await messageService.getOrCreateDirectConversation(user._id)
      // Navigate to messages page with this conversation
      window.location.href = `/messages?conversation=${conversation._id}`
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }

  const handleUserClick = (user: User) => {
    if (onUserSelect) {
      onUserSelect(user)
    } else {
      // Navigate to user profile
      window.location.href = `/profile/${user.username}`
    }
  }

  const renderUser = (user: User) => (
    <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
      <button
        onClick={() => handleUserClick(user)}
        className="flex items-center space-x-3 flex-1 text-left"
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.profile.avatar ? (
            <img
              src={user.profile.avatar}
              alt={user.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {user.profile.fullName || user.username}
            </h3>
            {user.profile.isVerified && (
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            @{user.username}
          </p>
          {user.profile.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {user.profile.bio}
            </p>
          )}
          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{user.stats?.followersCount || 0} followers</span>
            <span>{user.stats?.followingCount || 0} following</span>
          </div>
        </div>
      </button>

      {/* Action buttons */}
      {user._id !== currentUser?._id && (
        <div className="flex items-center space-x-2 ml-3">
          {showMessageButton && (
            <button
              onClick={() => handleStartMessage(user)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}
          <FollowButton
            user={user}
            size="sm"
            onFollowChange={(isFollowing) => handleFollowChange(user._id, isFollowing)}
          />
        </div>
      )}
    </div>
  )

  const displayUsers = searchQuery.trim() ? searchResults : suggestedUsers
  const isSearching = searchQuery.trim().length >= 2

  return (
    <Modal isOpen={true} onClose={onClose} title={title}>
      <div className="w-full max-w-md">
        {/* Search input */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search people by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <svg 
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Section header */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isSearching ? 'Search Results' : 'Suggested for you'}
          </h3>
        </div>

        {/* Users list */}
        <div className="max-h-96 overflow-y-auto">
          {(loading && page === 1) || loadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p>
                {isSearching 
                  ? `No users found matching "${searchQuery}"` 
                  : 'No suggestions available'
                }
              </p>
              {isSearching && (
                <p className="text-sm mt-1">Try searching with a different term</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayUsers.map(renderUser)}

              {/* Load more button for search results */}
              {isSearching && hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {isSearching 
              ? 'Search results • Click on a user to view their profile'
              : 'People you might want to follow • Click on a user to view their profile'
            }
          </p>
        </div>
      </div>
    </Modal>
  )
}