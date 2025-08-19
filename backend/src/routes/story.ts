import express from 'express';
import { protect, optionalAuth } from '../middleware/auth';
import { uploadStoryMedia, handleMulterError } from '../middleware/upload';
import { requireProfileCompletion } from '../middleware/profileComplete';
import {
  createStory,
  getActiveStories,
  getStory,
  getUserStories,
  getStoryHighlights,
  deleteStory,
  archiveStory,
  addToHighlights,
  removeFromHighlights,
  updateStoryPrivacy,
  getStoryViewers,
  cleanupExpiredStories
} from '../controllers/storyController';

const router = express.Router();

// Public routes
router.get('/active', optionalAuth, getActiveStories);
router.get('/feed', optionalAuth, getActiveStories);
router.get('/user/:userId', optionalAuth, getUserStories);
router.get('/highlights/:userId', optionalAuth, getStoryHighlights);
router.get('/:storyId', optionalAuth, getStory);

// System route (should be protected in production)
router.post('/cleanup-expired', cleanupExpiredStories);

// Protected routes
router.use(protect);

// Routes that require profile completion
router.use(requireProfileCompletion);

// Create story with media upload
router.post('/', uploadStoryMedia, handleMulterError, createStory);

// Story management
router.delete('/:storyId', deleteStory);
router.patch('/:storyId/archive', archiveStory);
router.patch('/:storyId/highlights/add', addToHighlights);
router.patch('/:storyId/highlights/remove', removeFromHighlights);
router.patch('/:storyId/privacy', updateStoryPrivacy);

// Story analytics
router.get('/:storyId/viewers', getStoryViewers);

export default router;