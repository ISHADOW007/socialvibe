import { useState, useRef, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import ProfileCompletionModal from '../user/ProfileCompletionModal'
import { 
  VideoCameraIcon, 
  MusicalNoteIcon, 
  MapPinIcon,
  TagIcon,
  AtSymbolIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import { clsx } from 'clsx'

interface CreateReelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateReel: (reelData: {
    video: File
    caption?: string
    music?: {
      name: string
      artist: string
      url?: string
      duration?: number
    }
    location?: { name: string; coordinates?: [number, number] }
    hashtags: string[]
    mentions: string[]
    allowDuet: boolean
    allowRemix: boolean
    commentsDisabled: boolean
  }) => Promise<void>
}

export default function CreateReelModal({
  isOpen,
  onClose,
  onCreateReel
}: CreateReelModalProps) {
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [isProfileComplete, setIsProfileComplete] = useState(true)
  const [profileCheckLoading, setProfileCheckLoading] = useState(false)
  
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [music, setMusic] = useState<{
    name: string
    artist: string
    url?: string
    duration?: number
  } | undefined>()
  const [location, setLocation] = useState<{ name: string; coordinates?: [number, number] } | undefined>()
  const [allowDuet, setAllowDuet] = useState(true)
  const [allowRemix, setAllowRemix] = useState(true)
  const [commentsDisabled, setCommentsDisabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [showMusicInput, setShowMusicInput] = useState(false)
  const [musicName, setMusicName] = useState('')
  const [musicArtist, setMusicArtist] = useState('')

  // Check profile completion when modal opens
  useEffect(() => {
    if (isOpen && user) {
      checkProfileCompletion()
    }
  }, [isOpen, user])

  const checkProfileCompletion = async () => {
    if (!user) return

    setProfileCheckLoading(true)
    try {
      const status = await userService.getProfileCompletionStatus()
      setIsProfileComplete(status.isComplete)
      
      if (!status.isComplete) {
        setShowProfileCompletion(true)
      }
    } catch (error) {
      console.error('Failed to check profile completion:', error)
      // Assume profile is complete if check fails
      setIsProfileComplete(true)
    } finally {
      setProfileCheckLoading(false)
    }
  }

  const handleProfileCompleted = (userData: any) => {
    updateUser({
      profile: {
        ...user!.profile,
        ...userData
      }
    })
    setIsProfileComplete(true)
    setShowProfileCompletion(false)
  }

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file')
      return
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      alert('Video file too large. Maximum size is 100MB')
      return
    }

    // Create preview
    const video = document.createElement('video')
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      // Validate duration (60 seconds max)
      if (video.duration > 60) {
        alert('Video too long. Maximum duration is 60 seconds')
        URL.revokeObjectURL(video.src)
        return
      }

      setSelectedVideo(file)
      setVideoPreview(video.src)
    }
  }

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setSelectedVideo(null)
    setVideoPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const extractHashtagsAndMentions = (text: string) => {
    const hashtags = (text.match(/#(\w+)/g) || []).map(tag => tag.slice(1).toLowerCase())
    const mentions = (text.match(/@(\w+)/g) || []).map(mention => mention.slice(1).toLowerCase())
    return { hashtags, mentions }
  }

  const handleLocationSave = () => {
    if (locationText.trim()) {
      setLocation({ name: locationText.trim() })
      setShowLocationInput(false)
      setLocationText('')
    }
  }

  const handleMusicSave = () => {
    if (musicName.trim() && musicArtist.trim()) {
      setMusic({
        name: musicName.trim(),
        artist: musicArtist.trim()
      })
      setShowMusicInput(false)
      setMusicName('')
      setMusicArtist('')
    }
  }

  const handleSubmit = async () => {
    if (!selectedVideo || !isProfileComplete) return

    setIsSubmitting(true)
    
    try {
      const { hashtags, mentions } = extractHashtagsAndMentions(caption)
      
      await onCreateReel({
        video: selectedVideo,
        caption: caption.trim(),
        music,
        location,
        hashtags,
        mentions,
        allowDuet,
        allowRemix,
        commentsDisabled
      })

      // Reset form
      removeVideo()
      setCaption('')
      setMusic(undefined)
      setLocation(undefined)
      setAllowDuet(true)
      setAllowRemix(true)
      setCommentsDisabled(false)
      onClose()
    } catch (error) {
      console.error('Error creating reel:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const remainingChars = 2200 - caption.length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Reel"
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* User info */}
        {user && (
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
            <div>
              <p className="font-medium text-white">{user.username}</p>
              {user.profile.fullName && (
                <p className="text-sm text-gray-400">{user.profile.fullName}</p>
              )}
            </div>
          </div>
        )}

        {/* Profile completion warning */}
        {!isProfileComplete && !profileCheckLoading && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-yellow-200 font-medium mb-1">Complete Your Profile</h4>
                <p className="text-yellow-300/80 text-sm mb-3">
                  You need to complete your profile before creating reels. Please add your full name and any other required information.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowProfileCompletion(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white border-0"
                >
                  Complete Profile
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Video upload */}
        <div>
          <h4 className="text-white font-medium mb-3">Video</h4>
          
          {!selectedVideo ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-dark-border hover:border-primary-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
            >
              <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-1">Upload a video</p>
              <p className="text-gray-400 text-sm">MP4, WebM, MOV up to 100MB</p>
              <p className="text-gray-500 text-xs mt-1">Maximum 60 seconds</p>
            </div>
          ) : (
            <div className="relative">
              <div className="aspect-[9/16] max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
                <video
                  src={videoPreview}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
        </div>

        {/* Caption */}
        <div>
          <Textarea
            label="Caption"
            placeholder="Describe your reel..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={2200}
            fullWidth
            variant="glass"
            className="resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <TagIcon className="w-4 h-4" />
                <span>Use #hashtags</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <AtSymbolIcon className="w-4 h-4" />
                <span>Tag @friends</span>
              </div>
            </div>
            
            <span className={clsx(
              'text-sm',
              remainingChars < 100 ? 'text-yellow-400' : remainingChars < 0 ? 'text-red-400' : 'text-gray-400'
            )}>
              {remainingChars}
            </span>
          </div>
        </div>

        {/* Music */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Music</h4>
            <button
              onClick={() => setShowMusicInput(!showMusicInput)}
              className="flex items-center space-x-1 text-primary-500 hover:text-primary-400 text-sm transition-colors"
            >
              <MusicalNoteIcon className="w-4 h-4" />
              <span>Add music</span>
            </button>
          </div>

          {music && (
            <div className="flex items-center justify-between px-3 py-2 bg-dark-surface rounded-lg mb-2">
              <div className="flex items-center space-x-2">
                <MusicalNoteIcon className="w-4 h-4 text-primary-500" />
                <div>
                  <p className="text-white text-sm font-medium">{music.name}</p>
                  <p className="text-gray-400 text-xs">{music.artist}</p>
                </div>
              </div>
              <button
                onClick={() => setMusic(undefined)}
                className="text-gray-400 hover:text-white"
              >
                Remove
              </button>
            </div>
          )}

          {showMusicInput && (
            <div className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="Song name"
                value={musicName}
                onChange={(e) => setMusicName(e.target.value)}
                className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Artist name"
                value={musicArtist}
                onChange={(e) => setMusicArtist(e.target.value)}
                className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleMusicSave}>
                  Add
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowMusicInput(false)
                    setMusicName('')
                    setMusicArtist('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Location</h4>
            <button
              onClick={() => setShowLocationInput(!showLocationInput)}
              className="flex items-center space-x-1 text-primary-500 hover:text-primary-400 text-sm transition-colors"
            >
              <MapPinIcon className="w-4 h-4" />
              <span>Add location</span>
            </button>
          </div>

          {location && (
            <div className="flex items-center justify-between px-3 py-2 bg-dark-surface rounded-lg mb-2">
              <div className="flex items-center space-x-2">
                <MapPinIcon className="w-4 h-4 text-primary-500" />
                <span className="text-white">{location.name}</span>
              </div>
              <button
                onClick={() => setLocation(undefined)}
                className="text-gray-400 hover:text-white"
              >
                Remove
              </button>
            </div>
          )}

          {showLocationInput && (
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                placeholder="Enter location name"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="flex-1 px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && handleLocationSave()}
              />
              <Button size="sm" onClick={handleLocationSave}>
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowLocationInput(false)
                  setLocationText('')
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Privacy & Settings</h4>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Allow Duets</span>
              <input
                type="checkbox"
                checked={allowDuet}
                onChange={(e) => setAllowDuet(e.target.checked)}
                className="w-5 h-5 text-primary-500 bg-dark-surface border-dark-border rounded focus:ring-primary-500 focus:ring-2"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Allow Remixes</span>
              <input
                type="checkbox"
                checked={allowRemix}
                onChange={(e) => setAllowRemix(e.target.checked)}
                className="w-5 h-5 text-primary-500 bg-dark-surface border-dark-border rounded focus:ring-primary-500 focus:ring-2"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Disable Comments</span>
              <input
                type="checkbox"
                checked={commentsDisabled}
                onChange={(e) => setCommentsDisabled(e.target.checked)}
                className="w-5 h-5 text-primary-500 bg-dark-surface border-dark-border rounded focus:ring-primary-500 focus:ring-2"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-dark-border">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!selectedVideo || remainingChars < 0 || !isProfileComplete}
          >
            {isSubmitting ? 'Creating...' : 'Share Reel'}
          </Button>
        </div>
      </div>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileCompletion}
        onClose={() => setShowProfileCompletion(false)}
        onComplete={handleProfileCompleted}
      />
    </Modal>
  )
}