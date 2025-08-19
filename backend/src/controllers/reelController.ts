import { Request, Response, NextFunction } from 'express';
import Reel from '../models/Reel';
import User from '../models/User';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { uploadReelVideo, generateVideoThumbnail } from '../utils/cloudinary';
import { emitToUser } from '../socket/socketHandler';
import mongoose from 'mongoose';

// Create a new reel
export const createReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { caption, hashtags, mentions, music, location, allowDuet, allowRemix, commentsDisabled } = req.body;
  const userId = req.user?._id;
  const file = req.file;

  if (!file) {
    return next(new AppError('Video file is required', 400));
  }

  // Validate video duration (assuming frontend will handle this, but double-check)
  const maxDuration = 60; // seconds
  
  try {
    // Upload video to Cloudinary
    const result = await uploadReelVideo(file.buffer);
    
    // Generate thumbnail
    const thumbnailUrl = generateVideoThumbnail(result.public_id);
    
    // Validate video duration
    if (result.duration > maxDuration) {
      return next(new AppError(`Reel cannot exceed ${maxDuration} seconds`, 400));
    }

    // Process hashtags
    const processedHashtags = hashtags ? 
      hashtags.split(/[\s,]+/)
        .map((tag: string) => tag.replace('#', '').toLowerCase())
        .filter((tag: string) => tag.length > 0)
        .slice(0, 30) // Limit to 30 hashtags
      : [];

    // Process mentions
    let processedMentions: mongoose.Types.ObjectId[] = [];
    if (mentions && mentions.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentions.map((m: string) => m.replace('@', '').toLowerCase()) }
      });
      processedMentions = mentionedUsers.map(user => user._id);
    }

    // Create reel
    const reel = new Reel({
      author: userId,
      videoUrl: result.secure_url,
      thumbnailUrl,
      caption,
      music: music ? {
        name: music.name,
        artist: music.artist,
        url: music.url,
        duration: music.duration
      } : undefined,
      hashtags: processedHashtags,
      mentions: processedMentions,
      videoDetails: {
        duration: result.duration,
        width: result.width,
        height: result.height,
        size: file.size,
        format: result.format
      },
      location: location ? {
        name: location.name,
        coordinates: location.coordinates
      } : undefined,
      allowDuet: allowDuet !== false, // default true
      allowRemix: allowRemix !== false, // default true
      commentsDisabled: commentsDisabled || false
    });

    await reel.save();

    // Populate author details
    await reel.populate('author', 'username profile.avatar profile.fullName profile.isVerified');

    // Emit notification to mentioned users
    if (processedMentions.length > 0) {
      processedMentions.forEach(mentionedUserId => {
        emitToUser(mentionedUserId.toString(), 'new_mention', {
          type: 'reel',
          reelId: reel._id,
          mentionedBy: {
            userId: userId,
            username: req.user?.username
          },
          timestamp: new Date().toISOString()
        });
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Reel created successfully',
      data: {
        reel
      }
    });
  } catch (error) {
    console.error('Error creating reel:', error);
    next(new AppError('Failed to create reel', 500));
  }
});

