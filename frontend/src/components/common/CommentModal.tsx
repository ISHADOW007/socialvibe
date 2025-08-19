import { useState, useRef, useEffect } from 'react'
import { 
  XMarkIcon, 
  HeartIcon,
  EllipsisHorizontalIcon,
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

interface Comment {
  _id: string
  author: {
    _id: string
    username: string
    profile: {
      avatar?: string
      fullName?: string
      isVerified?: boolean
    }
  }
  text: string
  likes: string[]
  replies?: Comment[]
  createdAt: string
  updatedAt: string
}

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  contentId: string
  contentType: 'post' | 'reel'
  comments: Comment[]
  onAddComment: (text: string) => Promise<{ comment: Comment; commentsCount: number }>
  onLikeComment?: (commentId: string) => Promise<void>
  onReplyToComment?: (commentId: string, text: string) => Promise<void>
  onDeleteComment?: (commentId: string) => Promise<void>
  className?: string
}

export default function CommentModal({
  isOpen,
  onClose,
  contentId,
  contentType,
  comments,
  onAddComment,
  onLikeComment,
  onReplyToComment,
  onDeleteComment,
  className
}: CommentModalProps) {
  const { user } = useAuthStore()
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments])

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      await onAddComment(commentText.trim())
      setCommentText('')
      toast.success('Comment added!')
    } catch (error: any) {
      console.error('Error adding comment:', error)
      toast.error(error?.response?.data?.message || 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReplySubmit = async (commentId: string) => {
    if (!replyText.trim() || !onReplyToComment) return

    try {
      await onReplyToComment(commentId, replyText.trim())
      setReplyText('')
      setReplyingTo(null)
      toast.success('Reply added!')
    } catch (error: any) {
      console.error('Error adding reply:', error)
      toast.error(error?.response?.data?.message || 'Failed to add reply')
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!onLikeComment) return
    
    try {
      await onLikeComment(commentId)
    } catch (error) {
      console.error('Error liking comment:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diff = now.getTime() - date.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    
    if (weeks > 0) return `${weeks}w`
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return 'now'
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const isLiked = comment.likes.includes(user?._id || '')
    const isAuthor = comment.author._id === user?._id

    return (
      <div className={clsx(
        'flex space-x-3',
        isReply && 'ml-12 mt-2'
      )}>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-primary">
            {comment.author.profile.avatar ? (
              <img
                src={comment.author.profile.avatar}
                alt={comment.author.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-medium text-sm">
                {comment.author.username[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-dark-surface rounded-2xl px-3 py-2">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-white text-sm">
                {comment.author.profile.fullName || comment.author.username}
              </span>
              <span className="text-gray-500 text-xs">@{comment.author.username}</span>
              <span className="text-gray-500 text-xs">·</span>
              <span className="text-gray-500 text-xs">{formatTimeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-gray-200 text-sm whitespace-pre-wrap">{comment.text}</p>
          </div>

          <div className="flex items-center space-x-4 mt-2 text-gray-400 text-xs">
            <button
              onClick={() => handleLikeComment(comment._id)}
              className="flex items-center space-x-1 hover:text-red-400 transition-colors"
              disabled={!onLikeComment}
            >
              {isLiked ? (
                <HeartSolidIcon className="w-4 h-4 text-red-500" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
              {comment.likes.length > 0 && (
                <span>{comment.likes.length}</span>
              )}
            </button>

            {!isReply && onReplyToComment && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                className="hover:text-white transition-colors"
              >
                Reply
              </button>
            )}

            {isAuthor && onDeleteComment && (
              <button
                onClick={() => onDeleteComment(comment._id)}
                className="hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyingTo === comment._id && (
            <div className="mt-3 flex space-x-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 bg-dark-bg border border-dark-border rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleReplySubmit(comment._id)
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => handleReplySubmit(comment._id)}
                disabled={!replyText.trim()}
                className="!rounded-full !px-3"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem key={reply._id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={clsx('max-w-lg', className)}
      title={`Comments (${comments.length})`}
    >
      <div className="flex flex-col h-[500px]">
        {/* Comments List */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 p-1 scroll-smooth"
        >
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem key={comment._id} comment={comment} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No comments yet</h3>
              <p className="text-gray-400 text-sm">
                Be the first to share what you think!
              </p>
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="border-t border-dark-border pt-4 mt-4">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-primary">
                {user?.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-medium">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={`Add a comment...`}
                rows={1}
                className="resize-none bg-dark-surface border-dark-border focus:border-primary-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitComment()
                  }
                }}
              />
              
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  Press Enter to post, Shift+Enter for new line
                </div>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  loading={isSubmitting}
                  disabled={!commentText.trim() || isSubmitting}
                  className="!rounded-full"
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}