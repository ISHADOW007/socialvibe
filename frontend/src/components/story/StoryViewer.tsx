import { useState, useRef, useEffect } from 'react'
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface StoryAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

interface StoryViewer {
  user: StoryAuthor
  viewedAt: string
}

interface Story {
  _id: string
  author: StoryAuthor
  media: {
    type: 'image' | 'video'
    url: string
    thumbnail?: string
    duration?: number
  }
  text?: {
    content: string
    fontSize: number
    color: string
    backgroundColor?: string
    position: {
      x: number
      y: number
    }
  }
  stickers?: Array<{
    type: 'emoji' | 'gif' | 'mention' | 'hashtag' | 'location'
    content: string
    position: {
      x: number
      y: number
    }
    size?: number
  }>
  music?: {
    name: string
    artist: string
    startTime?: number
    duration?: number
  }
  location?: {
    name: string
  }
  viewers: StoryViewer[]
  stats: {
    viewsCount: number
  }
  timeRemaining: string
  isExpired: boolean
  createdAt: string
}

interface StoryGroup {
  author: StoryAuthor
  stories: Story[]
  hasUnwatched: boolean
}

interface StoryViewerProps {
  storyGroups: StoryGroup[]
  currentGroupIndex: number
  currentStoryIndex: number
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onReply?: (storyId: string, message: string) => void
  onLike?: (storyId: string) => void
  currentUserId?: string
  className?: string
}

