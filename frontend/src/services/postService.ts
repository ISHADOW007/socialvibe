import api, { createFormData } from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface PostMedia {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  width?: number
  height?: number
}

export interface PostAuthor {
  _id: string
  username: string
  profile: {
    avatar?: string
    fullName?: string
    isVerified: boolean
  }
}

export interface PostComment {
  _id: string
  author: PostAuthor
  text: string
  likes: string[]
  replies: any[]
  createdAt: string
}

export interface Post {
  _id: string
  author: PostAuthor
  caption?: string
  media: PostMedia[]
  hashtags: string[]
  mentions: string[]
  likes: string[]
  comments: PostComment[]
  stats: {
    likesCount: number
    commentsCount: number
    sharesCount: number
    viewsCount: number
  }
  location?: {
    name: string
    coordinates?: [number, number]
  }
  hideLikeCount: boolean
  commentsDisabled: boolean
  timeAgo: string
  createdAt: string
}

export interface CreatePostData {
  caption?: string
  files: File[]
  location?: { name: string; coordinates?: [number, number] }
  hashtags?: string[]
  mentions?: string[]
  hideLikeCount?: boolean
  commentsDisabled?: boolean
}

export const postService = {
  // Get feed posts
  getFeedPosts: async (page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
    const response = await api.get<ApiResponse<{ posts: Post[]; pagination: any }>>('/posts/feed', {
      params: { page, limit }
    })
    
    // Transform backend response to match frontend expectations
    const backendData = response.data.data!
    return {
      status: response.data.status,
      data: {
        items: backendData.posts,
        pagination: {
          ...backendData.pagination,
          hasNextPage: backendData.pagination.hasNext // Map hasNext to hasNextPage
        }
      }
    }
  },

  // Get trending posts
  getTrendingPosts: async (limit = 20): Promise<{ posts: Post[] }> => {
    const response = await api.get<ApiResponse<{ posts: Post[] }>>('/posts/trending', {
      params: { limit }
    })
    return response.data.data!
  },

  // Get single post
  getPost: async (postId: string): Promise<Post> => {
    const response = await api.get<ApiResponse<{ post: Post }>>(`/posts/${postId}`)
    return response.data.data!.post
  },

  // Create post
  createPost: async (postData: CreatePostData, onUploadProgress?: (progress: number) => void): Promise<Post> => {
    const formData = createFormData({
      caption: postData.caption || '',
      hashtags: postData.hashtags?.join(' ') || '',
      mentions: postData.mentions?.join(' ') || '',
      location: postData.location ? JSON.stringify(postData.location) : '',
      hideLikeCount: postData.hideLikeCount || false,
      commentsDisabled: postData.commentsDisabled || false,
    })

    // Append each file with the same field name 'media' for multer array handling
    postData.files.forEach(file => {
      formData.append('media', file)
    })

    const response = await api.post<ApiResponse<{ post: Post }>>('/posts', formData, {
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

    return response.data.data!.post
  },

  // Like/Unlike post
  toggleLikePost: async (postId: string): Promise<{ isLiked: boolean; likesCount: number }> => {
    const response = await api.post<ApiResponse<{ isLiked: boolean; likesCount: number }>>(`/posts/${postId}/like`)
    return response.data.data!
  },

  // Add comment
  addComment: async (postId: string, text: string): Promise<{ comment: PostComment; commentsCount: number }> => {
    const response = await api.post<ApiResponse<{ comment: PostComment; commentsCount: number }>>(`/posts/${postId}/comments`, {
      text
    })
    return response.data.data!
  },

  // Reply to comment
  replyToComment: async (postId: string, commentId: string, text: string): Promise<{ reply: any; commentsCount: number }> => {
    const response = await api.post<ApiResponse<{ reply: any; commentsCount: number }>>(`/posts/${postId}/comments/${commentId}/replies`, {
      text
    })
    return response.data.data!
  },

  // Like/Unlike comment
  toggleLikeComment: async (postId: string, commentId: string): Promise<{ isLiked: boolean; likesCount: number }> => {
    const response = await api.post<ApiResponse<{ isLiked: boolean; likesCount: number }>>(`/posts/${postId}/comments/${commentId}/like`)
    return response.data.data!
  },

  // Delete post
  deletePost: async (postId: string): Promise<void> => {
    await api.delete(`/posts/${postId}`)
  },

  // Archive/Unarchive post
  toggleArchivePost: async (postId: string): Promise<{ isArchived: boolean }> => {
    const response = await api.patch<ApiResponse<{ isArchived: boolean }>>(`/posts/${postId}/archive`)
    return response.data.data!
  },

  // Get user's posts
  getUserPosts: async (userId: string, page = 1, limit = 12): Promise<any> => {
    const response = await api.get<any>(`/users/${userId}/posts`, {
      params: { page, limit }
    })
    return response.data
  },

  // Search posts by hashtag
  searchPostsByHashtag: async (hashtag: string, page = 1, limit = 20): Promise<PaginatedResponse<Post> & { hashtag: string }> => {
    const response = await api.get<PaginatedResponse<Post> & { hashtag: string }>(`/posts/hashtag/${hashtag}`, {
      params: { page, limit }
    })
    return response.data
  }
}

export default postService