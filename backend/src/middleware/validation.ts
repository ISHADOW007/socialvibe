import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from './errorHandler';

// Middleware to handle validation errors from express-validator
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for better readability
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    // Create error message
    const errorMessages = formattedErrors.map(error => 
      `${error.field}: ${error.message}`
    ).join(', ');

    return next(new AppError(`Validation failed: ${errorMessages}`, 400));
  }

  next();
};

// Custom validation functions
export const validateObjectId = (id: string): boolean => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9._]{3,30}$/;
  return usernameRegex.test(username);
};

export const validatePassword = (password: string): boolean => {
  return Boolean(password && password.length >= 6);
};

export const validateHashtag = (hashtag: string): boolean => {
  const hashtagRegex = /^[a-zA-Z0-9_]+$/;
  return hashtagRegex.test(hashtag);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// File upload validation
export const validateImageFile = (mimetype: string): boolean => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return allowedImageTypes.includes(mimetype);
};

export const validateVideoFile = (mimetype: string): boolean => {
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  return allowedVideoTypes.includes(mimetype);
};

export const validateFileSize = (size: number, maxSizeInBytes: number): boolean => {
  return size <= maxSizeInBytes;
};

// Media validation
export const validateMediaType = (mediaType: string): boolean => {
  const allowedTypes = ['image', 'video'];
  return allowedTypes.includes(mediaType);
};

// Caption and text validation
export const validateCaption = (caption: string): boolean => {
  return caption.length <= 2200;
};

export const validateComment = (comment: string): boolean => {
  return comment.trim().length > 0 && comment.length <= 1000;
};

export const validateBio = (bio: string): boolean => {
  return bio.length <= 500;
};

// Date validation
export const validateDateOfBirth = (date: Date): boolean => {
  const now = new Date();
  const minAge = 13; // Minimum age requirement
  const maxAge = 120; // Maximum reasonable age
  
  const age = now.getFullYear() - date.getFullYear();
  
  return age >= minAge && age <= maxAge;
};

// Location validation
export const validateCoordinates = (coordinates: [number, number]): boolean => {
  const [longitude, latitude] = coordinates;
  
  // Longitude must be between -180 and 180
  // Latitude must be between -90 and 90
  return (
    longitude >= -180 && longitude <= 180 &&
    latitude >= -90 && latitude <= 90
  );
};

// Video duration validation (for reels)
export const validateReelDuration = (duration: number): boolean => {
  return duration > 0 && duration <= 60; // Max 60 seconds for reels
};

// Story validation
export const validateStoryDuration = (duration: number): boolean => {
  return duration > 0 && duration <= 15; // Max 15 seconds for stories
};