import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import FileUpload from '../ui/FileUpload'
import ProfileCompletionModal from '../user/ProfileCompletionModal'
import { MapPinIcon, TagIcon, AtSymbolIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'

interface UploadedFile {
  file: File
  preview: string
  type: 'image' | 'video' | 'other'
  progress?: number
  uploaded?: boolean
  error?: string
}

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatePost: (postData: {
    caption: string
    files: File[]
    location?: { name: string; coordinates?: [number, number] }
    hashtags: string[]
    mentions: string[]
  }) => Promise<void>
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onCreatePost
}: CreatePostModalProps) {
  const { user } = useAuthStore()
  const [caption, setCaption] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [location, setLocation] = useState<{ name: string; coordinates?: [number, number] } | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    setFiles(newFiles)
  }

  const extractHashtagsAndMentions = (text: string) => {
    const hashtags = (text.match(/#(\w+)/g) || []).map(tag => tag.slice(1).toLowerCase())
    const mentions = (text.match(/@(\w+)/g) || []).map(mention => mention.slice(1).toLowerCase())
    return { hashtags, mentions }
  }

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      const { hashtags, mentions } = extractHashtagsAndMentions(caption)
      
      await onCreatePost({
        caption: caption.trim(),
        files: files.map(f => f.file),
        location: location && locationText.trim() ? { name: locationText.trim() } : undefined,
        hashtags,
        mentions
      })

      // Reset form
      setCaption('')
      setFiles([])
      setLocation(undefined)
      setLocationText('')
      setShowLocationInput(false)
      onClose()
    } catch (error: any) {
      console.error('Error creating post:', error)
      
      // Handle profile completion requirement
      if (error?.response?.status === 403 && 
          error?.response?.data?.message?.includes('complete your profile')) {
        setShowProfileCompletion(true)
        setError('Please complete your profile to create posts')
      } else {
        setError(error?.response?.data?.message || 'Failed to create post. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLocationSave = () => {
    if (locationText.trim()) {
      setLocation({ name: locationText.trim() })
      setShowLocationInput(false)
    }
  }

  const remainingChars = 2200 - caption.length

  const handleProfileCompleted = () => {
    setShowProfileCompletion(false)
    setError(null)
    // Note: Don't automatically retry to avoid infinite loop
    // User can click "Share Post" button again after completing profile
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create new post"
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

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Caption */}
        <div>
          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            maxLength={2200}
            fullWidth
            variant="glass"
            className="resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <button
                onClick={() => setShowLocationInput(!showLocationInput)}
                className="flex items-center space-x-1 hover:text-white transition-colors"
              >
                <MapPinIcon className="w-4 h-4" />
                <span>Add location</span>
              </button>
              
              <div className="flex items-center space-x-1">
                <TagIcon className="w-4 h-4" />
                <span>Use #hashtags</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <AtSymbolIcon className="w-4 h-4" />
                <span>Tag @friends</span>
              </div>
            </div>
            
            <span className={`text-sm ${remainingChars < 100 ? 'text-yellow-400' : remainingChars < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {remainingChars}
            </span>
          </div>
        </div>

        {/* Location input */}
        {showLocationInput && (
          <div className="flex items-center space-x-2">
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
                setLocation(undefined)
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Location display */}
        {location && (
          <div className="flex items-center justify-between px-3 py-2 bg-dark-surface rounded-lg">
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

        {/* File upload */}
        <div>
          <h4 className="text-white font-medium mb-3">Media</h4>
          <FileUpload
            onFilesChange={handleFilesChange}
            multiple
            maxFiles={10}
            accept={{
              'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
              'video/*': ['.mp4', '.webm', '.mov']
            }}
          />
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
            disabled={(!caption.trim() && files.length === 0) || remainingChars < 0}
          >
            {isSubmitting ? 'Creating...' : 'Share Post'}
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