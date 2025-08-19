import api from './api'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutResponse,
  GetMeResponse,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
  User
} from '@/types/auth'

export const authService = {
  // Login user
  login: async (identifier: string, password: string): Promise<LoginResponse['data']> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      identifier,
      password
    } as LoginRequest)
    
    return response.data.data
  },

  // Register new user
  register: async (userData: RegisterRequest): Promise<RegisterResponse['data']> => {
    const response = await api.post<RegisterResponse>('/auth/register', userData)
    
    return response.data.data
  },

  // Logout user
  logout: async (): Promise<void> => {
    await api.post<LogoutResponse>('/auth/logout')
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse['data']> => {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh-token', {
      refreshToken
    } as RefreshTokenRequest)
    
    return response.data.data
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<GetMeResponse>('/auth/me')
    
    return response.data.data.user
  },

  // Update password
  updatePassword: async (passwords: UpdatePasswordRequest): Promise<void> => {
    await api.put<UpdatePasswordResponse>('/auth/password', passwords)
  },

  // Delete account
  deleteAccount: async (password: string): Promise<void> => {
    await api.delete<DeleteAccountResponse>('/auth/account', {
      data: { password } as DeleteAccountRequest
    })
  },

  // Validate token (check if still valid)
  validateToken: async (): Promise<boolean> => {
    try {
      await api.get('/auth/me')
      return true
    } catch (error) {
      return false
    }
  }
}

export default authService