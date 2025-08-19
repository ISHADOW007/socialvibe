import express from 'express';
import { protect, optionalAuth } from '../middleware/auth';
import { uploadMultipleMedia, handleMulterError } from '../middleware/upload';
import { requireProfileCompletion } from '../middleware/profileComplete';
import {
  createPost,
  getFeedPosts,
  getPost,
  toggleLikePost,
  addComment,
  replyToComment,
  toggleLikeComment,
  deletePost,
  toggleArchivePost,
  getUserPosts,
  searchPostsByHashtag,
  getTrendingPosts
} from '../controllers/postController';

const router = express.Router();

// Public routes
router.get('/feed', optionalAuth, getFeedPosts);
router.get('/trending', optionalAuth, getTrendingPosts);
router.get('/hashtag/:hashtag', optionalAuth, searchPostsByHashtag);
router.get('/user/:userId', optionalAuth, getUserPosts);
router.get('/:postId', optionalAuth, getPost);

// Protected routes
router.use(protect);

// Routes that require profile completion
router.use(requireProfileCompletion);

// Create post with media upload
router.post('/', uploadMultipleMedia, handleMulterError, createPost);

// Post interactions
router.post('/:postId/like', toggleLikePost);
router.delete('/:postId/like', toggleLikePost);

// Comments
router.post('/:postId/comments', addComment);
router.post('/:postId/comments/:commentId/replies', replyToComment);
router.post('/:postId/comments/:commentId/like', toggleLikeComment);
router.delete('/:postId/comments/:commentId/like', toggleLikeComment);

// Post management
router.delete('/:postId', deletePost);
router.patch('/:postId/archive', toggleArchivePost);

export default router;