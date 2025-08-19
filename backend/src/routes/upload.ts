import express from 'express';
import { protect } from '../middleware/auth';
import { 
  uploadSingleImage, 
  uploadSingleVideo, 
  uploadAvatar,
  uploadMultipleMedia,
  uploadStoryMedia,
  uploadReelVideo,
  handleMulterError 
} from '../middleware/upload';
import {
  uploadSingleImage as uploadImageHandler,
  uploadSingleVideo as uploadVideoHandler,
  uploadUserAvatar,
  uploadPostMediaFiles,
  uploadStoryMediaFile,
  uploadReelVideoFile,
  getUploadProgress,
  deleteUploadedFile,
  validateFile
} from '../controllers/uploadController';

const router = express.Router();

// All upload routes require authentication
router.use(protect);

// File validation endpoint
router.post('/validate', uploadSingleImage, handleMulterError, validateFile);

// Single file uploads
router.post('/image', uploadSingleImage, handleMulterError, uploadImageHandler);
router.post('/video', uploadSingleVideo, handleMulterError, uploadVideoHandler);
router.post('/avatar', uploadAvatar, handleMulterError, uploadUserAvatar);

// Specific media uploads
router.post('/post', uploadMultipleMedia, handleMulterError, uploadPostMediaFiles);
router.post('/story', uploadStoryMedia, handleMulterError, uploadStoryMediaFile);
router.post('/reel', uploadReelVideo, handleMulterError, uploadReelVideoFile);

// Upload management
router.get('/progress/:uploadId', getUploadProgress);
router.delete('/:publicId', deleteUploadedFile);

export default router;