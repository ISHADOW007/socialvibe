import express from 'express';
import { param, query, body } from 'express-validator';
import {
  getUserProfile,
  updateProfile,
  updateUserAvatar,
  toggleFollow,
  getUserPosts,
  getUserReels,
  searchUsers,
  getSuggestedUsers,
  toggleBlock,
  getProfileCompletionStatus,
  completeProfile
} from '../controllers/userController';
import { protect, optionalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { uploadAvatar, handleMulterError } from '../middleware/upload';

const router = express.Router();

// Search users (public route with optional auth)
router.get('/search', 
  optionalAuth,
  [
    query('query')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  searchUsers
);

// Protected routes (require authentication)
router.use(protect);

// Profile completion routes
router.get('/profile/completion-status', getProfileCompletionStatus);

router.post('/profile/complete',
  [
    body('fullName')
      .notEmpty()
      .withMessage('Full name is required')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Full name must be between 1 and 50 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL')
  ],
  validateRequest,
  completeProfile
);

// Get suggested users to follow
router.get('/suggestions',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  getSuggestedUsers
);

// Update current user's profile
router.put('/profile',
  [
    body('profile.fullName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Full name cannot exceed 50 characters'),
    body('profile.bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('profile.website')
      .optional()
      .trim()
      .isURL()
      .withMessage('Website must be a valid URL'),
    body('profile.location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
    body('profile.dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    body('profile.isPrivate')
      .optional()
      .isBoolean()
      .withMessage('Privacy setting must be a boolean')
  ],
  validateRequest,
  updateProfile
);

// Update current user's avatar
router.patch('/me/avatar', uploadAvatar, handleMulterError, updateUserAvatar);

// Follow/Unfollow user
router.post('/:userId/follow',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],
  validateRequest,
  toggleFollow
);

// Block/Unblock user
router.post('/:userId/block',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],
  validateRequest,
  toggleBlock
);

// Get user profile (can be accessed by username or ID)
router.get('/:identifier',
  optionalAuth, // Allow both authenticated and unauthenticated access
  [
    param('identifier')
      .notEmpty()
      .withMessage('User identifier is required')
  ],
  validateRequest,
  getUserProfile
);

// Get user's posts
router.get('/:userId/posts',
  optionalAuth, // Allow both authenticated and unauthenticated access
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  getUserPosts
);

// Get user's reels
router.get('/:userId/reels',
  optionalAuth, // Allow both authenticated and unauthenticated access
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  getUserReels
);

export default router;