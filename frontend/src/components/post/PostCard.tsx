import { useState } from 'react'
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  BookmarkIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid 
} from '@heroicons/react/24/solid'
import { clsx } from 'clsx'
import CommentModal from '@/components/common/CommentModal'

interface PostMedia {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  width?: number
  height?: number
}

interface PostAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

interface PostComment {
  _id: string
  author: PostAuthor
  text: string
  likes: string[]
  replies: any[]
  createdAt: string
}

interface Post {
  _id: string
  author: PostAuthor
  caption?: string
  media: PostMedia[]
  hashtags: string[]
  mentions: string[]
  likes: string[]
  comments: PostComment[]
  stats: {
    likesCount: number
    commentsCount: number
    sharesCount: number
    viewsCount: number
  }
  location?: {
    name: string
    coordinates?: [number, number]
  }
  hideLikeCount: boolean
  commentsDisabled: boolean
  timeAgo: string
  createdAt: string
}

interface PostCardProps {
  post: Post
  currentUserId?: string
  onLike: (postId: string) => void
  onComment: (postId: string, text: string) => Promise<{ comment: PostComment; commentsCount: number }>
  onShare?: (postId: string) => void
  onSave?: (postId: string) => void
  onUserClick?: (username: string) => void
  className?: string
}

export default function PostCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserClick = () => {},
  className
}: PostCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [liked, setLiked] = useState(currentUserId ? post.likes.includes(currentUserId) : false)
  const [saved, setSaved] = useState(false) // You'd track this in your app state

  const handleLike = () => {
    setLiked(!liked)
    onLike(post._id)
  }

  const handleShare = () => {
    onShare?.(post._id)
  }

  const handleSave = () => {
    setSaved(!saved)
    onSave?.(post._id)
  }

  const formatHashtags = (text: string) => {
    return text.replace(/#(\w+)/g, '<span class="text-primary-400 hover:underline cursor-pointer">#$1</span>')
  }

  const formatMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-primary-400 hover:underline cursor-pointer">@$1</span>')
  }

  return (
    <article className={clsx('post-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onUserClick(post.author.username)}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-primary">
              {post.author.profile.avatar ? (
                <img
                  src={post.author.profile.avatar}
                  alt={`${post.author.username}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-medium">
                  {post.author.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-medium text-white">{post.author.username}</span>
                {post.author.profile.isVerified && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {post.location && (
                <p className="text-xs text-gray-400">{post.location.name}</p>
              )}
            </div>
          </button>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      <div className="relative mb-4 rounded-xl overflow-hidden bg-dark-surface">
        {post.media.length > 0 && (
          <div className="aspect-square relative">
            {post.media[currentMediaIndex].type === 'image' ? (
              <img
                src={post.media[currentMediaIndex].url}
                alt="Post media"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={post.media[currentMediaIndex].url}
                className="w-full h-full object-cover"
                controls
                poster={post.media[currentMediaIndex].thumbnail}
              />
            )}

            {/* Media navigation */}
            {post.media.length > 1 && (
              <>
                <div className="absolute top-4 right-4 bg-black/50 px-2 py-1 rounded-full text-white text-sm">
                  {currentMediaIndex + 1} / {post.media.length}
                </div>
                
                {currentMediaIndex > 0 && (
                  <button
                    onClick={() => setCurrentMediaIndex(currentMediaIndex - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                
                {currentMediaIndex < post.media.length - 1 && (
                  <button
                    onClick={() => setCurrentMediaIndex(currentMediaIndex + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Media dots indicator */}
        {post.media.length > 1 && (
          <div className="flex justify-center space-x-1 mt-3">
            {post.media.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentMediaIndex(index)}
                className={clsx(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentMediaIndex ? 'bg-primary-500' : 'bg-gray-600'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              liked ? 'text-red-500' : 'text-gray-400 hover:text-white'
            )}
          >
            {liked ? (
              <HeartIconSolid className="w-6 h-6" />
            ) : (
              <HeartIcon className="w-6 h-6" />
            )}
          </button>

          {!post.commentsDisabled && (
            <button
              onClick={() => setShowComments(true)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <ChatBubbleLeftIcon className="w-6 h-6" />
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <ShareIcon className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={handleSave}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            saved ? 'text-primary-500' : 'text-gray-400 hover:text-white'
          )}
        >
          {saved ? (
            <BookmarkIconSolid className="w-6 h-6" />
          ) : (
            <BookmarkIcon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Likes count */}
      {!post.hideLikeCount && post.stats.likesCount > 0 && (
        <p className="text-white font-medium mb-2">
          {post.stats.likesCount.toLocaleString()} {post.stats.likesCount === 1 ? 'like' : 'likes'}
        </p>
      )}

      {/* Caption */}
      {post.caption && (
        <div className="mb-2">
          <p className="text-white">
            <button
              onClick={() => onUserClick(post.author.username)}
              className="font-medium hover:opacity-80 transition-opacity mr-2"
            >
              {post.author.username}
            </button>
            <span 
              dangerouslySetInnerHTML={{
                __html: formatMentions(formatHashtags(post.caption))
              }}
            />
          </p>
        </div>
      )}

      {/* Comments preview */}
      {post.stats.commentsCount > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowComments(true)}
            className="text-gray-400 hover:text-white text-sm mb-2 transition-colors"
          >
            View all {post.stats.commentsCount} comments
          </button>
          
          {post.comments && post.comments.length > 0 && (
            post.comments.slice(0, 2).map((comment) => (
              <div key={comment._id} className="text-white mb-1">
                <button
                  onClick={() => onUserClick(comment.author.username)}
                  className="font-medium hover:opacity-80 transition-opacity mr-2"
                >
                  {comment.author.username}
                </button>
                <span className="text-gray-300">{comment.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Time ago */}
      <p className="text-gray-400 text-sm mb-4">{post.timeAgo}</p>

      {/* Comment Modal */}
      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        contentId={post._id}
        contentType="post"
        comments={post.comments || []}
        onAddComment={onComment}
      />
    </article>
  )
}