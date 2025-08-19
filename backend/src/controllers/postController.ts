import { Request, Response, NextFunction } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { uploadPostMedia } from '../utils/cloudinary';
import { emitToUser } from '../socket/socketHandler';
import mongoose from 'mongoose';

// Create a new post
export const createPost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { caption, hashtags, mentions, location, hideLikeCount, commentsDisabled } = req.body;
  const userId = req.user?._id;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return next(new AppError('At least one media file is required', 400));
  }

  if (files.length > 10) {
    return next(new AppError('Maximum 10 media files allowed', 400));
  }

  try {
    // Upload media files to Cloudinary
    const mediaPromises = files.map(async (file) => {
      const result = await uploadPostMedia(file.buffer, file.mimetype.startsWith('video') ? 'video' : 'image');
      return {
        type: file.mimetype.startsWith('video') ? 'video' as const : 'image' as const,
        url: result.secure_url,
        thumbnail: file.mimetype.startsWith('video') ? result.eager?.[0]?.secure_url : undefined,
        width: result.width,
        height: result.height,
        duration: result.duration,
        size: file.size
      };
    });

    const media = await Promise.all(mediaPromises);

    // Process hashtags safely
    const processedHashtags = hashtags && hashtags.trim() !== '' ? 
      hashtags.split(/[\s,]+/)
        .map((tag: string) => tag.replace('#', '').toLowerCase())
        .filter((tag: string) => tag.length > 0)
        .slice(0, 30) // Limit to 30 hashtags
      : [];

    // Process mentions safely
    let processedMentions: mongoose.Types.ObjectId[] = [];
    if (mentions && mentions.trim() !== '') {
      const mentionArray = mentions.split(/[\s,]+/)
        .map((m: string) => m.replace('@', '').toLowerCase())
        .filter((m: string) => m.length > 0);
        
      if (mentionArray.length > 0) {
        const mentionedUsers = await User.find({
          username: { $in: mentionArray }
        });
        processedMentions = mentionedUsers.map(user => user._id);
      }
    }

    // Create post
    const post = new Post({
      author: userId,
      caption,
      media,
      hashtags: processedHashtags,
      mentions: processedMentions,
      location: (() => {
        if (!location || location.trim() === '') return undefined;
        try {
          const parsedLocation = JSON.parse(location);
          return {
            name: parsedLocation.name,
            coordinates: parsedLocation.coordinates
          };
        } catch (e) {
          console.warn('Failed to parse location JSON:', location);
          return undefined;
        }
      })(),
      hideLikeCount: hideLikeCount || false,
      commentsDisabled: commentsDisabled || false
    });

    await post.save();

    // Populate author details
    await post.populate('author', 'username profile.avatar profile.fullName profile.isVerified');

    // Update user's post count
    await User.findByIdAndUpdate(userId, { $inc: { 'stats.postsCount': 1 } });

    // Emit notification to mentioned users
    if (processedMentions.length > 0) {
      processedMentions.forEach(mentionedUserId => {
        emitToUser(mentionedUserId.toString(), 'new_mention', {
          type: 'post',
          postId: post._id,
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
      message: 'Post created successfully',
      data: {
        post
      }
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    
    // Handle specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      return next(new AppError('Invalid post data provided', 400));
    }
    
    if (error?.message && error.message.includes('Cloudinary')) {
      return next(new AppError('Failed to upload media files', 500));
    }
    
    next(new AppError('Failed to create post', 500));
  }
});

// Get posts for feed
export const getFeedPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const posts = await Post.find({ isArchived: false })
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('comments.author', 'username profile.avatar profile.fullName')
    .populate('comments.replies.author', 'username profile.avatar profile.fullName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments({ isArchived: false });
  const totalPages = Math.ceil(totalPosts / limit);

  res.json({
    status: 'success',
    data: {
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalPosts,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Get single post
export const getPost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId } = req.params;

  const post = await Post.findOne({ _id: postId, isArchived: false })
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('comments.author', 'username profile.avatar profile.fullName')
    .populate('comments.replies.author', 'username profile.avatar profile.fullName')
    .populate('mentions', 'username profile.fullName');

  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Increment view count
  post.stats.viewsCount += 1;
  await post.save();

  res.json({
    status: 'success',
    data: {
      post
    }
  });
});

// Like/Unlike post
export const toggleLikePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const post = await Post.findOne({ _id: postId, isArchived: false });
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isLiked = post.likes.includes(userObjectId);

  if (isLiked) {
    // Unlike post
    post.likes = post.likes.filter(id => id.toString() !== userId.toString());
  } else {
    // Like post
    post.likes.push(userObjectId);

    // Emit notification to post author (if not self-like)
    if (post.author.toString() !== userId.toString()) {
      emitToUser(post.author.toString(), 'new_like', {
        postId: post._id,
        likedBy: {
          userId: userId,
          username: req.user?.username,
          avatar: req.user?.profile?.avatar
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  await post.save();

  res.json({
    status: 'success',
    data: {
      isLiked: !isLiked,
      likesCount: post.stats.likesCount
    }
  });
});

// Add comment to post
export const addComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!text || text.trim().length === 0) {
    return next(new AppError('Comment text is required', 400));
  }

  const post = await Post.findOne({ _id: postId, isArchived: false });
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  if (post.commentsDisabled) {
    return next(new AppError('Comments are disabled for this post', 403));
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

  post.comments.push(comment as any);
  await post.save();

  // Populate the new comment
  await post.populate('comments.author', 'username profile.avatar profile.fullName');

  // Find the newly added comment
  const newComment = post.comments[post.comments.length - 1];

  // Emit notification to post author (if not self-comment)
  if (post.author.toString() !== userId) {
    emitToUser(post.author.toString(), 'new_comment_notification', {
      postId: post._id,
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
      commentsCount: post.stats.commentsCount
    }
  });
});

// Reply to comment
export const replyToComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId, commentId } = req.params;
  const { text } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!text || text.trim().length === 0) {
    return next(new AppError('Reply text is required', 400));
  }

  const post = await Post.findOne({ _id: postId, isArchived: false });
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  if (post.commentsDisabled) {
    return next(new AppError('Comments are disabled for this post', 403));
  }

  const comment = post.comments.find(c => c._id.toString() === commentId);
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
  await post.save();

  // Populate the reply
  await post.populate('comments.replies.author', 'username profile.avatar profile.fullName');

  // Find the newly added reply
  const updatedComment = post.comments.find(c => c._id.toString() === commentId);
  const newReply = updatedComment?.replies[updatedComment.replies.length - 1];

  // Emit notification to comment author (if not self-reply)
  if (comment.author.toString() !== userId) {
    emitToUser(comment.author.toString(), 'new_reply', {
      postId: post._id,
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
      commentsCount: post.stats.commentsCount
    }
  });
});

