import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import User from '../models/User';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        username: string;
        email: string;
        profile?: {
          fullName?: string;
          bio?: string;
          avatar?: string;
          coverPhoto?: string;
          dateOfBirth?: Date;
          website?: string;
          location?: string;
          isVerified: boolean;
          isPrivate: boolean;
        };
        avatar?: string;
        isVerified?: boolean;
      };
    }
  }
}

// Protect middleware - requires valid JWT token
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Get token from header
    let token: string | undefined;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Token expired') {
          return next(new AppError('Your token has expired! Please log in again.', 401));
        }
        if (error.message === 'Invalid token') {
          return next(new AppError('Invalid token! Please log in again.', 401));
        }
      }
      return next(new AppError('Token verification failed', 401));
    }

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // 4) Check if user changed password after token was issued (optional feature)
    // if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
    //   return next(new AppError('User recently changed password! Please log in again.', 401));
    // }

    // 5) Grant access to protected route
    req.user = {
      _id: currentUser._id.toString(),
      username: currentUser.username,
      email: currentUser.email,
      profile: currentUser.profile,
      avatar: currentUser.profile?.avatar,
      isVerified: currentUser.profile?.isVerified
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication - doesn't require token but adds user if token is valid
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const currentUser = await User.findById(decoded.userId).select('-password -refreshToken');
        
        if (currentUser) {
          req.user = {
            _id: currentUser._id.toString(),
            username: currentUser.username,
            email: currentUser.email,
            profile: currentUser.profile,
            avatar: currentUser.profile?.avatar,
            isVerified: currentUser.profile?.isVerified
          };
        }
      } catch (error) {
        // Silently fail for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Restrict to specific roles (if needed in future)
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // For now, we'll implement a basic version
    // This can be expanded when we add role-based access control
    
    if (!req.user) {
      return next(new AppError('You are not logged in!', 401));
    }

    // Basic implementation - all authenticated users have access
    // In the future, check user.role against roles array
    next();
  };
};

// Check if user owns the resource
export const checkResourceOwnership = (resourceField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('You are not authenticated!', 401));
      }

      // This will be implemented specifically for each resource type
      // For now, pass through - actual ownership checks will be in controllers
      next();
    } catch (error) {
      next(error);
    }
  };
};