import { useState } from 'react'
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'

interface ProfileCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: user?.profile?.fullName || '',
    bio: user?.profile?.bio || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return
    }

    if (!formData.bio.trim()) {
      setError('Bio is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const updatedUser = await userService.completeProfile({
        fullName: formData.fullName.trim(),
        bio: formData.bio.trim(),
      })

      // Update auth store with new user data
      updateUser(updatedUser)

      // Call completion callback
      onComplete()
      
      // Close modal
      onClose()
    } catch (err: any) {
      console.error('Error completing profile:', err)
      setError(err?.response?.data?.message || 'Failed to complete profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="relative bg-dark-surface rounded-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
              <p className="text-sm text-gray-400">Required to continue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name - Required */}
          <div>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              This is required to use SocialVibe features
            </p>
          </div>

          {/* Bio - Required */}
          <div>
            <Textarea
              label="Bio"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              disabled={loading}
              rows={3}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              This is required to complete your profile
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!formData.fullName.trim() || !formData.bio.trim() || loading}
              className="flex-1"
            >
              Complete Profile
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">
            <strong>Why is this required?</strong> We need your full name and bio to personalize your experience and help others discover your content on SocialVibe.
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default ProfileCompletionModal