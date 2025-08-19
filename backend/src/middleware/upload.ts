import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    // Allow image files
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  } else if (file.mimetype.startsWith('video/')) {
    // Allow video files
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Only MP4, WebM, QuickTime, and AVI are allowed.'));
    }
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'));
  }
};

// Base multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Max 10 files
  }
});

// Single image upload (for avatars, etc.)
export const uploadSingleImage = upload.single('image');

// Single video upload (for reels, etc.)
export const uploadSingleVideo = upload.single('video');

// Multiple media upload (for posts)
export const uploadMultipleMedia = upload.array('media', 10); // Max 10 files

// Avatar upload with size limit
export const uploadAvatar = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image format for avatar. Only JPEG, PNG, and WebP are allowed.'));
      }
    } else {
      cb(new Error('Only image files are allowed for avatar.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars
  }
}).single('avatar');

// Story media upload with restrictions
export const uploadStoryMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for stories
  }
}).single('media');

// Reel video upload with specific limits
export const uploadReelVideo = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video format for reel. Only MP4, WebM, and QuickTime are allowed.'));
      }
    } else {
      cb(new Error('Only video files are allowed for reels.'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for reels
  }
}).single('video');

// Error handling middleware for multer
export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new AppError('File too large. Please upload a smaller file.', 413));
      case 'LIMIT_FILE_COUNT':
        return next(new AppError('Too many files. Maximum allowed files exceeded.', 413));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new AppError('Unexpected file field. Please check your form data.', 400));
      case 'LIMIT_FIELD_KEY':
        return next(new AppError('Field name too long.', 400));
      case 'LIMIT_FIELD_VALUE':
        return next(new AppError('Field value too long.', 400));
      case 'LIMIT_FIELD_COUNT':
        return next(new AppError('Too many fields.', 400));
      case 'LIMIT_PART_COUNT':
        return next(new AppError('Too many parts in multipart data.', 400));
      default:
        return next(new AppError('File upload error.', 500));
    }
  } else if (error) {
    // Handle custom file filter errors
    return next(new AppError(error.message, 400));
  }
  
  next();
};

// Middleware to validate uploaded files
export const validateUploadedFiles = (req: Request, res: Response, next: NextFunction) => {
  // Check if files were uploaded
  if (!req.file && !req.files) {
    return next(new AppError('No files uploaded', 400));
  }

  // Validate individual file properties
  const files = req.files as Express.Multer.File[] || [req.file as Express.Multer.File];
  
  for (const file of files) {
    if (!file) continue;

    // Additional validation can be added here
    // For example, checking file dimensions, duration, etc.
    
    // Validate file size again (just in case)
    if (file.size === 0) {
      return next(new AppError('Empty file uploaded', 400));
    }
  }

  next();
};

// Middleware to add file metadata
export const addFileMetadata = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Express.Multer.File[] || [req.file as Express.Multer.File];
  
  files.forEach((file) => {
    if (file) {
      // Add additional metadata
      (file as any).uploadedAt = new Date();
      (file as any).isImage = file.mimetype.startsWith('image/');
      (file as any).isVideo = file.mimetype.startsWith('video/');
    }
  });

  next();
};

export default upload;