import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface for Reel Comment
export interface IReelComment {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  likes: Types.ObjectId[];
  replies: IReelReply[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Reel Reply
export interface IReelReply {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  likes: Types.ObjectId[];
  createdAt: Date;
}

// Interface for Reel statics
export interface IReelModel extends mongoose.Model<IReel> {
  findByHashtag(hashtag: string): mongoose.Query<IReel[], IReel>;
  findByAuthor(authorId: string): mongoose.Query<IReel[], IReel>;
  findTrending(limit?: number): mongoose.Query<IReel[], IReel>;
  findByMusic(musicName: string): mongoose.Query<IReel[], IReel>;
}

// Interface for Reel document
export interface IReel extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  music?: {
    name: string;
    artist: string;
    url?: string;
    duration?: number;
  };
  hashtags: string[];
  mentions: Types.ObjectId[];
  likes: Types.ObjectId[];
  comments: IReelComment[];
  shares: Types.ObjectId[];
  saves: Types.ObjectId[];
  stats: {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    savesCount: number;
    viewsCount: number;
  };
  videoDetails: {
    duration: number; // in seconds
    width: number;
    height: number;
    size: number; // file size in bytes
    format: string;
  };
  location?: {
    name: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  isArchived: boolean;
  commentsDisabled: boolean;
  allowDuet: boolean;
  allowRemix: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Reply schema for reels
const reelReplySchema = new Schema<IReelReply>({
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

// Comment schema for reels
const reelCommentSchema = new Schema<IReelComment>({
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
  replies: [reelReplySchema]
}, {
  timestamps: true,
  versionKey: false
});

// Music schema
const musicSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String
  },
  duration: {
    type: Number // Duration in seconds
  }
}, {
  versionKey: false
});

// Video details schema
const videoDetailsSchema = new Schema({
  duration: {
    type: Number,
    required: [true, 'Video duration is required'],
    min: [1, 'Video must be at least 1 second'],
    max: [60, 'Reel cannot exceed 60 seconds']
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  format: {
    type: String,
    required: true,
    enum: ['mp4', 'mov', 'avi', 'webm']
  }
}, {
  versionKey: false
});

// Reel schema
const reelSchema = new Schema<IReel>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reel author is required']
  },
  
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  
  thumbnailUrl: {
    type: String
  },
  
  caption: {
    type: String,
    trim: true,
    maxlength: [2200, 'Caption cannot exceed 2200 characters']
  },
  
  music: musicSchema,
  
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
  
  comments: [reelCommentSchema],
  
  shares: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  saves: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
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
    savesCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    }
  },
  
  videoDetails: {
    type: videoDetailsSchema,
    required: true
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
  
  allowDuet: {
    type: Boolean,
    default: true
  },
  
  allowRemix: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ mentions: 1 });
reelSchema.index({ createdAt: -1 });
reelSchema.index({ 'stats.likesCount': -1 });
reelSchema.index({ 'stats.viewsCount': -1 });
reelSchema.index({ isArchived: 1 });
reelSchema.index({ 'music.name': 1 });

// Pre-save middleware to update stats
reelSchema.pre('save', function(next) {
  // Update likes count
  this.stats.likesCount = this.likes.length;
  
  // Update comments count (including replies)
  this.stats.commentsCount = this.comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);
  
  // Update shares count
  this.stats.sharesCount = this.shares.length;
  
  // Update saves count
  this.stats.savesCount = this.saves.length;
  
  next();
});

// Virtual for formatted creation date
reelSchema.virtual('timeAgo').get(function() {
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

// Virtual for aspect ratio
reelSchema.virtual('aspectRatio').get(function() {
  const { width, height } = this.videoDetails;
  return width / height;
});

// Static methods
reelSchema.statics.findByHashtag = function(hashtag: string) {
  return this.find({ 
    hashtags: hashtag.toLowerCase(),
    isArchived: false 
  }).sort({ createdAt: -1 });
};

reelSchema.statics.findByAuthor = function(authorId: string) {
  return this.find({ 
    author: authorId,
    isArchived: false 
  }).sort({ createdAt: -1 });
};

reelSchema.statics.findTrending = function(limit: number = 20) {
  return this.find({ 
    isArchived: false 
  })
  .sort({ 
    'stats.viewsCount': -1,
    'stats.likesCount': -1,
    createdAt: -1 
  })
  .limit(limit);
};

reelSchema.statics.findByMusic = function(musicName: string) {
  return this.find({
    'music.name': new RegExp(musicName, 'i'),
    isArchived: false
  }).sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
reelSchema.set('toJSON', { virtuals: true });
reelSchema.set('toObject', { virtuals: true });

// Create and export the model
const Reel = mongoose.model<IReel, IReelModel>('Reel', reelSchema);

export default Reel;