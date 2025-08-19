import { clsx } from 'clsx'

interface StoryAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

interface Story {
  _id: string
  author: StoryAuthor
  media: {
    type: 'image' | 'video'
    url: string
    thumbnail?: string
  }
  createdAt: string
  expiresAt: string
  timeRemaining: string
  isExpired: boolean
}

interface StoryGroup {
  author: StoryAuthor
  stories: Story[]
  hasUnwatched: boolean
}

interface StoryRingProps {
  storyGroup: StoryGroup
  isOwn?: boolean
  onClick: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-14 h-14',
  md: 'w-16 h-16',
  lg: 'w-20 h-20'
}

const ringClasses = {
  sm: 'p-0.5',
  md: 'p-0.5',
  lg: 'p-1'
}

export default function StoryRing({ 
  storyGroup, 
  isOwn = false, 
  onClick, 
  className,
  size = 'md' 
}: StoryRingProps) {
  const { author, stories, hasUnwatched } = storyGroup
  const latestStory = stories[stories.length - 1]

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center space-y-2 hover:scale-105 transition-transform duration-200',
        className
      )}
    >
      {/* Ring with avatar */}
      <div className={clsx(
        'rounded-full relative',
        ringClasses[size],
        hasUnwatched || isOwn 
          ? 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500' 
          : 'bg-gray-600'
      )}>
        <div className={clsx(
          'bg-dark-bg rounded-full overflow-hidden p-0.5',
          sizeClasses[size]
        )}>
          <div className={clsx(
            'w-full h-full rounded-full overflow-hidden bg-gradient-primary',
            sizeClasses[size]
          )}>
            {author.profile.avatar ? (
              <img
                src={author.profile.avatar}
                alt={`${author.username}'s story`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {author.username[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Add story button for own profile */}
        {isOwn && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 rounded-full border-2 border-dark-bg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Verification badge */}
        {author.profile.isVerified && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border border-dark-bg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Story count indicator */}
        {stories.length > 1 && (
          <div className="absolute top-0 right-0 w-5 h-5 bg-dark-bg border border-gray-600 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">{stories.length}</span>
          </div>
        )}
      </div>

      {/* Username */}
      <span className="text-xs text-white text-center max-w-[80px] truncate">
        {isOwn ? 'Your story' : author.username}
      </span>

      {/* Time remaining (for own stories) */}
      {isOwn && latestStory && !latestStory.isExpired && (
        <span className="text-xs text-gray-400">
          {latestStory.timeRemaining}
        </span>
      )}
    </button>
  )
}