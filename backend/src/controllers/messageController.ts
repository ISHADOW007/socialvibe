import { Request, Response, NextFunction } from 'express';
import { Message, Conversation } from '../models/Message';
import User from '../models/User';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { uploadImage, uploadVideo } from '../utils/cloudinary';
import { emitToUser, emitToUsers } from '../socket/socketHandler';
import mongoose from 'mongoose';

// Get user's conversations
export const getConversations = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const conversations = await Conversation.findUserConversations(userId)
    .skip(skip)
    .limit(limit);

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const totalConversations = await Conversation.countDocuments({
    participants: userObjectId,
    isArchived: false
  });

  const totalPages = Math.ceil(totalConversations / limit);

  res.json({
    status: 'success',
    data: {
      conversations,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalConversations,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Get or create direct conversation
export const getOrCreateDirectConversation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId: otherUserId } = req.params;
  const currentUserId = req.user?._id;

  if (!currentUserId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (otherUserId === currentUserId) {
    return next(new AppError('Cannot create conversation with yourself', 400));
  }

  // Check if other user exists
  const otherUser = await User.findById(otherUserId);
  if (!otherUser || !otherUser.isActive) {
    return next(new AppError('User not found', 404));
  }

  // Find existing conversation
  let conversation = await Conversation.findDirectConversation(currentUserId, otherUserId);

  if (!conversation) {
    // Create new conversation
    conversation = new Conversation({
      participants: [currentUserId, otherUserId],
      conversationType: 'direct',
      lastActivity: new Date()
    });
    await conversation.save();
  }

  // Populate participants
  await conversation.populate('participants', 'username profile.avatar profile.fullName profile.isVerified');
  await conversation.populate('lastMessage');

  res.json({
    status: 'success',
    data: {
      conversation
    }
  });
});

// Get conversation messages
export const getConversationMessages = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { conversationId } = req.params;
  const userId = req.user?._id;
  
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  // Verify user is part of conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (!conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied to this conversation', 403));
  }

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: userObjectId } // Exclude messages deleted for this user
  })
    .populate('sender', 'username profile.avatar profile.fullName profile.isVerified')
    .populate('replyTo', 'content sender')
    .populate('reactions.user', 'username profile.avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalMessages = await Message.countDocuments({
    conversation: conversationId,
    deletedFor: { $ne: userObjectId }
  });

  const totalPages = Math.ceil(totalMessages / limit);

  // Mark messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId }
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );

  res.json({
    status: 'success',
    data: {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalMessages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});

// Send message
export const sendMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { conversationId } = req.params;
  const { content, replyToMessageId } = req.body;
  const userId = req.user?._id;
  const file = req.file;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Validate input
  if (!content && !file) {
    return next(new AppError('Message must have content or media', 400));
  }

  // Verify conversation exists and user is participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (!conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied to this conversation', 403));
  }

  try {
    let media = undefined;
    
    if (file) {
      const isVideo = file.mimetype.startsWith('video/');
      const uploadFunction = isVideo ? uploadVideo : uploadImage;
      
      const result = await uploadFunction(file.buffer, {
        folder: 'socialvibe/messages',
        resource_type: isVideo ? 'video' : 'image'
      });

      media = {
        type: isVideo ? 'video' as const : 'image' as const,
        url: result.secure_url,
        thumbnail: isVideo ? result.eager?.[0]?.secure_url : undefined,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    }

    // Validate reply message if provided
    let replyTo = undefined;
    if (replyToMessageId) {
      const originalMessage = await Message.findOne({
        _id: replyToMessageId,
        conversation: conversationId
      });
      
      if (originalMessage) {
        replyTo = replyToMessageId;
      }
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: userObjectId,
      content: content?.trim(),
      media,
      replyTo,
      messageType: media ? 'media' : 'text',
      readBy: [{
        user: userObjectId,
        readAt: new Date()
      }]
    });

    await message.save();

    // Populate message
    await message.populate('sender', 'username profile.avatar profile.fullName profile.isVerified');
    await message.populate('replyTo', 'content sender');

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Get other participants for real-time updates
    const otherParticipants = conversation.participants
      .filter(p => p.toString() !== userId)
      .map(p => p.toString());

    // Emit real-time message to other participants
    emitToUsers(otherParticipants, 'new_message', {
      messageId: message._id,
      conversationId: conversation._id,
      message,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    next(new AppError('Failed to send message', 500));
  }
});

