import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import toast from 'react-hot-toast'
import { 
  UserIcon, 
  ArrowRightOnRectangleIcon, 
  ShieldCheckIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore()
  const { user, logout, updateUser, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: user?.profile?.fullName || '',
    bio: user?.profile?.bio || ''
  })

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleEditProfile = () => {
    setProfileForm({
      fullName: user?.profile?.fullName || '',
      bio: user?.profile?.bio || ''
    })
    setIsEditingProfile(true)
  }

  const handleCancelEdit = () => {
    setIsEditingProfile(false)
    setProfileForm({
      fullName: user?.profile?.fullName || '',
      bio: user?.profile?.bio || ''
    })
  }

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true)
      
      // Basic validation
      if (!profileForm.fullName.trim()) {
        toast.error('Full name is required')
        return
      }

      const updatedUser = await userService.updateProfile({
        fullName: profileForm.fullName.trim(),
        bio: profileForm.bio.trim()
      })

      // Update auth store
      updateUser(updatedUser)
      
      setIsEditingProfile(false)
      toast.success('Profile updated successfully!')
      
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error?.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-dark-surface rounded-lg w-32"></div>
            <div className="h-64 bg-dark-surface rounded-xl"></div>
            <div className="h-48 bg-dark-surface rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
        
        <div className="space-y-6">
          {/* User Profile Section */}
          {user && (
            <div className="bg-dark-surface rounded-xl shadow-md p-6 border border-dark-border">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <UserIcon className="w-6 h-6 mr-2" />
                Your Account
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-primary flex-shrink-0">
                    {user.profile.avatar ? (
                      <img
                        src={user.profile.avatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-white truncate">
                      {user.profile.fullName || user.username}
                    </h3>
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/profile/${user.username}`)}
                    >
                      View Profile
                    </Button>
                    
                    {!isEditingProfile ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleEditProfile}
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveProfile}
                          loading={isUpdating}
                          disabled={isUpdating || !profileForm.fullName.trim()}
                        >
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                        >
                          <XMarkIcon className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-4 mt-4">
                    <Input
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                      disabled={isUpdating}
                    />
                    
                    <Textarea
                      label="Bio"
                      placeholder="Tell us about yourself..."
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={isUpdating}
                      rows={3}
                    />
                    
                    <div className="text-xs text-gray-400">
                      {!user.profile.fullName || !user.profile.bio ? (
                        <p className="text-orange-400">⚠️ Complete your profile to unlock all features</p>
                      ) : (
                        <p>Update your profile information</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.profile.bio ? (
                      <p className="text-gray-300 text-sm bg-dark-bg rounded-lg p-3">
                        {user.profile.bio}
                      </p>
                    ) : (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-orange-400 text-sm">
                          <strong>⚠️ Profile Incomplete:</strong> Add your bio to unlock all features
                        </p>
                      </div>
                    )}
                    
                    {!user.profile.fullName && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-orange-400 text-sm">
                          <strong>⚠️ Missing Full Name:</strong> Add your full name to complete your profile
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <div>
                    <span className="text-white font-medium">{user.stats.followersCount}</span> followers
                  </div>
                  <div>
                    <span className="text-white font-medium">{user.stats.followingCount}</span> following
                  </div>
                  <div>
                    <span className="text-white font-medium">{user.stats.postsCount}</span> posts
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          <div className="bg-dark-surface rounded-xl shadow-md p-6 border border-dark-border">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              {theme === 'dark' ? (
                <MoonIcon className="w-6 h-6 mr-2" />
              ) : (
                <SunIcon className="w-6 h-6 mr-2" />
              )}
              Appearance
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-gray-300 font-medium">Theme</label>
                <p className="text-gray-400 text-sm">Choose your preferred theme</p>
              </div>
              <Button
                onClick={toggleTheme}
                variant="outline"
              >
                {theme === 'dark' ? (
                  <>
                    <SunIcon className="w-4 h-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <MoonIcon className="w-4 h-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-dark-surface rounded-xl shadow-md p-6 border border-dark-border">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <ShieldCheckIcon className="w-6 h-6 mr-2" />
              Privacy & Security
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <div>
                  <label className="text-gray-300 font-medium">Privacy Settings</label>
                  <p className="text-gray-400 text-sm">Manage who can see your content</p>
                </div>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <div>
                  <label className="text-gray-300 font-medium">Blocked Users</label>
                  <p className="text-gray-400 text-sm">View and manage blocked accounts</p>
                </div>
                <Button variant="ghost" size="sm">
                  View List
                </Button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <label className="text-gray-300 font-medium">Account Security</label>
                  <p className="text-gray-400 text-sm">Change password and security settings</p>
                </div>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-dark-surface rounded-xl shadow-md p-6 border border-dark-border">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BellIcon className="w-6 h-6 mr-2" />
              Notifications
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <div>
                  <label className="text-gray-300 font-medium">Push Notifications</label>
                  <p className="text-gray-400 text-sm">Receive notifications on your device</p>
                </div>
                <Button variant="ghost" size="sm">
                  Configure
                </Button>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <div>
                  <label className="text-gray-300 font-medium">Email Notifications</label>
                  <p className="text-gray-400 text-sm">Get updates via email</p>
                </div>
                <Button variant="ghost" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <label className="text-gray-300 font-medium">Activity Notifications</label>
                  <p className="text-gray-400 text-sm">Notifications for likes, comments, and follows</p>
                </div>
                <Button variant="ghost" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </div>

          {/* Logout Section */}
          <div className="bg-dark-surface rounded-xl shadow-md p-6 border border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Sign Out</h3>
                <p className="text-gray-400 text-sm">Sign out of your SocialVibe account</p>
              </div>
              <Button
                onClick={handleLogout}
                loading={isLoggingOut}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}