// Get reels feed
export const getReelsFeed = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const reels = await Reel.find({ isArchived: false })
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('comments.author', 'username profile.avatar profile.fullName')
    .populate('comments.replies.author', 'username profile.avatar profile.fullName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalReels = await Reel.countDocuments({ isArchived: false });
  const totalPages = Math.ceil(totalReels / limit);

  res.json({
    status: 'success',
    data: {
      reels,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalReels,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Get single reel
export const getReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;

  const reel = await Reel.findOne({ _id: reelId, isArchived: false })
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('comments.author', 'username profile.avatar profile.fullName')
    .populate('comments.replies.author', 'username profile.avatar profile.fullName')
    .populate('mentions', 'username profile.fullName');

  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  // Increment view count
  reel.stats.viewsCount += 1;
  await reel.save();

  res.json({
    status: 'success',
    data: {
      reel
    }
  });
});

// Like/Unlike reel
export const toggleLikeReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const reel = await Reel.findOne({ _id: reelId, isArchived: false });
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isLiked = reel.likes.includes(userObjectId);

  if (isLiked) {
    // Unlike reel
    reel.likes = reel.likes.filter(id => id.toString() !== userId);
  } else {
    // Like reel
    reel.likes.push(userObjectId);

    // Emit notification to reel author (if not self-like)
    if (reel.author.toString() !== userId) {
      emitToUser(reel.author.toString(), 'new_reel_like', {
        reelId: reel._id,
        likedBy: {
          userId: userId,
          username: req.user?.username,
          avatar: req.user?.profile?.avatar
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  await reel.save();

  res.json({
    status: 'success',
    data: {
      isLiked: !isLiked,
      likesCount: reel.stats.likesCount
    }
  });
});

// Add comment to reel
export const addComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;
  const { text } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!text || text.trim().length === 0) {
    return next(new AppError('Comment text is required', 400));
  }

  const reel = await Reel.findOne({ _id: reelId, isArchived: false });
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  if (reel.commentsDisabled) {
    return next(new AppError('Comments are disabled for this reel', 403));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const comment = {
    _id: new mongoose.Types.ObjectId(),
    author: userObjectId,
    text: text.trim(),
    likes: [],
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  reel.comments.push(comment as any);
  await reel.save();

  // Populate the new comment
  await reel.populate('comments.author', 'username profile.avatar profile.fullName');

  // Find the newly added comment
  const newComment = reel.comments[reel.comments.length - 1];

  // Emit notification to reel author (if not self-comment)
  if (reel.author.toString() !== userId) {
    emitToUser(reel.author.toString(), 'new_reel_comment', {
      reelId: reel._id,
      comment: newComment,
      commentBy: {
        userId: userId,
        username: req.user?.username,
        avatar: req.user?.profile?.avatar
      },
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json({
    status: 'success',
    message: 'Comment added successfully',
    data: {
      comment: newComment,
      commentsCount: reel.stats.commentsCount
    }
  });
});

// Reply to reel comment
export const replyToComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId, commentId } = req.params;
  const { text } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!text || text.trim().length === 0) {
    return next(new AppError('Reply text is required', 400));
  }

  const reel = await Reel.findOne({ _id: reelId, isArchived: false });
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  if (reel.commentsDisabled) {
    return next(new AppError('Comments are disabled for this reel', 403));
  }

  const comment = reel.comments.find(c => c._id.toString() === commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const reply = {
    _id: new mongoose.Types.ObjectId(),
    author: userObjectId,
    text: text.trim(),
    likes: [],
    createdAt: new Date()
  };

  comment.replies.push(reply as any);
  await reel.save();

  // Populate the reply
  await reel.populate('comments.replies.author', 'username profile.avatar profile.fullName');

  // Find the newly added reply
  const updatedComment = reel.comments.find(c => c._id.toString() === commentId);
  const newReply = updatedComment?.replies[updatedComment.replies.length - 1];

  // Emit notification to comment author (if not self-reply)
  if (comment.author.toString() !== userId) {
    emitToUser(comment.author.toString(), 'new_reel_reply', {
      reelId: reel._id,
      commentId: commentId,
      reply: newReply,
      repliedBy: {
        userId: userId,
        username: req.user?.username,
        avatar: req.user?.profile?.avatar
      },
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json({
    status: 'success',
    message: 'Reply added successfully',
    data: {
      reply: newReply,
      commentsCount: reel.stats.commentsCount
    }
  });
});

// Save/Unsave reel
export const toggleSaveReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const reel = await Reel.findOne({ _id: reelId, isArchived: false });
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isSaved = reel.saves.includes(userObjectId);

  if (isSaved) {
    // Unsave reel
    reel.saves = reel.saves.filter(id => id.toString() !== userId);
  } else {
    // Save reel
    reel.saves.push(userObjectId);
  }

  await reel.save();

  res.json({
    status: 'success',
    data: {
      isSaved: !isSaved,
      savesCount: reel.stats.savesCount
    }
  });
});

// Share reel
export const shareReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const reel = await Reel.findOne({ _id: reelId, isArchived: false });
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  // Add to shares if not already shared by this user
  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (!reel.shares.includes(userObjectId)) {
    reel.shares.push(userObjectId);
    await reel.save();
  }

  res.json({
    status: 'success',
    data: {
      sharesCount: reel.stats.sharesCount
    }
  });
});

// Delete reel
export const deleteReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  if (reel.author.toString() !== userId) {
    return next(new AppError('You can only delete your own reels', 403));
  }

  await Reel.findByIdAndDelete(reelId);

  res.json({
    status: 'success',
    message: 'Reel deleted successfully'
  });
});

// Archive/Unarchive reel
export const toggleArchiveReel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { reelId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return next(new AppError('Reel not found', 404));
  }

  if (reel.author.toString() !== userId) {
    return next(new AppError('You can only archive your own reels', 403));
  }

  reel.isArchived = !reel.isArchived;
  await reel.save();

  res.json({
    status: 'success',
    message: `Reel ${reel.isArchived ? 'archived' : 'unarchived'} successfully`,
    data: {
      isArchived: reel.isArchived
    }
  });
});

// Get user's reels
export const getUserReels = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;

  const reels = await Reel.findByAuthor(userId)
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .skip(skip)
    .limit(limit);

  const totalReels = await Reel.countDocuments({ 
    author: userId, 
    isArchived: false 
  });
  
  const totalPages = Math.ceil(totalReels / limit);

  res.json({
    status: 'success',
    data: {
      reels,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalReels,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Get trending reels
export const getTrendingReels = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const limit = parseInt(req.query.limit as string) || 20;

  const reels = await Reel.findTrending(limit)
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified');

  res.json({
    status: 'success',
    data: {
      reels
    }
  });
});

// Search reels by hashtag
export const searchReelsByHashtag = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { hashtag } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const reels = await Reel.findByHashtag(hashtag.toLowerCase())
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .skip(skip)
    .limit(limit);

  const totalReels = await Reel.countDocuments({ 
    hashtags: hashtag.toLowerCase(),
    isArchived: false 
  });
  
  const totalPages = Math.ceil(totalReels / limit);

  res.json({
    status: 'success',
    data: {
      reels,
      hashtag: `#${hashtag}`,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalReels,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Search reels by music
export const searchReelsByMusic = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { musicName } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const reels = await Reel.findByMusic(musicName)
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .skip(skip)
    .limit(limit);

  const totalReels = await Reel.countDocuments({ 
    'music.name': new RegExp(musicName, 'i'),
    isArchived: false 
  });
  
  const totalPages = Math.ceil(totalReels / limit);

  res.json({
    status: 'success',
    data: {
      reels,
      musicName,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalReels,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});