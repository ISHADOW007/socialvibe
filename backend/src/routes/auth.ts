import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updatePassword,
  deleteAccount
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username can only contain letters, numbers, dots, and underscores')
    .toLowerCase(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Full name cannot exceed 50 characters')
    .trim()
];

const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

const deleteAccountValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
];

// Public routes (with rate limiting for auth endpoints)
router.post('/register', authRateLimiter, registerValidation, validateRequest, register);
router.post('/login', authRateLimiter, loginValidation, validateRequest, login);
router.post('/refresh-token', authRateLimiter, refreshTokenValidation, validateRequest, refreshToken);

// Protected routes (require authentication)
router.use(protect); // All routes below this middleware require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/password', updatePasswordValidation, validateRequest, updatePassword);
router.delete('/account', deleteAccountValidation, validateRequest, deleteAccount);

export default router;