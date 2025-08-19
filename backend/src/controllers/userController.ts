import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import Reel from '../models/Reel';
import Story from '../models/Story';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { getCachedFeed, cacheFeed } from '../utils/redis';
import { checkProfileCompletionStatus } from '../middleware/profileComplete';
import { uploadAvatar } from '../utils/cloudinary';

// Get user profile by username or ID
export const getUserProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { identifier } = req.params; // Can be username or user ID
  const currentUserId = req.user?._id;

  // Build query conditions
  const queryConditions: any[] = [
    { username: identifier.toLowerCase() }
  ];

  // Only add ObjectId search if identifier is a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    queryConditions.push({ _id: identifier });
  }

  // Find user by username or ID
  let user = await User.findOne({
    $or: queryConditions
  })
  .populate('followers', 'username profile.avatar profile.fullName')
  .populate('following', 'username profile.avatar profile.fullName');

  if (!user || !user.isActive) {
    return next(new AppError('User not found', 404));
  }

  // Check if current user is following this user
  let isFollowing = false;
  let isFollowedBy = false;
  let isBlocked = false;
  
  if (currentUserId && currentUserId !== user._id.toString()) {
    isFollowing = user.followers.some((follower: any) => 
      follower._id.toString() === currentUserId
    );
    isFollowedBy = user.following.some((following: any) => 
      following._id.toString() === currentUserId
    );
    isBlocked = user.blockedUsers.includes(currentUserId as any);
  }

  // Prepare user response
  const userResponse = {
    _id: user._id,
    username: user.username,
    profile: user.profile,
    stats: user.stats,
    isFollowing,
    isFollowedBy,
    isBlocked,
    isOwnProfile: currentUserId === user._id.toString(),
    createdAt: user.createdAt
  };

  // If profile is private and user is not following, limit information
  if (user.profile.isPrivate && !isFollowing && currentUserId !== user._id.toString()) {
    userResponse.stats = {
      ...userResponse.stats,
      postsCount: 0 // Hide post count for private accounts
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: userResponse
    }
  });
});

// Update user profile
export const updateProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const updateData = req.body;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Fields that can be updated
  const allowedFields = [
    'profile.fullName',
    'profile.bio',
    'profile.website',
    'profile.location',
    'profile.dateOfBirth',
    'profile.isPrivate'
  ];

  // Filter update data to only include allowed fields
  const filteredUpdates: any = {};
  
  Object.keys(updateData).forEach(key => {
    if (key.startsWith('profile.')) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    } else if (key === 'profile') {
      // Handle nested profile updates
      Object.keys(updateData.profile).forEach(profileKey => {
        const fullKey = `profile.${profileKey}`;
        if (allowedFields.includes(fullKey)) {
          filteredUpdates[fullKey] = updateData.profile[profileKey];
        }
      });
    }
  });

  // Validate bio length
  if (filteredUpdates['profile.bio'] && filteredUpdates['profile.bio'].length > 500) {
    return next(new AppError('Bio cannot exceed 500 characters', 400));
  }

  // Validate full name length
  if (filteredUpdates['profile.fullName'] && filteredUpdates['profile.fullName'].length > 50) {
    return next(new AppError('Full name cannot exceed 50 characters', 400));
  }

  // Update user
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
});

// Update user avatar
export const updateUserAvatar = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const file = req.file;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!file) {
    return next(new AppError('No avatar file provided', 400));
  }

  try {
    // Upload avatar to Cloudinary
    const result = await uploadAvatar(file.buffer);

    // Update user's profile with new avatar URL
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 'profile.avatar': result.secure_url }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Return success response with avatar URL
    res.status(200).json({
      status: 'success',
      message: 'Avatar updated successfully',
      data: {
        avatarUrl: result.secure_url,
        user: {
          _id: user._id,
          username: user.username,
          profile: user.profile
        }
      }
    });

  } catch (error) {
    console.error('Error updating avatar:', error);
    return next(new AppError('Failed to update avatar', 500));
  }
});

// Get profile completion status
export const getProfileCompletionStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const completionStatus = checkProfileCompletionStatus(user);

  res.status(200).json({
    status: 'success',
    data: {
      isComplete: completionStatus.isComplete,
      missingFields: completionStatus.missingFields,
      profile: user.profile
    }
  });
});

