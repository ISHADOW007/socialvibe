import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { CameraIcon, UserIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface AvatarUploadProps {
  currentAvatar?: string
  onAvatarChange: (file: File | null) => void
  onUploadProgress?: (progress: number) => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24', 
  lg: 'w-32 h-32',
  xl: 'w-40 h-40'
}

export default function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  onUploadProgress,
  size = 'lg',
  disabled = false,
  className
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      onAvatarChange(file)
    }
  }, [onAvatarChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled
  })

  const removeAvatar = () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    onAvatarChange(null)
  }

  const displayAvatar = preview || currentAvatar

  return (
    <div className={clsx('relative inline-block', className)}>
      <div
        {...getRootProps()}
        className={clsx(
          'relative overflow-hidden rounded-full cursor-pointer transition-all duration-300 group',
          sizeClasses[size],
          isDragActive && 'ring-2 ring-primary-500 ring-offset-2 ring-offset-dark-bg',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <input {...getInputProps()} />
        
        {/* Avatar image */}
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-dark-surface flex items-center justify-center">
            <UserIcon className={clsx(
              'text-gray-400',
              size === 'sm' && 'w-6 h-6',
              size === 'md' && 'w-8 h-8',
              size === 'lg' && 'w-12 h-12',
              size === 'xl' && 'w-16 h-16'
            )} />
          </div>
        )}

        {/* Hover overlay */}
        <div className={clsx(
          'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200',
          (isHovering || isDragActive) ? 'opacity-100' : 'opacity-0'
        )}>
          <CameraIcon className={clsx(
            'text-white',
            size === 'sm' && 'w-4 h-4',
            size === 'md' && 'w-5 h-5',
            size === 'lg' && 'w-6 h-6',
            size === 'xl' && 'w-8 h-8'
          )} />
        </div>

        {/* Upload progress */}
        {onUploadProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: '0%' }} />
          </div>
        )}
      </div>

      {/* Remove button */}
      {displayAvatar && !disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeAvatar()
          }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-400 text-center mt-2">
        Click or drag to upload
      </p>
      <p className="text-xs text-gray-500 text-center">
        Max 5MB • JPG, PNG, WebP
      </p>
    </div>
  )
}