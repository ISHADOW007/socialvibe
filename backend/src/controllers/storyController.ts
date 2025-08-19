import { Request, Response, NextFunction } from 'express';
import Story from '../models/Story';
import User from '../models/User';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { uploadStoryMedia } from '../utils/cloudinary';
import { emitToUser } from '../socket/socketHandler';
import mongoose from 'mongoose';

// Create a new story
export const createStory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { text, stickers, music, location, privacy } = req.body;
  const userId = req.user?._id;
  const file = req.file;

  if (!file && !text) {
    return next(new AppError('Story must have media or text content', 400));
  }

  try {
    let mediaData = undefined;
    
    if (file) {
      // Upload media to Cloudinary
      const result = await uploadStoryMedia(file.buffer, file.mimetype.startsWith('video') ? 'video' : 'image');
      
      mediaData = {
        type: file.mimetype.startsWith('video') ? 'video' as const : 'image' as const,
        url: result.secure_url,
        thumbnail: file.mimetype.startsWith('video') ? result.eager?.[0]?.secure_url : undefined,
        width: result.width,
        height: result.height,
        duration: result.duration
      };

      // Validate video duration for stories (max 15 seconds)
      if (mediaData.type === 'video' && result.duration > 15) {
        return next(new AppError('Story video cannot exceed 15 seconds', 400));
      }
    }

    // Process text content if provided
    let textData = undefined;
    if (text) {
      textData = {
        content: text.content,
        fontSize: text.fontSize || 24,
        color: text.color || '#FFFFFF',
        backgroundColor: text.backgroundColor,
        position: {
          x: text.position?.x || 50,
          y: text.position?.y || 50
        }
      };
    }

    // Process stickers
    const processedStickers = stickers?.map((sticker: any) => ({
      type: sticker.type,
      content: sticker.content,
      position: sticker.position,
      size: sticker.size || 50
    })) || [];

    // Process privacy settings
    const privacySettings = {
      hideFromUsers: privacy?.hideFromUsers || [],
      allowedUsers: privacy?.allowedUsers || undefined
    };

    // Create story
    const story = new Story({
      author: userId,
      media: mediaData,
      text: textData,
      stickers: processedStickers,
      music: music ? {
        name: music.name,
        artist: music.artist,
        startTime: music.startTime || 0,
        duration: music.duration
      } : undefined,
      location: location ? {
        name: location.name,
        coordinates: location.coordinates
      } : undefined,
      privacy: privacySettings
    });

    await story.save();

    // Populate author details
    await story.populate('author', 'username profile.avatar profile.fullName profile.isVerified');

    res.status(201).json({
      status: 'success',
      message: 'Story created successfully',
      data: {
        story
      }
    });
  } catch (error) {
    console.error('Error creating story:', error);
    next(new AppError('Failed to create story', 500));
  }
});

// Get active stories for feed
export const getActiveStories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  // Get stories from users the current user follows (or all if no auth)
  const stories = await Story.findActiveStories()
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('viewers.user', 'username profile.avatar profile.fullName');

  // Group stories by author
  const groupedStories = stories.reduce((acc: any, story: any) => {
    const authorId = story.author._id.toString();
    
    if (!acc[authorId]) {
      acc[authorId] = {
        author: story.author,
        stories: [],
        hasUnwatched: false
      };
    }
    
    acc[authorId].stories.push(story);
    
    // Check if user has watched this story
    if (userId && !story.hasUserViewed(userId.toString())) {
      acc[authorId].hasUnwatched = true;
    }
    
    return acc;
  }, {});

  // Convert to array and sort
  const storyGroups = Object.values(groupedStories).sort((a: any, b: any) => {
    // Prioritize unwatched stories
    if (a.hasUnwatched && !b.hasUnwatched) return -1;
    if (!a.hasUnwatched && b.hasUnwatched) return 1;
    
    // Then sort by latest story
    const aLatest = Math.max(...a.stories.map((s: any) => new Date(s.createdAt).getTime()));
    const bLatest = Math.max(...b.stories.map((s: any) => new Date(s.createdAt).getTime()));
    
    return bLatest - aLatest;
  });

  res.json({
    status: 'success',
    data: {
      storyGroups
    }
  });
});

