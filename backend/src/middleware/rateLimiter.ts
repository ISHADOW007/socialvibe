import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window

// Clean up expired entries
const cleanup = () => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
};

// Rate limiter middleware
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const clientId = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to run cleanup
    cleanup();
  }

  // Check if client exists in store
  if (!store[clientId]) {
    store[clientId] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
    return next();
  }

  const clientData = store[clientId];

  // Reset if window has expired
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }

  // Increment count
  clientData.count++;

  // Check if limit exceeded
  if (clientData.count > MAX_REQUESTS) {
    const resetTimeSeconds = Math.ceil((clientData.resetTime - now) / 1000);
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: resetTimeSeconds
    });
    return;
  }

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': (MAX_REQUESTS - clientData.count).toString(),
    'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString()
  });

  next();
};

// Stricter rate limiter for auth endpoints
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  const clientId = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `auth:${clientId}`;
  
  const AUTH_WINDOW = 15 * 60 * 1000; // 15 minutes
  const AUTH_MAX_REQUESTS = 10; // Max auth requests per window

  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + AUTH_WINDOW
    };
    return next();
  }

  const clientData = store[key];

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + AUTH_WINDOW;
    return next();
  }

  clientData.count++;

  if (clientData.count > AUTH_MAX_REQUESTS) {
    const resetTimeSeconds = Math.ceil((clientData.resetTime - now) / 1000);
    
    res.status(429).json({
      error: 'Too Many Authentication Requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: resetTimeSeconds
    });
    return;
  }

  next();
};