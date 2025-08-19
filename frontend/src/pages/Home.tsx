import { useState, useEffect, useRef } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { PostComment, postService, type Post } from '@/services/postService'
import { storyService } from '@/services/storyService'
import PostCard from '@/components/post/PostCard'
import CreatePostModal from '@/components/post/CreatePostModal'
import StoriesRing from '@/components/story/StoriesRing'
import CreateStoryModal from '@/components/story/CreateStoryModal'
import Button from '@/components/ui/Button'

const Home: React.FC = () => {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const observerRef = useRef<HTMLDivElement>(null)

  // Modals state
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const postsResponse = await postService.getFeedPosts(1, 10)
      
      setPosts(postsResponse.data.items)
      setHasMore(postsResponse.data.pagination.hasNext)
      setPage(2)
    } catch (error) {
      console.error('Error loading feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMorePosts = async () => {
    try {
      setLoadingMore(true)
      const response = await postService.getFeedPosts(page, 10)
      setPosts(prev => [...prev, ...response.data.items])
      setHasMore(response.data.pagination.hasNext)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleCreatePost = async (postData: any) => {
    try {
      const newPost = await postService.createPost(postData)
      setPosts(prev => [newPost, ...prev])
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
  }

  const handleCreateStory = async (storyData: any) => {
    try {
      await storyService.createStory(storyData)
      // Story creation is handled by the StoriesRing component
    } catch (error) {
      console.error('Error creating story:', error)
      throw error
    }
  }

  const handleLikePost = async (postId: string) => {
    try {
      const { isLiked, likesCount } = await postService.toggleLikePost(postId)
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { 
              ...post, 
              likes: isLiked 
                ? [...post.likes, user!._id] 
                : post.likes.filter(id => id !== user!._id),
              stats: { ...post.stats, likesCount }
            }
          : post
      ))
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleAddComment = async (
  postId: string,
  text: string
): Promise<{ comment: PostComment; commentsCount: number }> => {
  try {
    const result = await postService.addComment(postId, text)

    setPosts(prev =>
      prev.map(post =>
        post._id === postId
          ? {
              ...post,
              comments: [...post.comments, result.comment],
              stats: { ...post.stats, commentsCount: result.commentsCount }
            }
          : post
      )
    )

    return result // ✅ return the expected type
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Stories Section */}
      <StoriesRing onCreateStory={() => setShowCreateStory(true)} />

      {/* Create Post Section */}
      {user && (
        <div className="bg-dark-surface/50 backdrop-blur-sm rounded-2xl p-4 border border-dark-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-primary">
              {user.profile.avatar ? (
                <img
                  src={user.profile.avatar}
                  alt="Your avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-medium">
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex-1 text-left px-4 py-3 bg-dark-bg/50 hover:bg-dark-bg/70 rounded-full text-gray-400 transition-colors"
            >
              What's on your mind?
            </button>
            
            <Button
              onClick={() => setShowCreatePost(true)}
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Post
            </Button>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLikePost}
            onComment={handleAddComment}
            currentUserId={user?._id}
          />
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && <div ref={observerRef} className="h-4" />}

      {/* No more posts */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">You're all caught up!</p>
        </div>
      )}

      {/* Empty state */}
      {posts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="bg-dark-surface/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-border">
            <h3 className="text-xl font-semibold text-white mb-2">Welcome to SocialVibe!</h3>
            <p className="text-gray-400 mb-6">Start by following people to see their posts in your feed.</p>
            <Button onClick={() => setShowCreatePost(true)} icon={<PlusIcon className="w-4 h-4" />}>
              Create Your First Post
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreatePost={handleCreatePost}
      />

      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onCreateStory={handleCreateStory}
      />

    </div>
  )
}

export default Home