export default function StoryViewer({
  storyGroups,
  currentGroupIndex,
  currentStoryIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onReply,
  onLike,
  currentUserId,
  className
}: StoryViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [autoPlayTimer, setAutoPlayTimer] = useState<NodeJS.Timeout | null>(null)

  const currentGroup = storyGroups[currentGroupIndex]
  const currentStory = currentGroup?.stories[currentStoryIndex]

  // Auto-advance timer for image stories
  useEffect(() => {
    if (!currentStory || !isPlaying) return

    const duration = currentStory.media.type === 'image' ? 5000 : 0 // 5 seconds for images
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        onNext()
      }, duration)
      setAutoPlayTimer(timer)
      
      return () => clearTimeout(timer)
    }
  }, [currentStory, isPlaying, onNext])

  // Handle video progress
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentStory?.media.type !== 'video') return

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100
      setProgress(progress)
    }

    const handleEnded = () => {
      onNext()
    }

    video.addEventListener('timeupdate', updateProgress)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', updateProgress)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentStory, onNext])

  // Reset progress for new story
  useEffect(() => {
    setProgress(0)
    setShowReplyInput(false)
    setReplyMessage('')
  }, [currentGroupIndex, currentStoryIndex])

  if (!isOpen || !currentStory) return null

  const togglePlay = () => {
    if (currentStory.media.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleReply = () => {
    if (replyMessage.trim() && onReply) {
      onReply(currentStory._id, replyMessage.trim())
      setReplyMessage('')
      setShowReplyInput(false)
    }
  }

  const handleLike = () => {
    if (onLike) {
      onLike(currentStory._id)
    }
  }

  const isOwnStory = currentUserId === currentStory.author._id

  return (
    <div className={clsx(
      'fixed inset-0 bg-black z-50 flex items-center justify-center',
      className
    )}>
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex space-x-1 z-20">
        {currentGroup.stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 rounded-full"
              style={{ 
                width: index < currentStoryIndex 
                  ? '100%' 
                  : index === currentStoryIndex 
                    ? `${progress}%`
                    : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-primary">
            {currentStory.author.profile.avatar ? (
              <img
                src={currentStory.author.profile.avatar}
                alt={`${currentStory.author.username}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                {currentStory.author.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="text-white font-medium text-sm">{currentStory.author.username}</span>
              {currentStory.author.profile.isVerified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {currentStory.timeRemaining && !currentStory.isExpired && (
              <p className="text-white/60 text-xs">{currentStory.timeRemaining}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
          </button>

          {/* Mute/Unmute for videos */}
          {currentStory.media.type === 'video' && (
            <button
              onClick={toggleMute}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation areas */}
      <button
        onClick={onPrevious}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-start pl-8"
      >
        <ChevronLeftIcon className="w-8 h-8 text-white opacity-0 hover:opacity-80 transition-opacity" />
      </button>

      <button
        onClick={onNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-end pr-8"
      >
        <ChevronRightIcon className="w-8 h-8 text-white opacity-0 hover:opacity-80 transition-opacity" />
      </button>

      {/* Story content */}
      <div className="relative w-full h-full max-w-sm mx-auto flex items-center justify-center">
        {currentStory.media.type === 'image' ? (
          <img
            src={currentStory.media.url}
            alt="Story"
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.media.url}
            poster={currentStory.media.thumbnail}
            autoPlay={isPlaying}
            muted={isMuted}
            className="w-full h-full object-cover rounded-2xl"
          />
        )}

        {/* Text overlay */}
        {currentStory.text && (
          <div
            className="absolute text-white font-bold text-center drop-shadow-lg"
            style={{
              left: `${currentStory.text.position.x}%`,
              top: `${currentStory.text.position.y}%`,
              fontSize: `${currentStory.text.fontSize}px`,
              color: currentStory.text.color,
              backgroundColor: currentStory.text.backgroundColor || 'transparent',
              transform: 'translate(-50%, -50%)',
              padding: currentStory.text.backgroundColor ? '8px 16px' : '0',
              borderRadius: currentStory.text.backgroundColor ? '8px' : '0'
            }}
          >
            {currentStory.text.content}
          </div>
        )}

        {/* Stickers */}
        {currentStory.stickers?.map((sticker, index) => (
          <div
            key={index}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${sticker.position.x}%`,
              top: `${sticker.position.y}%`,
              fontSize: `${sticker.size || 50}px`
            }}
          >
            {sticker.type === 'emoji' && sticker.content}
            {sticker.type === 'mention' && (
              <span className="text-primary-400 font-bold">@{sticker.content}</span>
            )}
            {sticker.type === 'hashtag' && (
              <span className="text-primary-400 font-bold">#{sticker.content}</span>
            )}
            {sticker.type === 'location' && (
              <div className="text-white bg-black/50 px-2 py-1 rounded-full text-sm">
                📍 {sticker.content}
              </div>
            )}
          </div>
        ))}

        {/* Music info */}
        {currentStory.music && (
          <div className="absolute bottom-20 left-4 right-4 flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
            <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.895-4.21-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-.757 2.828 1 1 0 01-1.415-1.414A3.987 3.987 0 0013 12a3.987 3.987 0 00-.172-1.414 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-xs truncate">{currentStory.music.name}</p>
              <p className="text-white/60 text-xs truncate">{currentStory.music.artist}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {!isOwnStory && (
        <div className="absolute bottom-8 left-4 right-4 z-20">
          {!showReplyInput ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowReplyInput(true)}
                className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white placeholder-white/60 text-left"
              >
                Send message...
              </button>
              <button
                onClick={handleLike}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
              >
                <HeartIcon className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Input
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Send message..."
                variant="glass"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleReply()}
              />
              <Button onClick={handleReply} disabled={!replyMessage.trim()}>
                <PaperAirplaneIcon className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowReplyInput(false)
                  setReplyMessage('')
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Own story stats */}
      {isOwnStory && currentStory.viewers.length > 0 && (
        <div className="absolute bottom-8 left-4 right-4 z-20">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-white font-medium">{currentStory.stats.viewsCount} views</span>
            </div>
            <div className="flex -space-x-2 overflow-hidden">
              {currentStory.viewers.slice(0, 5).map((viewer, index) => (
                <div key={viewer.user._id} className="w-6 h-6 rounded-full overflow-hidden border-2 border-white">
                  {viewer.user.profile.avatar ? (
                    <img
                      src={viewer.user.profile.avatar}
                      alt={viewer.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                      {viewer.user.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {currentStory.viewers.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    +{currentStory.viewers.length - 5}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}