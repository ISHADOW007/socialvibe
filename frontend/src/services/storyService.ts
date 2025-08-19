import api from './api'
import type { ApiResponse } from '@/types/api'

export interface StoryAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

export interface StoryViewer {
  user: StoryAuthor
  viewedAt: string
}

export interface Story {
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
    coordinates?: [number, number]
  }
  viewers: StoryViewer[]
  stats: {
    viewsCount: number
  }
  timeRemaining: string
  isExpired: boolean
  createdAt: string
  expiresAt: string
}

export interface StoryGroup {
  author: StoryAuthor
  stories: Story[]
  hasUnwatched: boolean
}

export interface CreateStoryData {
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
}

export const storyService = {
  // Get stories feed (grouped by user)
  getStoriesFeed: async (): Promise<{ storyGroups: StoryGroup[] }> => {
    const response = await api.get<ApiResponse<{ storyGroups: StoryGroup[] }>>('/stories/feed')
    return response.data.data!
  },

  // Get user's own stories
  getMyStories: async (): Promise<{ stories: Story[] }> => {
    const response = await api.get<ApiResponse<{ stories: Story[] }>>('/stories/my')
    return response.data.data!
  },

  // Get single story
  getStory: async (storyId: string): Promise<Story> => {
    const response = await api.get<ApiResponse<{ story: Story }>>(`/stories/${storyId}`)
    return response.data.data!.story
  },

  // Create story
  createStory: async (storyData: CreateStoryData, onUploadProgress?: (progress: number) => void): Promise<Story> => {
    const formData = new FormData()
    
    // Add media file if provided
    if (storyData.media) {
      formData.append('media', storyData.media)
    }
    
    // Add other data
    if (storyData.text) formData.append('text', JSON.stringify(storyData.text))
    if (storyData.stickers) formData.append('stickers', JSON.stringify(storyData.stickers))
    if (storyData.music) formData.append('music', JSON.stringify(storyData.music))
    if (storyData.location) formData.append('location', JSON.stringify(storyData.location))
    if (storyData.privacy) formData.append('privacy', JSON.stringify(storyData.privacy))

    const response = await api.post<ApiResponse<{ story: Story }>>('/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onUploadProgress(progress)
        }
      },
    })

    return response.data.data!.story
  },

  // Mark story as viewed
  markStoryAsViewed: async (storyId: string): Promise<void> => {
    await api.post(`/stories/${storyId}/view`)
  },

  // Delete story
  deleteStory: async (storyId: string): Promise<void> => {
    await api.delete(`/stories/${storyId}`)
  },

  // Archive story
  archiveStory: async (storyId: string): Promise<{ isArchived: boolean }> => {
    const response = await api.patch<ApiResponse<{ isArchived: boolean }>>(`/stories/${storyId}/archive`)
    return response.data.data!
  },

  // Add story to highlights
  addToHighlights: async (storyId: string, highlightId?: string): Promise<{ highlight: any }> => {
    const response = await api.post<ApiResponse<{ highlight: any }>>(`/stories/${storyId}/highlight`, {
      highlightId
    })
    return response.data.data!
  },

  // Get story viewers
  getStoryViewers: async (storyId: string): Promise<{ viewers: StoryViewer[] }> => {
    const response = await api.get<ApiResponse<{ viewers: StoryViewer[] }>>(`/stories/${storyId}/viewers`)
    return response.data.data!
  },

  // Reply to story
  replyToStory: async (storyId: string, message: string): Promise<void> => {
    await api.post(`/stories/${storyId}/reply`, {
      message
    })
  }
}

export default storyService