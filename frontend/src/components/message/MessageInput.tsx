import { useState, useRef } from 'react'
import { type Message } from '@/services/messageService'

interface MessageInputProps {
  onSendMessage: (content: string, media?: File, replyTo?: Message) => Promise<void>
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
  replyTo?: Message
  onCancelReply?: () => void
}

export default function MessageInput({ 
  onSendMessage, 
  onTyping, 
  disabled = false,
  replyTo,
  onCancelReply
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleInputChange = (value: string) => {
    setMessage(value)
    
    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true)
      onTyping(true)
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      onTyping(false)
    }, 1000)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select an image or video file')
        return
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB')
        return
      }

      setSelectedFile(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    const content = message.trim()
    if ((!content && !selectedFile) || disabled) return

    try {
      await onSendMessage(content, selectedFile || undefined, replyTo)
      
      // Reset form
      setMessage('')
      setSelectedFile(null)
      setPreviewUrl(null)
      setIsTyping(false)
      onTyping(false)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      if (onCancelReply) {
        onCancelReply()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const renderFilePreview = () => {
    if (!selectedFile || !previewUrl) return null

    return (
      <div className="relative inline-block m-2">
        {selectedFile.type.startsWith('image/') ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-xs max-h-32 rounded-lg object-cover"
          />
        ) : (
          <video
            src={previewUrl}
            className="max-w-xs max-h-32 rounded-lg"
            controls
          >
            Your browser does not support video playback.
          </video>
        )}
        
        <button
          onClick={handleRemoveFile}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full 
                   hover:bg-red-600 flex items-center justify-center text-sm"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Reply indicator */}
      {replyTo && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Replying to <span className="font-semibold">{replyTo.sender.username}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {replyTo.content || (replyTo.media ? 'Media message' : 'Message')}
              </p>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* File preview */}
      {renderFilePreview()}

      {/* Input area */}
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* File attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                     dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 
                     rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Message input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl 
                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       resize-none overflow-hidden"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !selectedFile)}
            className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-full 
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed 
                     disabled:hover:bg-blue-600 transition-colors"
            title="Send message"
          >
            {disabled ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}