import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Cog6ToothIcon,
  UserPlusIcon,
  UserMinusIcon,
  EllipsisHorizontalIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  HeartIcon,
  PlayIcon,
  PlusIcon,
  CameraIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  BookmarkIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useAuthStore } from '@/store/authStore'
import { userService, type User } from '@/services/userService'
import { messageService } from '@/services/messageService'
import { postService, type Post } from '@/services/postService'
import { reelService, type Reel } from '@/services/reelService'
import Button from '@/components/ui/Button'
import FollowButton from '@/components/user/FollowButton'
import FollowersModal from '@/components/user/FollowersModal'
import PostCard from '@/components/post/PostCard'
import CreatePostModal from '@/components/post/CreatePostModal'
import { clsx } from 'clsx'

type TabType = 'posts' | 'reels' | 'saved' | 'tagged'

export default function Profile() {
  const { username } = useParams<{ username?: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [postsPage, setPostsPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const observerRef = useRef<HTMLDivElement>(null)
  
  const isOwnProfile = !username || currentUser?.username === username
  const targetUsername = username || currentUser?.username

  // Load user profile
  useEffect(() => {
    if (targetUsername) {
      loadUserProfile()
    }
  }, [targetUsername])

  // Load posts when user changes or tab changes
  useEffect(() => {
    if (user && (activeTab === 'posts' || activeTab === 'reels')) {
      loadUserContent()
    }
  }, [user, activeTab])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !loadingPosts && activeTab === 'posts') {
          loadMorePosts()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMorePosts, loadingPosts, activeTab])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const userData = await userService.getUserByUsername(targetUsername!)
      setUser(userData)
    } catch (error) {
      console.error('Error loading user profile:', error)
      navigate('/404')
    } finally {
      setLoading(false)
    }
  }

  const loadUserContent = async () => {
    if (!user) return
    
    try {
      setLoadingPosts(true)
      if (activeTab === 'posts') {
        const response = await postService.getUserPosts(user._id, 1, 12)
        setPosts(response.data.posts)
        setHasMorePosts(response.data.pagination.hasNext)
        setPostsPage(2)
      } else if (activeTab === 'reels') {
        const response = await reelService.getUserReels(user._id, 1, 12)
        setReels(response.data.items)
      }
    } catch (error) {
      console.error('Error loading user content:', error)
    } finally {
      setLoadingPosts(false)
    }
  }

  const loadMorePosts = async () => {
    if (!user || loadingPosts) return
    
    try {
      setLoadingPosts(true)
      const response = await postService.getUserPosts(user._id, postsPage, 12)
      setPosts(prev => [...prev, ...response.data])
      setHasMorePosts(response.pagination.hasNextPage)
      setPostsPage(prev => prev + 1)
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleFollowChange = (isFollowing: boolean, newFollowersCount: number) => {
    setUser(prev => prev ? {
      ...prev,
      isFollowed: isFollowing,
      stats: { ...prev.stats, followersCount: newFollowersCount }
    } : null)
  }

  const handleMessageUser = async () => {
    if (!user) return
    
    try {
      const conversation = await messageService.getOrCreateDirectConversation(user._id)
      navigate(`/messages?conversation=${conversation._id}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !isOwnProfile) return

    try {
      const { avatarUrl } = await userService.updateAvatar(file)
      setUser(prev => prev ? {
        ...prev,
        profile: { ...prev.profile, avatar: avatarUrl }
      } : null)

      // Update authStore if this is the current user's profile
      if (currentUser && user && user._id === currentUser._id) {
        const { updateUser } = useAuthStore.getState()
        updateUser({
          ...currentUser,
          profile: { ...currentUser.profile, avatar: avatarUrl }
        })
      }
    } catch (error) {
      console.error('Error updating avatar:', error)
    }
  }

  const handleCreatePost = async (postData: any) => {
    try {
      const newPost = await postService.createPost(postData)
      setPosts(prev => Array.isArray(prev) ? [newPost, ...prev] : [newPost])
      setUser(prev => prev ? {
        ...prev,
        stats: { ...prev.stats, postsCount: prev.stats.postsCount + 1 }
      } : null)
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return
    
    try {
      const { isLiked, likesCount } = await postService.toggleLikePost(postId)
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { 
              ...post, 
              likes: isLiked 
                ? [...post.likes, currentUser._id] 
                : post.likes.filter(id => id !== currentUser._id),
              stats: { ...post.stats, likesCount }
            }
          : post
      ))
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleAddComment = async (postId: string, text: string): Promise<{ comment: any; commentsCount: number }> => {
    try {
      const { comment, commentsCount } = await postService.addComment(postId, text)
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { 
              ...post, 
              comments: [...(post.comments || []), comment],
              stats: { ...post.stats, commentsCount }
            }
          : post
      ))
      return { comment, commentsCount }
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">User not found</h2>
          <p className="text-gray-400">This user doesn't exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Profile Header */}
      <div className="bg-dark-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-dark-border">
        <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Avatar */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gradient-primary">
                {user.profile.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={`${user.username}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              
              {isOwnProfile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <CameraIcon className="w-5 h-5 text-white" />
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            {/* Username and Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0 mb-6">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                {user.profile.isVerified && (
                  <CheckBadgeIcon className="w-6 h-6 text-blue-500" />
                )}
              </div>
              
              <div className="flex items-center justify-center space-x-3">
                {isOwnProfile ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/settings')}
                      icon={<Cog6ToothIcon className="w-4 h-4" />}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      onClick={() => setShowCreatePost(true)}
                      icon={<PlusIcon className="w-4 h-4" />}
                    >
                      New Post
                    </Button>
                  </>
                ) : (
                  <>
                    <FollowButton 
                      user={user} 
                      onFollowChange={handleFollowChange}
                      size="md"
                      variant="primary"
                    />
                    <Button 
                      variant="secondary" 
                      onClick={handleMessageUser}
                      icon={<ChatBubbleLeftIcon className="w-4 h-4" />}
                    >
                      Message
                    </Button>
                    <Button variant="ghost" size="sm">
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-center md:justify-start space-x-8 mb-6">
              <div className="text-center">
                <div className="font-bold text-white text-xl">{user.stats.postsCount}</div>
                <div className="text-gray-400 text-sm">posts</div>
              </div>
              <button 
                onClick={() => setShowFollowers(true)}
                className="text-center hover:opacity-75 transition-opacity"
              >
                <div className="font-bold text-white text-xl">{user.stats.followersCount}</div>
                <div className="text-gray-400 text-sm">followers</div>
              </button>
              <button 
                onClick={() => setShowFollowing(true)}
                className="text-center hover:opacity-75 transition-opacity"
              >
                <div className="font-bold text-white text-xl">{user.stats.followingCount}</div>
                <div className="text-gray-400 text-sm">following</div>
              </button>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              {user.profile.fullName && (
                <p className="font-medium text-white">{user.profile.fullName}</p>
              )}
              {user.profile.bio && (
                <p className="text-gray-300 whitespace-pre-wrap">{user.profile.bio}</p>
              )}
              {user.profile.website && (
                <a 
                  href={user.profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {user.profile.website}
                </a>
              )}
              {user.profile.location && (
                <p className="text-gray-400 text-sm">📍 {user.profile.location}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-dark-surface/50 backdrop-blur-sm rounded-2xl border border-dark-border overflow-hidden">
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setActiveTab('posts')}
            className={clsx(
              'flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-medium transition-colors',
              activeTab === 'posts'
                ? 'text-white border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-gray-300'
            )}
          >
            <Squares2X2Icon className="w-5 h-5" />
            <span>Posts</span>
          </button>
          
          <button
            onClick={() => setActiveTab('reels')}
            className={clsx(
              'flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-medium transition-colors',
              activeTab === 'reels'
                ? 'text-white border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-gray-300'
            )}
          >
            <RectangleStackIcon className="w-5 h-5" />
            <span>Reels</span>
          </button>
          
          {isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab('saved')}
                className={clsx(
                  'flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-medium transition-colors',
                  activeTab === 'saved'
                    ? 'text-white border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                <BookmarkIcon className="w-5 h-5" />
                <span>Saved</span>
              </button>
              
              <button
                onClick={() => setActiveTab('tagged')}
                className={clsx(
                  'flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-medium transition-colors',
                  activeTab === 'tagged'
                    ? 'text-white border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                <UserGroupIcon className="w-5 h-5" />
                <span>Tagged</span>
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Posts Grid */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {posts.length > 0 ? (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onLike={handleLikePost}
                      onComment={handleAddComment}
                      currentUserId={currentUser?._id}
                    />
                  ))}
                  
                  {/* Loading more indicator */}
                  {loadingPosts && (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    </div>
                  )}
                  
                  {/* Infinite scroll trigger */}
                  {hasMorePosts && <div ref={observerRef} className="h-4" />}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📷</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isOwnProfile ? 'Share your first photo' : 'No posts yet'}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile 
                      ? 'Start sharing moments with your followers.' 
                      : `${user.username} hasn't shared any posts yet.`
                    }
                  </p>
                  {isOwnProfile && (
                    <Button onClick={() => setShowCreatePost(true)} icon={<PlusIcon className="w-4 h-4" />}>
                      Create Post
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reels Grid */}
          {activeTab === 'reels' && (
            <div>
              {reels.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {reels.map((reel) => (
                    <div
                      key={reel._id}
                      className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => navigate(`/reels/${reel._id}`)}
                    >
                      <img
                        src={reel.thumbnailUrl || reel.videoUrl}
                        alt="Reel thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <PlayIcon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute bottom-2 left-2 text-white text-xs">
                        {reel.stats.viewsCount} views
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎬</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isOwnProfile ? 'Create your first reel' : 'No reels yet'}
                  </h3>
                  <p className="text-gray-400">
                    {isOwnProfile 
                      ? 'Share short videos to engage with your audience.' 
                      : `${user.username} hasn't shared any reels yet.`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Other tabs content */}
          {(activeTab === 'saved' || activeTab === 'tagged') && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">Coming soon</h3>
              <p className="text-gray-400">This feature will be available soon.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreatePost={handleCreatePost}
      />

      {/* Followers Modal */}
      {showFollowers && (
        <FollowersModal
          user={user}
          onClose={() => setShowFollowers(false)}
          initialTab="followers"
        />
      )}

      {/* Following Modal */}
      {showFollowing && (
        <FollowersModal
          user={user}
          onClose={() => setShowFollowing(false)}
          initialTab="following"
        />
      )}
    </div>
  )
}