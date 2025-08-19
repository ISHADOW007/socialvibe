import express from 'express';
import { protect, optionalAuth } from '../middleware/auth';
import { uploadReelVideo, handleMulterError } from '../middleware/upload';
import { requireProfileCompletion } from '../middleware/profileComplete';
import {
  createReel,
  getReelsFeed,
  getReel,
  toggleLikeReel,
  addComment,
  replyToComment,
  toggleSaveReel,
  shareReel,
  deleteReel,
  toggleArchiveReel,
  getUserReels,
  getTrendingReels,
  searchReelsByHashtag,
  searchReelsByMusic
} from '../controllers/reelController';

const router = express.Router();

// Public routes
router.get('/feed', optionalAuth, getReelsFeed);
router.get('/trending', optionalAuth, getTrendingReels);
router.get('/hashtag/:hashtag', optionalAuth, searchReelsByHashtag);
router.get('/music/:musicName', optionalAuth, searchReelsByMusic);
router.get('/user/:userId', optionalAuth, getUserReels);
router.get('/:reelId', optionalAuth, getReel);

// Protected routes
router.use(protect);

// Routes that require profile completion
router.use(requireProfileCompletion);

// Create reel with video upload
router.post('/', uploadReelVideo, handleMulterError, createReel);

// Reel interactions
router.post('/:reelId/like', toggleLikeReel);
router.delete('/:reelId/like', toggleLikeReel);
router.post('/:reelId/save', toggleSaveReel);
router.delete('/:reelId/save', toggleSaveReel);
router.post('/:reelId/share', shareReel);

// Comments
router.post('/:reelId/comments', addComment);
router.post('/:reelId/comments/:commentId/replies', replyToComment);

// Reel management
router.delete('/:reelId', deleteReel);
router.patch('/:reelId/archive', toggleArchiveReel);

export default router;