// Complete profile setup
export const completeProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { fullName, bio, avatar } = req.body;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!fullName || fullName.trim().length === 0) {
    return next(new AppError('Full name is required to complete profile', 400));
  }

  if (fullName.length > 50) {
    return next(new AppError('Full name cannot exceed 50 characters', 400));
  }

  const updateData: any = {
    'profile.fullName': fullName.trim()
  };

  if (bio) {
    if (bio.length > 500) {
      return next(new AppError('Bio cannot exceed 500 characters', 400));
    }
    updateData['profile.bio'] = bio.trim();
  }

  if (avatar) {
    updateData['profile.avatar'] = avatar;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const completionStatus = checkProfileCompletionStatus(user);

  res.status(200).json({
    status: 'success',
    message: completionStatus.isComplete ? 'Profile completed successfully!' : 'Profile updated, but still needs completion',
    data: {
      user,
      isComplete: completionStatus.isComplete,
      missingFields: completionStatus.missingFields
    }
  });
});

// Follow/Unfollow user
export const toggleFollow = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user?._id;

  if (!currentUserId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (currentUserId === targetUserId) {
    return next(new AppError('You cannot follow yourself', 400));
  }

  // Find target user
  const targetUser = await User.findById(targetUserId);
  if (!targetUser || !targetUser.isActive) {
    return next(new AppError('User not found', 404));
  }

  // Find current user
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return next(new AppError('Current user not found', 404));
  }

  // Check if already following
  const isFollowing = targetUser.followers.includes(currentUserId as any);

  if (isFollowing) {
    // Unfollow
    targetUser.followers = targetUser.followers.filter(
      (id: any) => id.toString() !== currentUserId
    );
    targetUser.stats.followersCount = Math.max(0, targetUser.stats.followersCount - 1);

    currentUser.following = currentUser.following.filter(
      (id: any) => id.toString() !== targetUserId
    );
    currentUser.stats.followingCount = Math.max(0, currentUser.stats.followingCount - 1);

    await Promise.all([targetUser.save(), currentUser.save()]);

    res.status(200).json({
      status: 'success',
      message: 'User unfollowed successfully',
      data: {
        isFollowing: false,
        followersCount: targetUser.stats.followersCount
      }
    });
  } else {
    // Follow
    targetUser.followers.push(currentUserId as any);
    targetUser.stats.followersCount += 1;

    currentUser.following.push(targetUserId as any);
    currentUser.stats.followingCount += 1;

    await Promise.all([targetUser.save(), currentUser.save()]);

    res.status(200).json({
      status: 'success',
      message: 'User followed successfully',
      data: {
        isFollowing: true,
        followersCount: targetUser.stats.followersCount
      }
    });
  }
});

// Get user's posts
export const getUserPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;

  // Find target user
  const targetUser = await User.findById(userId);
  if (!targetUser || !targetUser.isActive) {
    return next(new AppError('User not found', 404));
  }

  // Check if current user can view posts
  const canViewPosts = 
    currentUserId === userId || // Own posts
    !targetUser.profile.isPrivate || // Public account
    (currentUserId && targetUser.followers.includes(currentUserId as any)); // Following private account

  if (!canViewPosts) {
    return res.status(200).json({
      status: 'success',
      message: 'This account is private',
      data: {
        posts: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalPosts: 0,
          hasNext: false,
          hasPrevious: false
        }
      }
    });
  }

  // Get posts
  const posts = await Post.find({ 
    author: userId, 
    isArchived: false 
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
  .select('-comments'); // Exclude comments for better performance

  const totalPosts = await Post.countDocuments({ 
    author: userId, 
    isArchived: false 
  });

  res.status(200).json({
    status: 'success',
    data: {
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrevious: page > 1
      }
    }
  });
});

