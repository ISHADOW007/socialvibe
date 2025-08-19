import { useState, useRef } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { 
  PhotoIcon,
  VideoCameraIcon,
  XMarkIcon,
  EyeSlashIcon,
  MapPinIcon,
  MusicalNoteIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { clsx } from 'clsx'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateStory: (storyData: {
    media?: File
    text?: {
      content: string
      fontSize: number
      color: string
      backgroundColor?: string
      position: { x: number; y: number }
    }
    stickers?: Array<{
      type: 'emoji' | 'gif' | 'mention' | 'hashtag' | 'location'
      content: string
      position: { x: number; y: number }
      size?: number
    }>
    music?: {
      name: string
      artist: string
      startTime?: number
      duration?: number
    }
    location?: { name: string; coordinates?: [number, number] }
    privacy?: {
      hideFromUsers: string[]
      allowedUsers?: string[]
    }
  }) => Promise<void>
}

export default function CreateStoryModal({
  isOpen,
  onClose,
  onCreateStory
}: CreateStoryModalProps) {
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string>('')
  const [storyType, setStoryType] = useState<'media' | 'text'>('media')
  
  // Text story state
  const [textContent, setTextContent] = useState('')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [backgroundColor, setBackground] = useState<string>()
  const [fontSize, setFontSize] = useState(24)
  
  // Common state
  const [stickers, setStickers] = useState<any[]>([])
  const [music, setMusic] = useState<any>()
  const [location, setLocation] = useState<any>()
  const [privacy, setPrivacy] = useState<any>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // UI state
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [showStickerEditor, setShowStickerEditor] = useState(false)
  const [showMusicEditor, setShowMusicEditor] = useState(false)
  const [showLocationEditor, setShowLocationEditor] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file')
      return
    }

    // Validate file size (20MB max for stories)
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Maximum size is 20MB')
      return
    }

    // For videos, validate duration (15 seconds max)
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(file)
      video.onloadedmetadata = () => {
        if (video.duration > 15) {
          alert('Video too long. Maximum duration is 15 seconds')
          URL.revokeObjectURL(video.src)
          return
        }
        setSelectedFile(file)
        setFilePreview(video.src)
        setStoryType('media')
      }
    } else {
      const preview = URL.createObjectURL(file)
      setSelectedFile(file)
      setFilePreview(preview)
      setStoryType('media')
    }
  }

  const removeFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setSelectedFile(null)
    setFilePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const backgroundOptions = [
    { name: 'None', value: undefined, gradient: 'bg-transparent' },
    { name: 'Black', value: '#000000', gradient: 'bg-black' },
    { name: 'Primary', value: '#0ea5e9', gradient: 'bg-primary-500' },
    { name: 'Purple', value: '#8b5cf6', gradient: 'bg-purple-500' },
    { name: 'Pink', value: '#ec4899', gradient: 'bg-pink-500' },
    { name: 'Red', value: '#ef4444', gradient: 'bg-red-500' },
    { name: 'Orange', value: '#f97316', gradient: 'bg-orange-500' },
    { name: 'Green', value: '#10b981', gradient: 'bg-green-500' }
  ]

  const handleSubmit = async () => {
    if (!selectedFile && !textContent.trim()) return

    setIsSubmitting(true)
    
    try {
      await onCreateStory({
        media: selectedFile || undefined,
        text: textContent.trim() ? {
          content: textContent.trim(),
          fontSize,
          color: textColor,
          backgroundColor,
          position: { x: 50, y: 50 } // Center by default
        } : undefined,
        stickers,
        music,
        location,
        privacy
      })

      // Reset form
      removeFile()
      setTextContent('')
      setTextColor('#FFFFFF')
      setBackground(undefined)
      setFontSize(24)
      setStickers([])
      setMusic(undefined)
      setLocation(undefined)
      setPrivacy(undefined)
      setStoryType('media')
      setShowTextEditor(false)
      onClose()
    } catch (error) {
      console.error('Error creating story:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Story"
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
              <p className="text-sm text-gray-400">Your story</p>
            </div>
          </div>
        )}

        {/* Story type selection */}
        <div className="flex space-x-2">
          <Button
            variant={storyType === 'media' ? 'primary' : 'ghost'}
            onClick={() => setStoryType('media')}
            icon={<PhotoIcon className="w-5 h-5" />}
            fullWidth
          >
            Photo/Video
          </Button>
          <Button
            variant={storyType === 'text' ? 'primary' : 'ghost'}
            onClick={() => setStoryType('text')}
            icon={<FaceSmileIcon className="w-5 h-5" />}
            fullWidth
          >
            Text
          </Button>
        </div>

        {/* Media upload */}
        {storyType === 'media' && (
          <div>
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-dark-border hover:border-primary-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <div className="flex flex-col items-center space-y-4">
                  <PhotoIcon className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="text-white font-medium mb-1">Upload media</p>
                    <p className="text-gray-400 text-sm">Photos and videos up to 15 seconds</p>
                    <p className="text-gray-500 text-xs mt-1">Max 20MB</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="aspect-[9/16] max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
                  {selectedFile.type.startsWith('video/') ? (
                    <video
                      src={filePreview}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={filePreview}
                      alt="Story preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Text overlay preview */}
                  {textContent && (
                    <div
                      className="absolute text-white font-bold text-center drop-shadow-lg"
                      style={{
                        left: '50%',
                        top: '50%',
                        fontSize: `${fontSize}px`,
                        color: textColor,
                        backgroundColor: backgroundColor || 'transparent',
                        transform: 'translate(-50%, -50%)',
                        padding: backgroundColor ? '8px 16px' : '0',
                        borderRadius: backgroundColor ? '8px' : '0'
                      }}
                    >
                      {textContent}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={removeFile}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Text story */}
        {storyType === 'text' && (
          <div>
            <div 
              className="aspect-[9/16] max-w-xs mx-auto rounded-xl overflow-hidden flex items-center justify-center relative"
              style={{ 
                background: backgroundColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              {textContent ? (
                <div
                  className="text-white font-bold text-center drop-shadow-lg px-4"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: textColor
                  }}
                >
                  {textContent}
                </div>
              ) : (
                <p className="text-white/60 text-center px-4">
                  Tap to add text
                </p>
              )}
            </div>

            {/* Text editor */}
            <div className="mt-4 space-y-4">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />

              {/* Text controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Font Size</label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{fontSize}px</span>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Text Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-8 rounded border border-dark-border"
                  />
                </div>
              </div>

              {/* Background options */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Background</label>
                <div className="grid grid-cols-4 gap-2">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => setBackground(option.value)}
                      className={clsx(
                        'w-full h-8 rounded border-2 transition-colors',
                        option.gradient,
                        backgroundColor === option.value 
                          ? 'border-primary-500' 
                          : 'border-dark-border hover:border-primary-500/50'
                      )}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Story enhancements */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTextEditor(!showTextEditor)}
            icon={<FaceSmileIcon className="w-4 h-4" />}
          >
            Text
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStickerEditor(!showStickerEditor)}
            icon={<FaceSmileIcon className="w-4 h-4" />}
          >
            Stickers
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMusicEditor(!showMusicEditor)}
            icon={<MusicalNoteIcon className="w-4 h-4" />}
          >
            Music
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLocationEditor(!showLocationEditor)}
            icon={<MapPinIcon className="w-4 h-4" />}
          >
            Location
          </Button>
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
            disabled={(!selectedFile && !textContent.trim())}
          >
            {isSubmitting ? 'Sharing...' : 'Share to Story'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}