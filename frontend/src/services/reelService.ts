import api, { createFormData } from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface ReelAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

export interface Reel {
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
    coordinates?: [number, number]
  }
  allowDuet: boolean
  allowRemix: boolean
  commentsDisabled: boolean
  timeAgo: string
  createdAt: string
}

export interface CreateReelData {
  video: File
  caption?: string
  music?: {
    name: string
    artist: string
    url?: string
    duration?: number
  }
  location?: { name: string; coordinates?: [number, number] }
  hashtags?: string[]
  mentions?: string[]
  allowDuet?: boolean
  allowRemix?: boolean
  commentsDisabled?: boolean
}

export const reelService = {
  // Get reels feed
  getReelsFeed: async (page = 1, limit = 10): Promise<PaginatedResponse<Reel>> => {
    const response = await api.get<ApiResponse<{ reels: Reel[]; pagination: any }>>('/reels/feed', {
      params: { page, limit }
    })
    
    // Transform backend response to match frontend expectations
    const backendData = response.data.data!
    return {
      status: response.data.status,
      data: {
        items: backendData.reels,
        pagination: {
          ...backendData.pagination,
          hasNextPage: backendData.pagination.hasNext // Map hasNext to hasNextPage
        }
      }
    }
  },

  // Get trending reels
  getTrendingReels: async (limit = 20): Promise<{ reels: Reel[] }> => {
    const response = await api.get<ApiResponse<{ reels: Reel[] }>>('/reels/trending', {
      params: { limit }
    })
    return response.data.data!
  },

  // Get single reel
  getReel: async (reelId: string): Promise<Reel> => {
    const response = await api.get<ApiResponse<{ reel: Reel }>>(`/reels/${reelId}`)
    return response.data.data!.reel
  },

  // Create reel
  createReel: async (reelData: CreateReelData, onUploadProgress?: (progress: number) => void): Promise<Reel> => {
    const formData = new FormData()
    
    // Add video file
    formData.append('video', reelData.video)
    
    // Add other data
    if (reelData.caption) formData.append('caption', reelData.caption)
    if (reelData.hashtags) formData.append('hashtags', reelData.hashtags.join(' '))
    if (reelData.mentions) formData.append('mentions', reelData.mentions.join(' '))
    if (reelData.music) formData.append('music', JSON.stringify(reelData.music))
    if (reelData.location) formData.append('location', JSON.stringify(reelData.location))
    
    formData.append('allowDuet', String(reelData.allowDuet ?? true))
    formData.append('allowRemix', String(reelData.allowRemix ?? true))
    formData.append('commentsDisabled', String(reelData.commentsDisabled ?? false))

    const response = await api.post<ApiResponse<{ reel: Reel }>>('/reels', formData, {
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

    return response.data.data!.reel
  },

  // Like/Unlike reel
  toggleLikeReel: async (reelId: string): Promise<{ isLiked: boolean; likesCount: number }> => {
    const response = await api.post<ApiResponse<{ isLiked: boolean; likesCount: number }>>(`/reels/${reelId}/like`)
    return response.data.data!
  },

  // Save/Unsave reel
  toggleSaveReel: async (reelId: string): Promise<{ isSaved: boolean; savesCount: number }> => {
    const response = await api.post<ApiResponse<{ isSaved: boolean; savesCount: number }>>(`/reels/${reelId}/save`)
    return response.data.data!
  },

  // Share reel
  shareReel: async (reelId: string): Promise<{ sharesCount: number }> => {
    const response = await api.post<ApiResponse<{ sharesCount: number }>>(`/reels/${reelId}/share`)
    return response.data.data!
  },

  // Add comment to reel
  addComment: async (reelId: string, text: string): Promise<{ comment: any; commentsCount: number }> => {
    const response = await api.post<ApiResponse<{ comment: any; commentsCount: number }>>(`/reels/${reelId}/comments`, {
      text
    })
    return response.data.data!
  },

  // Reply to comment
  replyToComment: async (reelId: string, commentId: string, text: string): Promise<{ reply: any; commentsCount: number }> => {
    const response = await api.post<ApiResponse<{ reply: any; commentsCount: number }>>(`/reels/${reelId}/comments/${commentId}/replies`, {
      text
    })
    return response.data.data!
  },

  // Delete reel
  deleteReel: async (reelId: string): Promise<void> => {
    await api.delete(`/reels/${reelId}`)
  },

  // Archive/Unarchive reel
  toggleArchiveReel: async (reelId: string): Promise<{ isArchived: boolean }> => {
    const response = await api.patch<ApiResponse<{ isArchived: boolean }>>(`/reels/${reelId}/archive`)
    return response.data.data!
  },

  // Get user's reels
  getUserReels: async (userId: string, page = 1, limit = 12): Promise<PaginatedResponse<Reel>> => {
    const response = await api.get<ApiResponse<{ reels: Reel[]; pagination: any }>>(`/reels/user/${userId}`, {
      params: { page, limit }
    })
    
    // Transform backend response to match frontend expectations
    const backendData = response.data.data!
    return {
      status: response.data.status,
      data: {
        items: backendData.reels,
        pagination: {
          ...backendData.pagination,
          hasNextPage: backendData.pagination.hasNext
        }
      }
    }
  },

  // Search reels by hashtag
  searchReelsByHashtag: async (hashtag: string, page = 1, limit = 20): Promise<PaginatedResponse<Reel> & { hashtag: string }> => {
    const response = await api.get<ApiResponse<{ reels: Reel[]; pagination: any; hashtag: string }>>(`/reels/hashtag/${hashtag}`, {
      params: { page, limit }
    })
    
    const backendData = response.data.data!
    return {
      status: response.data.status,
      hashtag: backendData.hashtag,
      data: {
        items: backendData.reels,
        pagination: {
          ...backendData.pagination,
          hasNextPage: backendData.pagination.hasNext
        }
      }
    }
  },

  // Search reels by music
  searchReelsByMusic: async (musicName: string, page = 1, limit = 20): Promise<PaginatedResponse<Reel> & { musicName: string }> => {
    const response = await api.get<ApiResponse<{ reels: Reel[]; pagination: any; musicName: string }>>(`/reels/music/${musicName}`, {
      params: { page, limit }
    })
    
    const backendData = response.data.data!
    return {
      status: response.data.status,
      musicName: backendData.musicName,
      data: {
        items: backendData.reels,
        pagination: {
          ...backendData.pagination,
          hasNextPage: backendData.pagination.hasNext
        }
      }
    }
  }
}

export default reelService