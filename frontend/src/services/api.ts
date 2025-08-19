import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore.getState()
    
    if (authStore.tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.tokens.accessToken}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    
    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const authStore = useAuthStore.getState()
        const refreshed = await authStore.refreshToken()
        
        if (refreshed && originalRequest) {
          // Retry the original request with new token
          const newToken = useAuthStore.getState().tokens?.accessToken
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        const authStore = useAuthStore.getState()
        await authStore.logout()
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      }
    }
    
    // Handle other errors
    const errorMessage = extractErrorMessage(error)
    
    // Don't show toast for certain status codes
    const suppressToastFor = [401, 403, 422] // Validation errors, etc.
    
    if (!suppressToastFor.includes(error.response?.status || 0)) {
      toast.error(errorMessage)
    }
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.code,
      details: error.response?.data
    })
  }
)

// Helper function to extract error message
function extractErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any
    
    // Try different error message formats
    if (data.message) return data.message
    if (data.error) return data.error
    if (data.details) return data.details
    if (typeof data === 'string') return data
  }
  
  if (error.message) {
    // Handle network errors
    if (error.message === 'Network Error') {
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.'
    }
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

// Helper function to handle file uploads
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData()
  
  Object.keys(data).forEach(key => {
    const value = data[key]
    
    if (value === null || value === undefined) {
      return
    }
    
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item instanceof File || item instanceof Blob) {
          formData.append(`${key}[${index}]`, item)
        } else {
          formData.append(`${key}[${index}]`, String(item))
        }
      })
    } else {
      formData.append(key, String(value))
    }
  })
  
  return formData
}

// Helper function for file uploads with progress
export const uploadWithProgress = (
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<AxiosResponse> => {
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  })
}

export default api