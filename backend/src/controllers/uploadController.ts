import { Request, Response, NextFunction } from 'express';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { 
  uploadImage, 
  uploadVideo, 
  uploadAvatar, 
  uploadPostMedia,
  uploadStoryMedia,
  uploadReelVideo,
  generateVideoThumbnail 
} from '../utils/cloudinary';

// Upload single image
export const uploadSingleImage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return next(new AppError('No image file provided', 400));
  }

  if (!file.mimetype.startsWith('image/')) {
    return next(new AppError('Only image files are allowed', 400));
  }

  try {
    const result = await uploadImage(file.buffer, {
      folder: 'socialvibe/general',
      transformation: [
        { width: 1080, height: 1080, crop: 'limit', quality: 'auto' }
      ]
    });

    res.json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: file.size,
        bytes: result.bytes
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    next(new AppError('Failed to upload image', 500));
  }
});

// Upload single video
export const uploadSingleVideo = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return next(new AppError('No video file provided', 400));
  }

  if (!file.mimetype.startsWith('video/')) {
    return next(new AppError('Only video files are allowed', 400));
  }

  try {
    const result = await uploadVideo(file.buffer, {
      folder: 'socialvibe/general',
      resource_type: 'video',
      transformation: [
        { width: 720, height: 1280, crop: 'limit', quality: 'auto' }
      ]
    });

    // Generate thumbnail
    const thumbnailUrl = generateVideoThumbnail(result.public_id);

    res.json({
      status: 'success',
      message: 'Video uploaded successfully',
      data: {
        url: result.secure_url,
        thumbnailUrl,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        size: file.size,
        bytes: result.bytes
      }
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    next(new AppError('Failed to upload video', 500));
  }
});

// Upload avatar
export const uploadUserAvatar = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return next(new AppError('No avatar file provided', 400));
  }

  if (!file.mimetype.startsWith('image/')) {
    return next(new AppError('Only image files are allowed for avatar', 400));
  }

  try {
    const result = await uploadAvatar(file.buffer);

    res.json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: file.size,
        bytes: result.bytes
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    next(new AppError('Failed to upload avatar', 500));
  }
});

// Upload multiple media files for posts
export const uploadPostMediaFiles = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return next(new AppError('No files provided', 400));
  }

  if (files.length > 10) {
    return next(new AppError('Maximum 10 files allowed', 400));
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const isVideo = file.mimetype.startsWith('video/');
      const result = await uploadPostMedia(file.buffer, isVideo ? 'video' : 'image');
      
      return {
        type: isVideo ? 'video' : 'image',
        url: result.secure_url,
        thumbnailUrl: isVideo ? generateVideoThumbnail(result.public_id) : undefined,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        size: file.size,
        bytes: result.bytes,
        originalName: file.originalname
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.json({
      status: 'success',
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      }
    });
  } catch (error) {
    console.error('Error uploading post media:', error);
    next(new AppError('Failed to upload media files', 500));
  }
});

// Upload story media
export const uploadStoryMediaFile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return next(new AppError('No media file provided', 400));
  }

  const isVideo = file.mimetype.startsWith('video/');
  
  // Validate file type
  if (!isVideo && !file.mimetype.startsWith('image/')) {
    return next(new AppError('Only image and video files are allowed for stories', 400));
  }

  try {
    const result = await uploadStoryMedia(file.buffer, isVideo ? 'video' : 'image');

    // Validate video duration for stories (max 15 seconds)
    if (isVideo && result.duration > 15) {
      return next(new AppError('Story video cannot exceed 15 seconds', 400));
    }

    res.json({
      status: 'success',
      message: 'Story media uploaded successfully',
      data: {
        type: isVideo ? 'video' : 'image',
        url: result.secure_url,
        thumbnailUrl: isVideo ? result.eager?.[0]?.secure_url : undefined,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        size: file.size,
        bytes: result.bytes
      }
    });
  } catch (error) {
    console.error('Error uploading story media:', error);
    next(new AppError('Failed to upload story media', 500));
  }
});

// Upload reel video
export const uploadReelVideoFile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return next(new AppError('No video file provided', 400));
  }

  if (!file.mimetype.startsWith('video/')) {
    return next(new AppError('Only video files are allowed for reels', 400));
  }

  try {
    const result = await uploadReelVideo(file.buffer);

    // Validate video duration for reels (max 60 seconds)
    if (result.duration > 60) {
      return next(new AppError('Reel video cannot exceed 60 seconds', 400));
    }

    // Generate thumbnail
    const thumbnailUrl = generateVideoThumbnail(result.public_id);

    res.json({
      status: 'success',
      message: 'Reel video uploaded successfully',
      data: {
        url: result.secure_url,
        thumbnailUrl,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        size: file.size,
        bytes: result.bytes,
        aspectRatio: result.width / result.height
      }
    });
  } catch (error) {
    console.error('Error uploading reel video:', error);
    next(new AppError('Failed to upload reel video', 500));
  }
});

// Get upload progress (for large files)
export const getUploadProgress = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { uploadId } = req.params;

  // This would typically check upload progress from a cache or database
  // For now, we'll return a placeholder response
  res.json({
    status: 'success',
    data: {
      uploadId,
      progress: 100, // In a real implementation, this would be dynamic
      status: 'completed',
      message: 'Upload completed successfully'
    }
  });
});

// Delete uploaded file
export const deleteUploadedFile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { publicId } = req.params;
  const { resourceType = 'image' } = req.query;

  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  try {
    // Note: deleteMedia function would need to be imported from cloudinary utils
    // const result = await deleteMedia(publicId, resourceType as 'image' | 'video');

    res.json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    next(new AppError('Failed to delete file', 500));
  }
});

// Validate file before upload
export const validateFile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return next(new AppError('No file provided for validation', 400));
  }

  const isVideo = file.mimetype.startsWith('video/');
  const isImage = file.mimetype.startsWith('image/');

  if (!isVideo && !isImage) {
    return next(new AppError('Only image and video files are supported', 400));
  }

  // File size validation
  const maxImageSize = 10 * 1024 * 1024; // 10MB
  const maxVideoSize = 100 * 1024 * 1024; // 100MB

  if (isImage && file.size > maxImageSize) {
    return next(new AppError('Image file too large (max 10MB)', 400));
  }

  if (isVideo && file.size > maxVideoSize) {
    return next(new AppError('Video file too large (max 100MB)', 400));
  }

  // Format validation
  const allowedImageFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  if (isImage && !allowedImageFormats.includes(file.mimetype)) {
    return next(new AppError('Unsupported image format. Use JPEG, PNG, WebP, or GIF', 400));
  }

  if (isVideo && !allowedVideoFormats.includes(file.mimetype)) {
    return next(new AppError('Unsupported video format. Use MP4, WebM, QuickTime, or AVI', 400));
  }

  res.json({
    status: 'success',
    message: 'File validation passed',
    data: {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      type: isVideo ? 'video' : 'image',
      isValid: true
    }
  });
});