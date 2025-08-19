import { useState } from 'react'
import { type Message } from '@/services/messageService'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  onEdit: (messageId: string, newContent: string) => void
  onDelete: (messageId: string, deleteFor: 'me' | 'everyone') => void
  onReaction: (messageId: string, emoji: string) => void
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😠']

export default function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar, 
  onEdit, 
  onDelete, 
  onReaction 
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content || '')

  const formatMessageTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message._id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditContent(message.content || '')
    }
  }

  const handleReactionClick = (emoji: string) => {
    onReaction(message._id, emoji)
    setShowReactions(false)
  }

  const renderMessageContent = () => {
    if (message.isDeleted) {
      return (
        <div className="italic text-gray-500 dark:text-gray-400">
          This message was deleted
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={Math.min(editContent.split('\n').length + 1, 5)}
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setIsEditing(false)
                setEditContent(message.content || '')
              }}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {/* Reply indicator */}
        {message.replyTo && (
          <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded border-l-2 border-blue-500 text-sm">
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              Replying to {message.replyTo.sender.username}
            </p>
            <p className="text-gray-500 dark:text-gray-400 truncate">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Media content */}
        {message.media && (
          <div className="rounded-lg overflow-hidden max-w-sm">
            {message.media.type === 'image' ? (
              <img
                src={message.media.url}
                alt="Shared image"
                className="w-full h-auto"
              />
            ) : message.media.type === 'video' ? (
              <video
                src={message.media.url}
                controls
                className="w-full h-auto"
                poster={message.media.thumbnail}
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                <p className="font-medium">{message.media.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {message.media.mimeType}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {message.isEdited && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.reduce((acc: any[], reaction) => {
              const existing = acc.find(r => r.emoji === reaction.emoji)
              if (existing) {
                existing.count++
                existing.users.push(reaction.user)
              } else {
                acc.push({
                  emoji: reaction.emoji,
                  count: 1,
                  users: [reaction.user]
                })
              }
              return acc
            }, []).map((reactionGroup, index) => (
              <button
                key={index}
                onClick={() => handleReactionClick(reactionGroup.emoji)}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm 
                         hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={`${reactionGroup.users.map((u: any) => u.username).join(', ')}`}
              >
                {reactionGroup.emoji} {reactionGroup.count}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex items-end space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowReactions(false)
      }}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <div className="flex-shrink-0 mb-1">
          {message.sender.profile.avatar ? (
            <img
              src={message.sender.profile.avatar}
              alt={message.sender.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {message.sender.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl ${showAvatar || isOwn ? '' : 'ml-10'}`}>
        {/* Sender name for group chats */}
        {!isOwn && showAvatar && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-3">
            {message.sender.profile.fullName || message.sender.username}
          </p>
        )}

        {/* Message content */}
        <div
          className={`relative p-3 rounded-2xl ${
            isOwn
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          } ${showActions ? 'ring-1 ring-gray-300 dark:ring-gray-600' : ''}`}
        >
          {renderMessageContent()}

          {/* Actions menu */}
          {showActions && !isEditing && (
            <div className={`absolute top-0 flex space-x-1 ${
              isOwn ? '-left-20' : '-right-20'
            }`}>
              {/* Reaction button */}
              <div className="relative">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                           rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="text-sm">😊</span>
                </button>

                {/* Reactions picker */}
                {showReactions && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                                rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReactionClick(emoji)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit button (only for own messages) */}
              {isOwn && message.messageType === 'text' && !message.isDeleted && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                           rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Edit message"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={() => onDelete(message._id, isOwn ? 'everyone' : 'me')}
                className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                         rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                title={isOwn ? "Delete for everyone" : "Delete for me"}
              >
                <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 px-3 ${
          isOwn ? 'text-right' : 'text-left'
        }`}>
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}