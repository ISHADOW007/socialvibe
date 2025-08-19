import { useState, useEffect } from 'react'
import { storyService, type StoryGroup } from '@/services/storyService'
import { useAuthStore } from '@/store/authStore'
import StoryViewer from './StoryViewer'
import socketService from '@/services/socketService'

interface StoriesRingProps {
  onCreateStory?: () => void
}

export default function StoriesRing({ onCreateStory }: StoriesRingProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await storyService.getStoriesFeed()
      setStoryGroups(response.storyGroups || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load stories')
      console.error('Error loading stories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStoryClick = (groupIndex: number, storyIndex: number = 0) => {
    setCurrentGroupIndex(groupIndex)
    setCurrentStoryIndex(storyIndex)
    setShowViewer(true)
  }

  const handleNext = () => {
    const currentGroup = storyGroups[currentGroupIndex]
    
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      // Next story in current group
      setCurrentStoryIndex(prev => prev + 1)
    } else if (currentGroupIndex < storyGroups.length - 1) {
      // First story of next group
      setCurrentGroupIndex(prev => prev + 1)
      setCurrentStoryIndex(0)
    } else {
      // End of stories
      setShowViewer(false)
    }
  }

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      // Previous story in current group
      setCurrentStoryIndex(prev => prev - 1)
    } else if (currentGroupIndex > 0) {
      // Last story of previous group
      const prevGroupIndex = currentGroupIndex - 1
      const prevGroup = storyGroups[prevGroupIndex]
      setCurrentGroupIndex(prevGroupIndex)
      setCurrentStoryIndex(prevGroup.stories.length - 1)
    } else {
      // Already at first story
      setShowViewer(false)
    }
  }

  const handleStoryReply = async (storyId: string, message: string) => {
    try {
      await storyService.replyToStory(storyId, message)
      // The reply creates a conversation/message, which is handled by the backend
    } catch (err) {
      console.error('Failed to reply to story:', err)
    }
  }

  const handleStoryLike = async (storyId: string) => {
    try {
      // Mark as viewed when liked
      await storyService.markStoryAsViewed(storyId)
      
      // Emit socket event for real-time notification
      const story = storyGroups[currentGroupIndex]?.stories[currentStoryIndex]
      if (story && story.author._id !== currentUser?._id) {
        socketService.viewStory(storyId, story.author._id)
      }
    } catch (err) {
      console.error('Failed to like story:', err)
    }
  }

  const handleViewerClose = () => {
    setShowViewer(false)
    
    // Mark current story as viewed
    const currentStory = storyGroups[currentGroupIndex]?.stories[currentStoryIndex]
    if (currentStory) {
      storyService.markStoryAsViewed(currentStory._id).catch(console.error)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <button
            onClick={loadStories}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {/* Add story button */}
          <div className="flex-shrink-0">
            <button
              onClick={onCreateStory}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center">
                {currentUser?.profile?.avatar ? (
                  <img
                    src={currentUser.profile.avatar}
                    alt="Your story"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                      {currentUser?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Your story</span>
            </button>
          </div>

          {/* Stories */}
          {loading ? (
            // Loading skeletons
            [...Array(5)].map((_, index) => (
              <div key={index} className="flex-shrink-0">
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : (
            storyGroups.map((group, groupIndex) => (
              <div key={group.author._id} className="flex-shrink-0">
                <button
                  onClick={() => handleStoryClick(groupIndex)}
                  className="flex flex-col items-center space-y-1 group"
                >
                  <div className={`relative p-0.5 rounded-full ${
                    group.hasUnwatched
                      ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    <div className="bg-white dark:bg-gray-800 rounded-full p-0.5">
                      {group.author.profile.avatar ? (
                        <img
                          src={group.author.profile.avatar}
                          alt={`${group.author.username}'s story`}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                            {group.author.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium max-w-[64px] truncate">
                    {group.author.profile.fullName || group.author.username}
                  </span>
                </button>
              </div>
            ))
          )}

          {/* Show more indicator */}
          {storyGroups.length === 0 && !loading && (
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-3xl mb-2">📖</div>
                <p className="text-sm">No stories yet</p>
                <p className="text-xs mt-1">Be the first to share a story!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer */}
      {showViewer && storyGroups.length > 0 && (
        <StoryViewer
          storyGroups={storyGroups}
          currentGroupIndex={currentGroupIndex}
          currentStoryIndex={currentStoryIndex}
          isOpen={showViewer}
          onClose={handleViewerClose}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onReply={handleStoryReply}
          onLike={handleStoryLike}
          currentUserId={currentUser?._id}
        />
      )}
    </>
  )
}