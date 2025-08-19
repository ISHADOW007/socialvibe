import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { setUserSession, deleteUserSession } from '../utils/redis';
import { checkProfileCompletionStatus } from '../middleware/profileComplete';

// Register new user
export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password, fullName } = req.body;

  // Input validation
  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  });

  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      return next(new AppError('Email is already registered', 409));
    }
    if (existingUser.username === username.toLowerCase()) {
      return next(new AppError('Username is already taken', 409));
    }
  }

  // Create new user
  const newUser = new User({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    profile: {
      fullName: fullName || '',
      isVerified: false,
      isPrivate: false
    }
  });

  await newUser.save();

  // Generate tokens
  const tokenPayload = {
    userId: newUser._id.toString(),
    email: newUser.email,
    username: newUser.username
  };

  const tokens = generateTokenPair(tokenPayload);

  // Save refresh token to user document
  newUser.refreshToken = tokens.refreshToken;
  await newUser.save();

  // Cache user session
  await setUserSession(newUser._id.toString(), {
    username: newUser.username,
    email: newUser.email,
    avatar: newUser.profile?.avatar
  });

  // Check profile completion status
  const completionStatus = checkProfileCompletionStatus(newUser);

  // Remove password from response
  const userResponse = {
    _id: newUser._id,
    username: newUser.username,
    email: newUser.email,
    profile: newUser.profile,
    stats: newUser.stats,
    createdAt: newUser.createdAt,
    profileComplete: completionStatus.isComplete,
    missingFields: completionStatus.missingFields
  };

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: userResponse,
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    }
  });
});

// Login user
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { identifier, password } = req.body; // identifier can be username or email

  // Input validation
  if (!identifier || !password) {
    return next(new AppError('Please provide username/email and password', 400));
  }

  // Find user by username or email
  const user = await User.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  }).select('+password +refreshToken');

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new AppError('Account has been deactivated', 401));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Generate new tokens
  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    username: user.username
  };

  const tokens = generateTokenPair(tokenPayload);

  // Update refresh token
  user.refreshToken = tokens.refreshToken;
  user.lastSeen = new Date();
  await user.save();

  // Cache user session
  await setUserSession(user._id.toString(), {
    username: user.username,
    email: user.email,
    avatar: user.profile?.avatar
  });

  // Check profile completion status
  const completionStatus = checkProfileCompletionStatus(user);

  // Prepare user response
  const userResponse = {
    _id: user._id,
    username: user.username,
    email: user.email,
    profile: user.profile,
    stats: user.stats,
    lastSeen: user.lastSeen,
    profileComplete: completionStatus.isComplete,
    missingFields: completionStatus.missingFields
  };

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: userResponse,
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    }
  });
});

// Logout user
export const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Clear refresh token from database
  await User.findByIdAndUpdate(userId, {
    $unset: { refreshToken: 1 },
    lastSeen: new Date()
  });

  // Delete user session from Redis
  await deleteUserSession(userId);

  res.status(200).json({
    status: 'success',
    message: 'Logout successful'
  });
});

// Refresh access token
export const refreshToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  // Find user and verify refresh token matches
  const user = await User.findById(decoded.userId).select('+refreshToken');
  
  if (!user || user.refreshToken !== refreshToken) {
    return next(new AppError('Invalid refresh token', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Account has been deactivated', 401));
  }

  // Generate new tokens
  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    username: user.username
  };

  const tokens = generateTokenPair(tokenPayload);

  // Update refresh token in database
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: {
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    }
  });
});

// Get current user profile
export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const user = await User.findById(userId)
    .populate('followers', 'username profile.avatar profile.fullName')
    .populate('following', 'username profile.avatar profile.fullName');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check profile completion status
  const completionStatus = checkProfileCompletionStatus(user);

  // Add profile completion info to user object
  const userWithCompletion = {
    ...user.toObject(),
    profileComplete: completionStatus.isComplete,
    missingFields: completionStatus.missingFields
  };

  res.status(200).json({
    status: 'success',
    data: {
      user: userWithCompletion
    }
  });
});

// Update password
export const updatePassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current password and new password', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters long', 400));
  }

  // Find user with current password
  const user = await User.findById(userId).select('+password');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully'
  });
});

// Delete account (soft delete)
export const deleteAccount = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!password) {
    return next(new AppError('Please provide your password to delete account', 400));
  }

  // Find user with password
  const user = await User.findById(userId).select('+password');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Incorrect password', 401));
  }

  // Soft delete - deactivate account
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`; // Make email unique
  user.username = `deleted_${Date.now()}_${user.username}`; // Make username unique
  await user.save();

  // Delete user session
  await deleteUserSession(userId);

  res.status(200).json({
    status: 'success',
    message: 'Account deleted successfully'
  });
});