import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Middleware to check if user has completed their profile
 * Requires user to have fullName and bio to be considered "complete"
 */
export const requireProfileCompletion = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return next(new AppError('User not authenticated', 401));
  }

  // Check if profile is complete
  const completionStatus = checkProfileCompletionStatus(user);
  
  if (!completionStatus.isComplete) {
    const fieldsText = completionStatus.missingFields.map(field => {
      switch(field) {
        case 'fullName': return 'full name';
        case 'bio': return 'bio';
        default: return field;
      }
    }).join(' and ');
    
    return next(new AppError(`Please complete your profile before using this feature. Add your ${fieldsText} to continue.`, 403));
  }

  next();
};

/**
 * Check if user profile is complete (for status endpoints)
 */
export const checkProfileCompletionStatus = (user: any): { isComplete: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!user.profile?.fullName || user.profile.fullName.trim().length === 0) {
    missingFields.push('fullName');
  }

  if (!user.profile?.bio || user.profile.bio.trim().length === 0) {
    missingFields.push('bio');
  }
  
  // Optional: You can add avatar requirement if needed
  // if (!user.profile?.avatar) {
  //   missingFields.push('avatar');
  // }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};