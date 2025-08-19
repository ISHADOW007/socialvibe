export interface User {
  _id: string
  username: string
  email: string
  profile: {
    fullName?: string
    bio?: string
    avatar?: string
    coverPhoto?: string
    dateOfBirth?: string
    website?: string
    location?: string
    isVerified: boolean
    isPrivate: boolean
  }
  stats: {
    postsCount: number
    followersCount: number
    followingCount: number
  }
  followers?: User[]
  following?: User[]
  isFollowing?: boolean
  isFollowedBy?: boolean
  isBlocked?: boolean
  isOwnProfile?: boolean
  lastSeen?: string
  createdAt: string
  updatedAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  expiresIn: string
}

export interface LoginRequest {
  identifier: string // username or email
  password: string
}

export interface LoginResponse {
  status: string
  message: string
  data: {
    user: User
    tokens: AuthTokens
  }
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  fullName?: string
}

export interface RegisterResponse {
  status: string
  message: string
  data: {
    user: User
    tokens: AuthTokens
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  status: string
  message: string
  data: {
    tokens: AuthTokens
  }
}

export interface LogoutResponse {
  status: string
  message: string
}

export interface GetMeResponse {
  status: string
  data: {
    user: User
  }
}

export interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdatePasswordResponse {
  status: string
  message: string
}

export interface DeleteAccountRequest {
  password: string
}

export interface DeleteAccountResponse {
  status: string
  message: string
}

// Authentication error types
export interface AuthError {
  message: string
  status?: number
  code?: string
}

// Form validation types
export interface LoginFormData {
  identifier: string
  password: string
  rememberMe?: boolean
}

export interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  fullName?: string
  agreeToTerms: boolean
}

// Profile update types
export interface ProfileUpdateRequest {
  profile?: {
    fullName?: string
    bio?: string
    website?: string
    location?: string
    dateOfBirth?: string
    isPrivate?: boolean
  }
}

export interface ProfileUpdateResponse {
  status: string
  message: string
  data: {
    user: User
  }
}