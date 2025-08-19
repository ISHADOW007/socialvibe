// Common API response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error'
  message?: string
  data?: T
  error?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
  limit: number
}

export interface PaginatedResponse<T = any> {
  status: string
  data: {
    items: T[]
    pagination: PaginationMeta
  }
}

// API Error types
export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: Record<string, any>
}

// Upload types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResponse {
  status: string
  data: {
    url: string
    publicId: string
    format: string
    width?: number
    height?: number
    size: number
  }
}

// Search types
export interface SearchParams {
  query: string
  type?: 'users' | 'posts' | 'hashtags' | 'all'
  page?: number
  limit?: number
}

export interface SearchResponse<T = any> {
  status: string
  data: {
    results: T[]
    query: string
    type: string
    pagination: PaginationMeta
  }
}

// Generic list response
export interface ListResponse<T = any> {
  status: string
  data: {
    items: T[]
    total?: number
  }
}