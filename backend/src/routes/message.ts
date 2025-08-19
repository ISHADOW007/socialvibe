import express from 'express';
import { protect } from '../middleware/auth';
import { uploadSingleImage, uploadSingleVideo, handleMulterError } from '../middleware/upload';
import {
  getConversations,
  getOrCreateDirectConversation,
  getConversationMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessagesAsRead,
  searchMessages
} from '../controllers/messageController';
import multer from 'multer';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// Upload for messages (images/videos)
const uploadMessageMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB for messages
  }
}).single('media');

// Conversation routes
router.get('/conversations', getConversations);
router.get('/conversations/direct/:userId', getOrCreateDirectConversation);

// Message routes
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.post('/conversations/:conversationId/messages', uploadMessageMedia, handleMulterError, sendMessage);
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);

// Message interactions
router.post('/messages/:messageId/reactions', addReaction);
router.delete('/messages/:messageId/reactions', removeReaction);
router.post('/conversations/:conversationId/read', markMessagesAsRead);

// Search messages
router.get('/conversations/:conversationId/search', searchMessages);

export default router;