import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface for Message Media
export interface IMessageMedia {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnail?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

// Interface for Message statics
export interface IMessageModel extends mongoose.Model<IMessage> {
  // Add any static methods here if needed
}

// Interface for Conversation statics
export interface IConversationModel extends mongoose.Model<IConversation> {
  findUserConversations(userId: string): mongoose.Query<IConversation[], IConversation>;
  findDirectConversation(user1Id: string, user2Id: string): mongoose.Query<IConversation | null, IConversation>;
}

// Interface for Message document
export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content?: string;
  media?: IMessageMedia;
  replyTo?: Types.ObjectId; // Reference to another message
  messageType: 'text' | 'media' | 'system';
  readBy: Array<{
    user: Types.ObjectId;
    readAt: Date;
  }>;
  reactions: Array<{
    user: Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedFor: Types.ObjectId[]; // Users for whom this message is deleted
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addReaction(userId: string, emoji: string): void;
}

// Interface for Conversation document
export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  conversationType: 'direct' | 'group';
  groupInfo?: {
    name: string;
    description?: string;
    avatar?: string;
    admins: Types.ObjectId[];
    createdBy: Types.ObjectId;
  };
  lastMessage?: Types.ObjectId;
  lastActivity: Date;
  isArchived: boolean;
  mutedBy: Array<{
    user: Types.ObjectId;
    mutedUntil?: Date;
  }>;
  pinnedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Message media schema
const messageMediaSchema = new Schema<IMessageMedia>({
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'file'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  name: {
    type: String
  },
  size: {
    type: Number
  },
  mimeType: {
    type: String
  }
}, {
  versionKey: false
});

// Read receipt schema
const readReceiptSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

// Message reaction schema
const reactionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true,
    match: /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/u
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

// Message schema
const messageSchema = new Schema<IMessage>({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: [true, 'Message must belong to a conversation']
  },
  
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender']
  },
  
  content: {
    type: String,
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  
  media: messageMediaSchema,
  
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  messageType: {
    type: String,
    enum: ['text', 'media', 'system'],
    default: 'text'
  },
  
  readBy: [readReceiptSchema],
  
  reactions: [reactionSchema],
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: {
    type: Date
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  },
  
  deletedFor: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]

}, {
  timestamps: true,
  versionKey: false
});

// Group info schema for conversations
const groupInfoSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Group description cannot exceed 500 characters']
  },
  avatar: {
    type: String
  },
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  versionKey: false
});

// Muted conversation schema
const mutedSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mutedUntil: {
    type: Date
  }
}, {
  versionKey: false
});

// Conversation schema
const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  conversationType: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  
  groupInfo: groupInfoSchema,
  
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  mutedBy: [mutedSchema],
  
  pinnedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]

}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ isDeleted: 1 });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ isArchived: 1 });

// Validation for message content
messageSchema.pre('validate', function(next) {
  if (!this.content && !this.media) {
    next(new Error('Message must have either content or media'));
  }
  
  if (this.messageType === 'media' && !this.media) {
    next(new Error('Media message must include media'));
  }
  
  next();
});

// Update conversation's lastActivity on message save
messageSchema.post('save', async function() {
  try {
    await mongoose.model('Conversation').findByIdAndUpdate(
      this.conversation,
      { 
        lastMessage: this._id,
        lastActivity: new Date() 
      }
    );
  } catch (error) {
    console.error('Error updating conversation lastActivity:', error);
  }
});

// Virtual for checking if message is read by all participants
messageSchema.virtual('isReadByAll').get(function() {
  // This would need to be calculated based on conversation participants
  // Implementation would be in the controller
  return false;
});

// Instance methods for messages
messageSchema.methods.isReadByUser = function(userId: string): boolean {
  return this.readBy.some((read: any) => read.user.toString() === userId.toString());
};

messageSchema.methods.addReaction = function(userId: string, emoji: string): void {
  // Remove existing reaction from this user first
  this.reactions = this.reactions.filter((reaction: any) => 
    reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: new Types.ObjectId(userId),
    emoji,
    createdAt: new Date()
  });
};

// Static methods for conversations
conversationSchema.statics.findDirectConversation = function(user1Id: string, user2Id: string) {
  return this.findOne({
    conversationType: 'direct',
    participants: { $all: [user1Id, user2Id], $size: 2 }
  });
};

conversationSchema.statics.findUserConversations = function(userId: string) {
  return this.find({
    participants: userId,
    isArchived: false
  })
  .populate('participants', 'username profile.avatar profile.fullName')
  .populate('lastMessage')
  .sort({ lastActivity: -1 });
};

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

// Create and export the models
const Message = mongoose.model<IMessage, IMessageModel>('Message', messageSchema);
const Conversation = mongoose.model<IConversation, IConversationModel>('Conversation', conversationSchema);

export { Message, Conversation };
export default { Message, Conversation };