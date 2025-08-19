import { useRef, useState, useEffect } from 'react'
import { 
  PlayIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid 
} from '@heroicons/react/24/solid'
import { clsx } from 'clsx'

interface ReelAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

interface Reel {
  _id: string
  author: ReelAuthor
  videoUrl: string
  thumbnailUrl?: string
  caption?: string
  music?: {
    name: string
    artist: string
    url?: string
    duration?: number
  }
  hashtags: string[]
  mentions: string[]
  likes: string[]
  comments: any[]
  shares: string[]
  saves: string[]
  stats: {
    likesCount: number
    commentsCount: number
    sharesCount: number
    savesCount: number
    viewsCount: number
  }
  videoDetails: {
    duration: number
    width: number
    height: number
    aspectRatio: number
  }
  location?: {
    name: string
  }
  timeAgo: string
  createdAt: string
}

interface ReelPlayerProps {
  reel: Reel
  isActive: boolean
  currentUserId?: string
  onLike: (reelId: string) => void
  onComment: (reelId: string,text: string) => void
  onShare: (reelId: string) => void
  onSave: (reelId: string) => void
  onUserClick: (username: string) => void
  onMusicClick?: (music: any) => void
  className?: string
}

export default function ReelPlayer({
  reel,
  isActive,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserClick,
  onMusicClick,
  className
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [liked, setLiked] = useState(currentUserId ? reel.likes.includes(currentUserId) : false)
  const [saved, setSaved] = useState(currentUserId ? reel.saves.includes(currentUserId) : false)

  // Auto-play/pause based on isActive
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive) {
      video.play().then(() => {
        setIsPlaying(true)
      }).catch(console.error)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [isActive])

  // Update progress
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100
      setProgress(progress)
    }

    video.addEventListener('timeupdate', updateProgress)
    return () => video.removeEventListener('timeupdate', updateProgress)
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      video.play()
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleLike = () => {
    setLiked(!liked)
    onLike(reel._id)
  }

  const handleSave = () => {
    setSaved(!saved)
    onSave(reel._id)
  }

  const formatHashtags = (text: string) => {
    return text.replace(/#(\w+)/g, '<span class="text-primary-400 font-medium">#$1</span>')
  }

  const formatMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-primary-400 font-medium">@$1</span>')
  }

  return (
    <div className={clsx(
      'relative w-full h-screen bg-black flex items-center justify-center overflow-hidden',
      className
    )}>
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        loop
        muted={isMuted}
        className="h-full w-full object-cover"
        onClick={togglePlay}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
        <div 
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <PlayIcon className="w-10 h-10 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Left side content */}
      <div className="absolute left-4 bottom-20 right-20 z-10">
        {/* Author info */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => onUserClick(reel.author.username)}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-primary">
              {reel.author.profile.avatar ? (
                <img
                  src={reel.author.profile.avatar}
                  alt={`${reel.author.username}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                  {reel.author.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold text-lg">{reel.author.username}</span>
                {reel.author.profile.isVerified && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {reel.location && (
                <p className="text-white/80 text-sm">{reel.location.name}</p>
              )}
            </div>
          </button>
          
          <button className="px-6 py-2 border border-white text-white font-medium rounded-full text-sm hover:bg-white hover:text-black transition-colors">
            Follow
          </button>
        </div>

        {/* Caption */}
        {reel.caption && (
          <div className="mb-4">
            <p 
              className="text-white text-lg leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatMentions(formatHashtags(reel.caption))
              }}
            />
          </div>
        )}

        {/* Music info */}
        {reel.music && (
          <button
            onClick={() => onMusicClick?.(reel.music)}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity mb-4"
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.895-4.21-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-.757 2.828 1 1 0 01-1.415-1.414A3.987 3.987 0 0013 12a3.987 3.987 0 00-.172-1.414 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">{reel.music.name}</p>
              <p className="text-white/60 text-xs">{reel.music.artist}</p>
            </div>
          </button>
        )}
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-6 z-10">
        {/* Like */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLike}
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110',
              liked ? 'bg-red-500 text-white' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
            )}
          >
            {liked ? (
              <HeartIconSolid className="w-7 h-7" />
            ) : (
              <HeartIcon className="w-7 h-7" />
            )}
          </button>
          {reel.stats.likesCount > 0 && (
            <span className="text-white text-sm font-medium mt-1">
              {reel.stats.likesCount > 999 ? `${(reel.stats.likesCount / 1000).toFixed(1)}k` : reel.stats.likesCount}
            </span>
          )}
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => onComment(reel._id,'hello')}
            className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
          >
            <ChatBubbleLeftIcon className="w-7 h-7" />
          </button>
          {reel.stats.commentsCount > 0 && (
            <span className="text-white text-sm font-medium mt-1">
              {reel.stats.commentsCount > 999 ? `${(reel.stats.commentsCount / 1000).toFixed(1)}k` : reel.stats.commentsCount}
            </span>
          )}
        </div>

        {/* Share */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => onShare(reel._id)}
            className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
          >
            <ShareIcon className="w-7 h-7" />
          </button>
          {reel.stats.sharesCount > 0 && (
            <span className="text-white text-sm font-medium mt-1">
              {reel.stats.sharesCount > 999 ? `${(reel.stats.sharesCount / 1000).toFixed(1)}k` : reel.stats.sharesCount}
            </span>
          )}
        </div>

        {/* Save */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleSave}
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110',
              saved ? 'bg-primary-500 text-white' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
            )}
          >
            {saved ? (
              <BookmarkIconSolid className="w-7 h-7" />
            ) : (
              <BookmarkIcon className="w-7 h-7" />
            )}
          </button>
        </div>

        {/* More options */}
        <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-110">
          <EllipsisVerticalIcon className="w-7 h-7" />
        </button>

        {/* Avatar (duplicate for easy following) */}
        <button
          onClick={() => onUserClick(reel.author.username)}
          className="w-12 h-12 rounded-full overflow-hidden border-2 border-white"
        >
          {reel.author.profile.avatar ? (
            <img
              src={reel.author.profile.avatar}
              alt={`${reel.author.username}'s avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-white font-bold">
              {reel.author.username[0].toUpperCase()}
            </div>
          )}
        </button>
      </div>

      {/* Top controls */}
      <div className="absolute top-6 right-4 flex items-center space-x-4 z-10">
        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          {isMuted ? (
            <SpeakerXMarkIcon className="w-6 h-6" />
          ) : (
            <SpeakerWaveIcon className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  )
}