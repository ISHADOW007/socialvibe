import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { reelService, type Reel } from '@/services/reelService'
import ReelPlayer from '@/components/reel/ReelPlayer'
import CreateReelModal from '@/components/reel/CreateReelModal'
import Button from '@/components/ui/Button'

export default function Reels() {
  const { user } = useAuthStore()
  const [reels, setReels] = useState<Reel[]>([])
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [showCreateReel, setShowCreateReel] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  // Load initial reels
  useEffect(() => {
    loadReels()
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreReels()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  // Intersection observer for current reel tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-reel-index') || '0')
            setCurrentReelIndex(index)
          }
        })
      },
      { threshold: 0.5 }
    )

    const reelElements = document.querySelectorAll('[data-reel-index]')
    reelElements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [reels])

  const loadReels = async () => {
    try {
      setLoading(true)
      const response = await reelService.getReelsFeed(1, 10)
      setReels(response.data.items)
      setHasMore(response.data.pagination.hasNextPage)
      setPage(2)
    } catch (error) {
      console.error('Error loading reels:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreReels = async () => {
    try {
      setLoadingMore(true)
      const response = await reelService.getReelsFeed(page, 10)
      setReels(prev => [...prev, ...response.data.items])
      setHasMore(response.data.pagination.hasNextPage)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Error loading more reels:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleCreateReel = async (reelData: any) => {
    try {
      const newReel = await reelService.createReel(reelData)
      setReels(prev => [newReel, ...prev])
    } catch (error) {
      console.error('Error creating reel:', error)
      throw error
    }
  }

  const handleLikeReel = async (reelId: string) => {
    try {
      const { isLiked, likesCount } = await reelService.toggleLikeReel(reelId)
      setReels(prev => prev.map(reel => 
        reel._id === reelId 
          ? { 
              ...reel, 
              likes: isLiked 
                ? [...reel.likes, user!._id] 
                : reel.likes.filter(id => id !== user!._id),
              stats: { ...reel.stats, likesCount }
            }
          : reel
      ))
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleSaveReel = async (reelId: string) => {
    try {
      const { isSaved, savesCount } = await reelService.toggleSaveReel(reelId)
      setReels(prev => prev.map(reel => 
        reel._id === reelId 
          ? { 
              ...reel, 
              saves: isSaved 
                ? [...reel.saves, user!._id] 
                : reel.saves.filter(id => id !== user!._id),
              stats: { ...reel.stats, savesCount }
            }
          : reel
      ))
    } catch (error) {
      console.error('Error toggling save:', error)
    }
  }

  const handleShareReel = async (reelId: string) => {
    try {
      const { sharesCount } = await reelService.shareReel(reelId)
      setReels(prev => prev.map(reel => 
        reel._id === reelId 
          ? { ...reel, stats: { ...reel.stats, sharesCount } }
          : reel
      ))
    } catch (error) {
      console.error('Error sharing reel:', error)
    }
  }

  const handleAddComment = async (reelId: string, text: string) => {
    try {
      const { comment, commentsCount } = await reelService.addComment(reelId, text)
      setReels(prev => prev.map(reel => 
        reel._id === reelId 
          ? { 
              ...reel, 
              comments: [...reel.comments, comment],
              stats: { ...reel.stats, commentsCount }
            }
          : reel
      ))
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  const scrollToReel = (index: number) => {
    const container = containerRef.current
    if (container) {
      const targetScrollTop = index * window.innerHeight
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && currentReelIndex < reels.length - 1) {
      scrollToReel(currentReelIndex + 1)
    } else if (e.key === 'ArrowUp' && currentReelIndex > 0) {
      scrollToReel(currentReelIndex - 1)
    }
  }, [currentReelIndex, reels.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Full-screen container */}
      <div 
        ref={containerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide bg-black"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.map((reel, index) => (
          <div
            key={reel._id}
            data-reel-index={index}
            className="h-screen snap-start relative"
          >
            <ReelPlayer
              reel={reel}
              isActive={index === currentReelIndex}
              onLike={handleLikeReel}
              onSave={handleSaveReel}
              onShare={handleShareReel}
              onComment={handleAddComment}
              currentUserId={user?._id}
              className="h-full"
            />
          </div>
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="h-screen flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && <div ref={observerRef} className="h-4" />}
      </div>

      {/* Create Reel FAB */}
      {user && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            onClick={() => setShowCreateReel(true)}
            className="w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 shadow-lg"
            icon={<PlusIcon className="w-6 h-6" />}
          />
        </div>
      )}

      {/* Empty state */}
      {reels.length === 0 && !loading && (
        <div className="h-screen flex flex-col items-center justify-center bg-black text-white px-6">
          <div className="text-center">
            <div className="text-6xl mb-6">🎥</div>
            <h2 className="text-2xl font-bold mb-4">No Reels Yet</h2>
            <p className="text-gray-400 mb-8 max-w-sm">
              Be the first to share a reel! Create engaging short videos to connect with others.
            </p>
            {user && (
              <Button
                onClick={() => setShowCreateReel(true)}
                icon={<PlusIcon className="w-5 h-5" />}
                size="lg"
              >
                Create Your First Reel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Create Reel Modal */}
      <CreateReelModal
        isOpen={showCreateReel}
        onClose={() => setShowCreateReel(false)}
        onCreateReel={handleCreateReel}
      />
    </div>
  )
}