// Like/Unlike comment
export const toggleLikeComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId, commentId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const post = await Post.findOne({ _id: postId, isArchived: false });
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const comment = post.comments.find(c => c._id.toString() === commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isLiked = comment.likes.some(id => id.toString() === userId);

  if (isLiked) {
    comment.likes = comment.likes.filter((id: any) => id.toString() !== userId);
  } else {
    comment.likes.push(userObjectId);
  }

  await post.save();

  res.json({
    status: 'success',
    data: {
      isLiked: !isLiked,
      likesCount: comment.likes.length
    }
  });
});

// Delete post
export const deletePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const post = await Post.findById(postId);
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  if (post.author.toString() !== userId) {
    return next(new AppError('You can only delete your own posts', 403));
  }

  await Post.findByIdAndDelete(postId);

  // Update user's post count
  await User.findByIdAndUpdate(userId, { $inc: { 'stats.postsCount': -1 } });

  res.json({
    status: 'success',
    message: 'Post deleted successfully'
  });
});

// Archive/Unarchive post
export const toggleArchivePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { postId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const post = await Post.findById(postId);
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  if (post.author.toString() !== userId) {
    return next(new AppError('You can only archive your own posts', 403));
  }

  post.isArchived = !post.isArchived;
  await post.save();

  res.json({
    status: 'success',
    message: `Post ${post.isArchived ? 'archived' : 'unarchived'} successfully`,
    data: {
      isArchived: post.isArchived
    }
  });
});

// Get user's posts
export const getUserPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;

  const posts = await Post.find({ 
    author: userId, 
    isArchived: false 
  })
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments({ 
    author: userId, 
    isArchived: false 
  });
  
  const totalPages = Math.ceil(totalPosts / limit);

  res.json({
    status: 'success',
    data: {
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalPosts,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Search posts by hashtag
export const searchPostsByHashtag = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { hashtag } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const posts = await Post.findByHashtag(hashtag.toLowerCase())
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments({ 
    hashtags: hashtag.toLowerCase(),
    isArchived: false 
  });
  
  const totalPages = Math.ceil(totalPosts / limit);

  res.json({
    status: 'success',
    data: {
      posts,
      hashtag: `#${hashtag}`,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalPosts,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Get trending posts
export const getTrendingPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const limit = parseInt(req.query.limit as string) || 20;

  // Get posts from the last 7 days sorted by engagement
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const posts = await Post.find({ 
    isArchived: false,
    createdAt: { $gte: sevenDaysAgo }
  })
    .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
    .sort({ 
      'stats.likesCount': -1, 
      'stats.commentsCount': -1,
      'stats.viewsCount': -1,
      createdAt: -1 
    })
    .limit(limit);

  res.json({
    status: 'success',
    data: {
      posts
    }
  });
});