// Edit message
export const editMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!content || content.trim().length === 0) {
    return next(new AppError('Message content is required', 400));
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  if (message.sender.toString() !== userId) {
    return next(new AppError('You can only edit your own messages', 403));
  }

  // Check if message is too old to edit (e.g., 15 minutes)
  const editTimeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
  if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
    return next(new AppError('Message is too old to edit', 403));
  }

  message.content = content.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  // Emit real-time update
  const conversation = await Conversation.findById(message.conversation);
  if (conversation) {
    const otherParticipants = conversation.participants
      .filter(p => p.toString() !== userId.toString())
      .map(p => p.toString());

    emitToUsers(otherParticipants, 'message_edited', {
      messageId: message._id,
      conversationId: conversation._id,
      newContent: content.trim(),
      editedAt: message.editedAt,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    status: 'success',
    message: 'Message edited successfully',
    data: {
      message
    }
  });
});

// Delete message
export const deleteMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const { deleteFor = 'me' } = req.body; // 'me' or 'everyone'
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const conversation = await Conversation.findById(message.conversation);
  if (!conversation || !conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied', 403));
  }

  if (deleteFor === 'everyone') {
    // Only sender can delete for everyone
    if (message.sender.toString() !== userId) {
      return next(new AppError('You can only delete your own messages for everyone', 403));
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.media = undefined;
    await message.save();

    // Emit real-time update to all participants
    const allParticipants = conversation.participants.map(p => p.toString());
    emitToUsers(allParticipants, 'message_deleted', {
      messageId: message._id,
      conversationId: conversation._id,
      deletedFor: 'everyone',
      timestamp: new Date().toISOString()
    });
  } else {
    // Delete for current user only
    if (!message.deletedFor.includes(userObjectId)) {
      message.deletedFor.push(userObjectId);
      await message.save();
    }
  }

  res.json({
    status: 'success',
    message: `Message deleted ${deleteFor === 'everyone' ? 'for everyone' : 'for you'}`
  });
});

// Add reaction to message
export const addReaction = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!emoji) {
    return next(new AppError('Emoji is required', 400));
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const conversation = await Conversation.findById(message.conversation);
  if (!conversation || !conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied', 403));
  }

  message.addReaction(userId, emoji);
  await message.save();

  // Emit real-time update
  const otherParticipants = conversation.participants
    .filter(p => p.toString() !== userId)
    .map(p => p.toString());

  emitToUsers(otherParticipants, 'message_reaction_added', {
    messageId: message._id,
    conversationId: conversation._id,
    reaction: {
      user: {
        userId: userId,
        username: req.user?.username,
        avatar: req.user?.profile?.avatar
      },
      emoji,
      createdAt: new Date()
    },
    timestamp: new Date().toISOString()
  });

  res.json({
    status: 'success',
    message: 'Reaction added successfully'
  });
});

// Remove reaction from message
export const removeReaction = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const conversation = await Conversation.findById(message.conversation);
  if (!conversation || !conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied', 403));
  }

  // Remove user's reaction
  message.reactions = message.reactions.filter(
    reaction => reaction.user.toString() !== userId
  );
  await message.save();

  // Emit real-time update
  const otherParticipants = conversation.participants
    .filter(p => p.toString() !== userId)
    .map(p => p.toString());

  emitToUsers(otherParticipants, 'message_reaction_removed', {
    messageId: message._id,
    conversationId: conversation._id,
    userId: userId,
    timestamp: new Date().toISOString()
  });

  res.json({
    status: 'success',
    message: 'Reaction removed successfully'
  });
});

// Mark messages as read
export const markMessagesAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { conversationId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Verify user is part of conversation
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied', 403));
  }

  // Mark unread messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userObjectId },
      'readBy.user': { $ne: userObjectId }
    },
    {
      $push: {
        readBy: {
          user: userObjectId,
          readAt: new Date()
        }
      }
    }
  );

  // Emit read receipt to other participants
  const otherParticipants = conversation.participants
    .filter(p => p.toString() !== userId)
    .map(p => p.toString());

  emitToUsers(otherParticipants, 'messages_read', {
    conversationId: conversation._id,
    readBy: {
      userId: userId,
      username: req.user?.username,
      readAt: new Date()
    },
    timestamp: new Date().toISOString()
  });

  res.json({
    status: 'success',
    message: 'Messages marked as read'
  });
});

// Search messages
export const searchMessages = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { conversationId } = req.params;
  const { query } = req.query;
  const userId = req.user?._id;
  
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  if (!query || typeof query !== 'string') {
    return next(new AppError('Search query is required', 400));
  }

  // Verify user is part of conversation
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.includes(userObjectId)) {
    return next(new AppError('Access denied', 403));
  }

  const messages = await Message.find({
    conversation: conversationId,
    content: { $regex: query, $options: 'i' },
    deletedFor: { $ne: userObjectId },
    isDeleted: false
  })
    .populate('sender', 'username profile.avatar profile.fullName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalResults = await Message.countDocuments({
    conversation: conversationId,
    content: { $regex: query, $options: 'i' },
    deletedFor: { $ne: userId },
    isDeleted: false
  });

  const totalPages = Math.ceil(totalResults / limit);

  res.json({
    status: 'success',
    data: {
      messages,
      query,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalResults,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        limit
      }
    }
  });
});