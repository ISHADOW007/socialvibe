import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface UserProfile {
  avatar?: string
  bio?: string
  fullName?: string
  website?: string
  location?: string
  dateOfBirth?: string
  isPrivate: boolean
  isVerified: boolean
}

export interface UserStats {
  postsCount: number
  followersCount: number
  followingCount: number
  reelsCount: number
  storiesCount: number
}

export interface User {
  _id: string
  username: string
  email: string
  profile: UserProfile
  stats: UserStats
  isFollowed?: boolean
  isFollowedByUser?: boolean
  relationshipStatus?: 'following' | 'requested' | 'none'
  mutualFollowersCount?: number
  joinedDate: string
  lastActive?: string
}

export interface UpdateProfileData {
  fullName?: string
  bio?: string
  website?: string
  location?: string
  dateOfBirth?: string
  isPrivate?: boolean
}

export const userService = {
  // Get user profile by username
  getUserByUsername: async (username: string): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>(`/users/${username}`)
    return response.data.data!.user
  },

  // Get user profile by ID
  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>(`/users/${userId}`)
    return response.data.data!.user
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/users/me')
    return response.data.data!.user
  },

  // Update user profile
  updateProfile: async (profileData: UpdateProfileData): Promise<User> => {
    const response = await api.put<ApiResponse<{ user: User }>>('/users/profile', {
      profile: profileData
    })
    return response.data.data!.user
  },

  // Complete user profile (required for app functionality)
  completeProfile: async (profileData: { fullName: string; bio?: string; avatar?: string }): Promise<User> => {
    const response = await api.post<ApiResponse<{ user: User }>>('/users/profile/complete', profileData)
    return response.data.data!.user
  },

  // Get profile completion status
  getProfileCompletionStatus: async (): Promise<{ isComplete: boolean; missingFields: string[] }> => {
    const response = await api.get<ApiResponse<{ isComplete: boolean; missingFields: string[] }>>('/users/profile/completion-status')
    return response.data.data!
  },

  // Update profile avatar
  updateAvatar: async (avatar: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData()
    formData.append('avatar', avatar)

    const response = await api.patch<ApiResponse<{ avatarUrl: string }>>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })

    return response.data.data!
  },

  // Follow/Unfollow user
  toggleFollowUser: async (userId: string): Promise<{ 
    isFollowing: boolean
    followersCount: number 
    relationshipStatus: 'following' | 'requested' | 'none'
  }> => {
    const response = await api.post<ApiResponse<{ 
      isFollowing: boolean
      followersCount: number
      relationshipStatus: 'following' | 'requested' | 'none'
    }>>(`/users/${userId}/follow`)
    return response.data.data!
  },

  // Get user followers
  getUserFollowers: async (userId: string, page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>(`/users/${userId}/followers`, {
      params: { page, limit }
    })
    return response.data
  },

  // Get user following
  getUserFollowing: async (userId: string, page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>(`/users/${userId}/following`, {
      params: { page, limit }
    })
    return response.data
  },

  // Get mutual followers
  getMutualFollowers: async (userId: string, limit = 10): Promise<{ users: User[] }> => {
    const response = await api.get<ApiResponse<{ users: User[] }>>(`/users/${userId}/mutual-followers`, {
      params: { limit }
    })
    return response.data.data!
  },

  // Search users
  searchUsers: async (query: string, page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>('/users/search', {
      params: { query, page, limit }
    })
    return response.data
  },

  // Get suggested users to follow
  getSuggestedUsers: async (limit = 10): Promise<{ users: User[] }> => {
    const response = await api.get<ApiResponse<{ users: User[] }>>('/users/suggested', {
      params: { limit }
    })
    return response.data.data!
  },

  // Block/Unblock user
  toggleBlockUser: async (userId: string): Promise<{ isBlocked: boolean }> => {
    const response = await api.post<ApiResponse<{ isBlocked: boolean }>>(`/users/${userId}/block`)
    return response.data.data!
  },

  // Report user
  reportUser: async (userId: string, reason: string, description?: string): Promise<void> => {
    await api.post(`/users/${userId}/report`, {
      reason,
      description
    })
  },

  // Delete account
  deleteAccount: async (password: string): Promise<void> => {
    await api.delete('/users/me', {
      data: { password }
    })
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch('/users/me/password', {
      currentPassword,
      newPassword
    })
  },

  // Enable/Disable two-factor authentication
  toggleTwoFactorAuth: async (): Promise<{ isEnabled: boolean; qrCode?: string; backupCodes?: string[] }> => {
    const response = await api.post<ApiResponse<{ 
      isEnabled: boolean
      qrCode?: string
      backupCodes?: string[]
    }>>('/users/me/2fa')
    return response.data.data!
  },

  // Verify two-factor authentication
  verifyTwoFactorAuth: async (code: string): Promise<{ isVerified: boolean }> => {
    const response = await api.post<ApiResponse<{ isVerified: boolean }>>('/users/me/2fa/verify', {
      code
    })
    return response.data.data!
  },

  // Get user activity/sessions
  getUserSessions: async (): Promise<{ sessions: any[] }> => {
    const response = await api.get<ApiResponse<{ sessions: any[] }>>('/users/me/sessions')
    return response.data.data!
  },

  // Logout from all devices
  logoutAllDevices: async (): Promise<void> => {
    await api.post('/users/me/logout-all')
  }
}

export default userService