// Get user's reels
export const getUserReels = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;

  // Find target user
  const targetUser = await User.findById(userId);
  if (!targetUser || !targetUser.isActive) {
    return next(new AppError('User not found', 404));
  }

  // Check if current user can view reels
  const canViewReels = 
    currentUserId === userId || // Own reels
    !targetUser.profile.isPrivate || // Public account
    (currentUserId && targetUser.followers.includes(currentUserId as any)); // Following private account

  if (!canViewReels) {
    return res.status(200).json({
      status: 'success',
      message: 'This account is private',
      data: {
        reels: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalReels: 0,
          hasNext: false,
          hasPrevious: false
        }
      }
    });
  }

  // Get reels
  const reels = await Reel.find({ 
    author: userId, 
    isArchived: false 
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('author', 'username profile.avatar profile.fullName profile.isVerified')
  .select('-comments'); // Exclude comments for better performance

  const totalReels = await Reel.countDocuments({ 
    author: userId, 
    isArchived: false 
  });

  res.status(200).json({
    status: 'success',
    data: {
      reels,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReels / limit),
        totalReels,
        hasNext: page * limit < totalReels,
        hasPrevious: page > 1
      }
    }
  });
});

// Search users
export const searchUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.query;
  const currentUserId = req.user?._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  if (!query || typeof query !== 'string') {
    return next(new AppError('Search query is required', 400));
  }

  if (query.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  // Search users by username and full name
  const users = await User.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { 'profile.fullName': { $regex: query, $options: 'i' } }
        ]
      }
    ]
  })
  .sort({ 'stats.followersCount': -1, username: 1 }) // Sort by followers then alphabetically
  .skip(skip)
  .limit(limit)
  .select('username profile.fullName profile.avatar profile.isVerified profile.isPrivate stats.followersCount');

  // Add following status if user is authenticated
  const usersWithFollowStatus = await Promise.all(
    users.map(async (user) => {
      let isFollowing = false;
      
      if (currentUserId && currentUserId !== user._id.toString()) {
        const currentUser = await User.findById(currentUserId);
        isFollowing = currentUser?.following.includes(user._id) || false;
      }

      return {
        ...user.toObject(),
        isFollowing
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      users: usersWithFollowStatus,
      pagination: {
        currentPage: page,
        hasNext: users.length === limit,
        query
      }
    }
  });
});

// Get suggested users to follow
export const getSuggestedUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?._id;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!currentUserId) {
    return next(new AppError('User not authenticated', 401));
  }

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return next(new AppError('User not found', 404));
  }

  // Get users that current user is not following
  const suggestedUsers = await User.find({
    $and: [
      { _id: { $ne: currentUserId } }, // Not the current user
      { _id: { $nin: currentUser.following } }, // Not already following
      { _id: { $nin: currentUser.blockedUsers } }, // Not blocked
      { isActive: true } // Active accounts only
    ]
  })
  .sort({ 'stats.followersCount': -1 }) // Sort by popularity
  .limit(limit)
  .select('username profile.fullName profile.avatar profile.isVerified stats.followersCount');

  res.status(200).json({
    status: 'success',
    data: {
      users: suggestedUsers
    }
  });
});

// Block/Unblock user
export const toggleBlock = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user?._id;

  if (!currentUserId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (currentUserId === targetUserId) {
    return next(new AppError('You cannot block yourself', 400));
  }

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return next(new AppError('User not found', 404));
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser || !targetUser.isActive) {
    return next(new AppError('Target user not found', 404));
  }

  const isBlocked = currentUser.blockedUsers.includes(targetUserId as any);

  if (isBlocked) {
    // Unblock user
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      (id: any) => id.toString() !== targetUserId
    );
    await currentUser.save();

    res.status(200).json({
      status: 'success',
      message: 'User unblocked successfully',
      data: { isBlocked: false }
    });
  } else {
    // Block user and remove from followers/following
    currentUser.blockedUsers.push(targetUserId as any);
    
    // Remove from following/followers
    currentUser.following = currentUser.following.filter(
      (id: any) => id.toString() !== targetUserId
    );
    targetUser.followers = targetUser.followers.filter(
      (id: any) => id.toString() !== currentUserId
    );
    targetUser.following = targetUser.following.filter(
      (id: any) => id.toString() !== currentUserId
    );
    currentUser.followers = currentUser.followers.filter(
      (id: any) => id.toString() !== targetUserId
    );

    // Update stats
    currentUser.stats.followingCount = currentUser.following.length;
    currentUser.stats.followersCount = currentUser.followers.length;
    targetUser.stats.followersCount = targetUser.followers.length;
    targetUser.stats.followingCount = targetUser.following.length;

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.status(200).json({
      status: 'success',
      message: 'User blocked successfully',
      data: { isBlocked: true }
    });
  }
});