// Get single story
export const getStory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const userId = req.user?._id;

  const story = await Story.findById(storyId)
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('viewers.user', 'username profile.avatar profile.fullName');

  if (!story || story.isArchived || story.isExpired) {
    return next(new AppError('Story not found or expired', 404));
  }

  // Check privacy settings
  if (userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (story.privacy.hideFromUsers.includes(userObjectId)) {
      return next(new AppError('Story not found', 404));
    }
    
    if (story.privacy.allowedUsers && 
        story.privacy.allowedUsers.length > 0 && 
        !story.privacy.allowedUsers.includes(userObjectId) &&
        story.author._id.toString() !== userId) {
      return next(new AppError('Story not found', 404));
    }
  }

  // Add viewer if authenticated and not the author
  if (userId && story.author._id.toString() !== userId) {
    story.addViewer(userId);
    await story.save();

    // Emit notification to story author
    emitToUser(story.author._id.toString(), 'story_viewed', {
      storyId: story._id,
      viewedBy: {
        userId: userId,
        username: req.user?.username,
        avatar: req.user?.profile?.avatar
      },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    status: 'success',
    data: {
      story
    }
  });
});

// Get user's stories
export const getUserStories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const includeExpired = req.query.includeExpired === 'true';

  const stories = await Story.findUserStories(userId, includeExpired)
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('viewers.user', 'username profile.avatar profile.fullName');

  res.json({
    status: 'success',
    data: {
      stories
    }
  });
});

// Get story highlights
export const getStoryHighlights = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;

  const highlights = await Story.findHighlights(userId)
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified');

  res.json({
    status: 'success',
    data: {
      highlights
    }
  });
});

// Delete story
export const deleteStory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const userId = req.user?._id;

  const story = await Story.findById(storyId);
  if (!story) {
    return next(new AppError('Story not found', 404));
  }

  if (story.author.toString() !== userId) {
    return next(new AppError('You can only delete your own stories', 403));
  }

  await Story.findByIdAndDelete(storyId);

  res.json({
    status: 'success',
    message: 'Story deleted successfully'
  });
});

// Archive story
export const archiveStory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const story = await Story.findById(storyId);
  if (!story) {
    return next(new AppError('Story not found', 404));
  }

  if (story.author.toString() !== userId) {
    return next(new AppError('You can only archive your own stories', 403));
  }

  story.isArchived = true;
  await story.save();

  res.json({
    status: 'success',
    message: 'Story archived successfully'
  });
});

// Add to highlights
export const addToHighlights = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const userId = req.user?._id;

  const story = await Story.findById(storyId);
  if (!story) {
    return next(new AppError('Story not found', 404));
  }

  if (story.author.toString() !== userId) {
    return next(new AppError('You can only add your own stories to highlights', 403));
  }

  story.isHighlight = true;
  await story.save();

  res.json({
    status: 'success',
    message: 'Story added to highlights successfully'
  });
});

// Remove from highlights
export const removeFromHighlights = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const story = await Story.findById(storyId);
  if (!story) {
    return next(new AppError('Story not found', 404));
  }

  if (story.author.toString() !== userId) {
    return next(new AppError('You can only manage your own highlights', 403));
  }

  story.isHighlight = false;
  await story.save();

  res.json({
    status: 'success',
    message: 'Story removed from highlights successfully'
  });
});

// Update story privacy
export const updateStoryPrivacy = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const { hideFromUsers, allowedUsers } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const story = await Story.findById(storyId);
  if (!story) {
    return next(new AppError('Story not found', 404));
  }

  if (story.author.toString() !== userId) {
    return next(new AppError('You can only update your own story privacy', 403));
  }

  if (hideFromUsers) {
    story.privacy.hideFromUsers = hideFromUsers;
  }
  
  if (allowedUsers !== undefined) {
    story.privacy.allowedUsers = allowedUsers;
  }

  await story.save();

  res.json({
    status: 'success',
    message: 'Story privacy updated successfully'
  });
});

// Get story viewers
export const getStoryViewers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { storyId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const story = await Story.findById(storyId)
    .populate('viewers.user', 'username profile.avatar profile.fullName profile.isVerified');

  if (!story) {
    return next(new AppError('Story not found', 404));
  }

  if (story.author.toString() !== userId) {
    return next(new AppError('You can only view your own story analytics', 403));
  }

  res.json({
    status: 'success',
    data: {
      viewers: story.viewers.sort((a, b) => 
        new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
      ),
      totalViews: story.stats.viewsCount
    }
  });
});

// Clean up expired stories (cron job endpoint)
export const cleanupExpiredStories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // This should be called by a cron job, not directly by users
  // In production, you'd want to authenticate this endpoint differently
  
  const expiredStories = await Story.find({
    expiresAt: { $lt: new Date() },
    isHighlight: false,
    isArchived: false
  });

  const deletedCount = expiredStories.length;
  
  // Delete expired non-highlight stories
  await Story.deleteMany({
    expiresAt: { $lt: new Date() },
    isHighlight: false,
    isArchived: false
  });

  res.json({
    status: 'success',
    message: `Cleaned up ${deletedCount} expired stories`
  });
});