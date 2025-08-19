import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface for Comment subdocument
export interface IComment {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  likes: Types.ObjectId[];
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Reply subdocument
export interface IReply {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  likes: Types.ObjectId[];
  createdAt: Date;
}

// Interface for Media subdocument
export interface IMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number; // for videos
  size?: number;
}

// Interface for Post statics
export interface IPostModel extends mongoose.Model<IPost> {
  findByHashtag(hashtag: string): mongoose.Query<IPost[], IPost>;
  findByAuthor(authorId: string): mongoose.Query<IPost[], IPost>;
  findLikedByUser(userId: string): mongoose.Query<IPost[], IPost>;
}

// Interface for Post document
export interface IPost extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  caption?: string;
  media: IMedia[];
  hashtags: string[];
  mentions: Types.ObjectId[];
  likes: Types.ObjectId[];
  comments: IComment[];
  stats: {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
  };
  location?: {
    name: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  isArchived: boolean;
  commentsDisabled: boolean;
  hideLikeCount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Reply schema
const replySchema = new Schema<IReply>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Reply text is required'],
    trim: true,
    maxlength: [500, 'Reply cannot exceed 500 characters']
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Comment schema
const commentSchema = new Schema<IComment>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [replySchema]
}, {
  timestamps: true,
  versionKey: false
});

// Media schema
const mediaSchema = new Schema<IMedia>({
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  url: {
    type: String,
    required: [true, 'Media URL is required']
  },
  thumbnail: {
    type: String // Thumbnail URL for videos
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  duration: {
    type: Number // Duration in seconds for videos
  },
  size: {
    type: Number // File size in bytes
  }
}, {
  versionKey: false
});

// Post schema
const postSchema = new Schema<IPost>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Post author is required']
  },
  
  caption: {
    type: String,
    trim: true,
    maxlength: [2200, 'Caption cannot exceed 2200 characters']
  },
  
  media: {
    type: [mediaSchema],
    validate: {
      validator: function(media: IMedia[]) {
        return media && media.length > 0 && media.length <= 10;
      },
      message: 'A post must have at least 1 and at most 10 media items'
    }
  },
  
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9_]+$/, 'Hashtags can only contain letters, numbers, and underscores']
  }],
  
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  comments: [commentSchema],
  
  stats: {
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    sharesCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    }
  },
  
  location: {
    name: {
      type: String,
      trim: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  commentsDisabled: {
    type: Boolean,
    default: false
  },
  
  hideLikeCount: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ mentions: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ 'stats.likesCount': -1 });
postSchema.index({ isArchived: 1 });

// Pre-save middleware to update stats
postSchema.pre('save', function(next) {
  // Update likes count
  this.stats.likesCount = this.likes.length;
  
  // Update comments count (including replies)
  this.stats.commentsCount = this.comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);
  
  next();
});

// Virtual for formatted creation date
postSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
});

// Static methods
postSchema.statics.findByHashtag = function(hashtag: string) {
  return this.find({ hashtags: hashtag.toLowerCase() }).sort({ createdAt: -1 });
};

postSchema.statics.findByAuthor = function(authorId: string) {
  return this.find({ author: authorId, isArchived: false }).sort({ createdAt: -1 });
};

postSchema.statics.findLikedByUser = function(userId: string) {
  return this.find({ likes: userId }).sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

// Create and export the model
const Post = mongoose.model<IPost, IPostModel>('Post', postSchema);

export default Post;