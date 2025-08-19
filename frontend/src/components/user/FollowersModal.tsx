import { useState, useEffect } from 'react'
import { userService, type User } from '@/services/userService'
import Modal from '@/components/ui/Modal'
import FollowButton from './FollowButton'
import { useAuthStore } from '@/store/authStore'

interface FollowersModalProps {
  user: User
  onClose: () => void
  initialTab?: 'followers' | 'following'
}

export default function FollowersModal({ user, onClose, initialTab = 'followers' }: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    loadUsers(1, true)
  }, [activeTab])

  const loadUsers = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = activeTab === 'followers' 
        ? await userService.getUserFollowers(user._id, pageNum, 20)
        : await userService.getUserFollowing(user._id, pageNum, 20)

      // Use response.data.items as the array of users
      const newUsers = response.data?.items || []
      
      if (reset) {
        if (activeTab === 'followers') {
          setFollowers(newUsers)
        } else {
          setFollowing(newUsers)
        }
      } else {
        if (activeTab === 'followers') {
          setFollowers(prev => [...prev, ...newUsers])
        } else {
          setFollowing(prev => [...prev, ...newUsers])
        }
      }

      setHasMore(response.pagination?.hasNext || false)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      loadUsers(page + 1, false)
    }
  }

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    // Update the user's follow status in the list
    const updateList = (users: User[]) => 
      users.map(u => u._id === userId ? { ...u, isFollowed: isFollowing } : u)

    setFollowers(prev => updateList(prev))
    setFollowing(prev => updateList(prev))
  }

  const currentUsers = activeTab === 'followers' ? followers : following

  return (
    <Modal isOpen={true} onClose={onClose} title={`${user.profile.fullName || user.username}`}>
      <div className="w-full max-w-md">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === 'followers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Followers ({user.stats?.followersCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === 'following'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Following ({user.stats?.followingCount || 0})
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Users list */}
        <div className="max-h-96 overflow-y-auto">
          {loading && page === 1 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          ) : currentUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p>
                {activeTab === 'followers' 
                  ? `${user.username} has no followers yet` 
                  : `${user.username} isn't following anyone yet`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentUsers.map((follower) => (
                <div key={follower._id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {follower.profile.avatar ? (
                        <img
                          src={follower.profile.avatar}
                          alt={follower.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                            {follower.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {follower.profile.fullName || follower.username}
                        </h3>
                        {follower.profile.isVerified && (
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{follower.username}
                      </p>
                      {follower.profile.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {follower.profile.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Follow button */}
                  {follower._id !== currentUser?._id && (
                    <div className="flex-shrink-0 ml-3">
                      <FollowButton
                        user={follower}
                        size="sm"
                        onFollowChange={(isFollowing) => handleFollowChange(follower._id, isFollowing)}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Load more button */}
              {hasMore && (
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
      </div>
    </Modal>
  )
}