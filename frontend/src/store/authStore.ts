import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/auth'
import type { User, AuthTokens } from '@/types/auth'

interface AuthState {
  // State
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  updateUser: (userData: Partial<User>) => void
  initializeAuth: () => Promise<void>
  getToken: () => string | null
}

interface RegisterData {
  username: string
  email: string
  password: string
  fullName?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,

      // Initialize authentication on app start
      initializeAuth: async () => {
        set({ isLoading: true })
        
        try {
          const state = get()
          
          if (state.tokens?.accessToken) {
            // Try to get current user with existing token
            try {
              const user = await authService.getCurrentUser()
              set({ 
                user, 
                isAuthenticated: true, 
                isLoading: false 
              })
              return
            } catch (error) {
              console.warn('Failed to get current user, trying to refresh token...')
              
              // Try to refresh token
              if (state.tokens?.refreshToken) {
                const refreshed = await get().refreshToken()
                if (refreshed) {
                  return
                }
              }
            }
          }
          
          // If we get here, authentication failed
          set({ 
            user: null, 
            tokens: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        } catch (error) {
          console.error('Auth initialization failed:', error)
          set({ 
            user: null, 
            tokens: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      },

      // Login action
      login: async (identifier: string, password: string) => {
        set({ isLoading: true })
        
        try {
          const response = await authService.login(identifier, password)
          
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      // Register action
      register: async (userData: RegisterData) => {
        set({ isLoading: true })
        
        try {
          const response = await authService.register(userData)
          
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true })
        
        try {
          await authService.logout()
        } catch (error) {
          console.warn('Logout API call failed:', error)
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      },

      // Refresh token action
      refreshToken: async (): Promise<boolean> => {
        const state = get()
        
        if (!state.tokens?.refreshToken) {
          return false
        }

        try {
          const response = await authService.refreshToken(state.tokens.refreshToken)
          
          set({
            tokens: {
              accessToken: response.tokens.accessToken,
              refreshToken: state.tokens.refreshToken, // Keep existing refresh token
              expiresIn: response.tokens.expiresIn
            }
          })
          
          return true
        } catch (error) {
          console.error('Token refresh failed:', error)
          
          // Clear invalid tokens
          set({
            user: null,
            tokens: null,
            isAuthenticated: false
          })
          
          return false
        }
      },

      // Update user action
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },

      // Get current token
      getToken: (): string | null => {
        const state = get()
        return state.tokens?.accessToken || null
      },
    }),
    {
      name: 'socialvibe-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)