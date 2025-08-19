import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface for Story Viewer
export interface IStoryViewer {
  user: Types.ObjectId;
  viewedAt: Date;
}

// Interface for Story Media
export interface IStoryMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string; // For videos
  width?: number;
  height?: number;
  duration?: number; // For videos in seconds
}

// Interface for Story statics  
export interface IStoryModel extends mongoose.Model<IStory> {
  findActiveStories(): mongoose.Query<IStory[], IStory>;
  findUserStories(userId: string, includeExpired?: boolean): mongoose.Query<IStory[], IStory>;
  findHighlights(userId: string): mongoose.Query<IStory[], IStory>;
}

// Interface for Story document
export interface IStory extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  media: IStoryMedia;
  text?: {
    content: string;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    position: {
      x: number;
      y: number;
    };
  };
  stickers?: Array<{
    type: 'emoji' | 'gif' | 'mention' | 'hashtag' | 'location';
    content: string;
    position: {
      x: number;
      y: number;
    };
    size?: number;
  }>;
  music?: {
    name: string;
    artist: string;
    startTime?: number;
    duration?: number;
  };
  location?: {
    name: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  viewers: IStoryViewer[];
  stats: {
    viewsCount: number;
  };
  privacy: {
    hideFromUsers: Types.ObjectId[]; // Users who can't see this story
    allowedUsers?: Types.ObjectId[]; // Only these users can see (if set)
  };
  expiresAt: Date;
  isArchived: boolean;
  isHighlight: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isExpired: boolean;
  
  // Instance methods
  addViewer(userId: string): void;
}

// Story viewer schema
const storyViewerSchema = new Schema<IStoryViewer>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

// Story media schema
const storyMediaSchema = new Schema<IStoryMedia>({
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
    type: Number, // Duration in seconds for videos
    max: [15, 'Story video cannot exceed 15 seconds']
  }
}, {
  versionKey: false
});

// Story text schema
const storyTextSchema = new Schema({
  content: {
    type: String,
    required: true,
    maxlength: [500, 'Story text cannot exceed 500 characters']
  },
  fontSize: {
    type: Number,
    min: 12,
    max: 72,
    default: 24
  },
  color: {
    type: String,
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
    default: '#FFFFFF'
  },
  backgroundColor: {
    type: String,
    match: [/^#[0-9A-F]{6}$/i, 'Background color must be a valid hex color']
  },
  position: {
    x: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    y: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    }
  }
}, {
  versionKey: false
});

// Story sticker schema
const stickerSchema = new Schema({
  type: {
    type: String,
    enum: ['emoji', 'gif', 'mention', 'hashtag', 'location'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  position: {
    x: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    y: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    }
  },
  size: {
    type: Number,
    min: 10,
    max: 100,
    default: 50
  }
}, {
  versionKey: false
});

// Music schema for stories
const storyMusicSchema = new Schema({
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
  startTime: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    max: 15 // Max 15 seconds for story music
  }
}, {
  versionKey: false
});

// Story schema
const storySchema = new Schema<IStory>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Story author is required']
  },
  
  media: {
    type: storyMediaSchema,
    required: [true, 'Story media is required']
  },
  
  text: storyTextSchema,
  
  stickers: [stickerSchema],
  
  music: storyMusicSchema,
  
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
  
  viewers: [storyViewerSchema],
  
  stats: {
    viewsCount: {
      type: Number,
      default: 0
    }
  },
  
  privacy: {
    hideFromUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  isHighlight: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }); // TTL index for auto-deletion
storySchema.index({ isArchived: 1 });
storySchema.index({ isHighlight: 1 });
storySchema.index({ 'viewers.user': 1 });

// Pre-save middleware to update stats
storySchema.pre('save', function(next) {
  this.stats.viewsCount = this.viewers.length;
  next();
});

// Virtual for checking if story is expired
storySchema.virtual('isExpired').get(function() {
  return !this.isHighlight && new Date() > this.expiresAt;
});

// Virtual for time remaining until expiry
storySchema.virtual('timeRemaining').get(function() {
  if (this.isHighlight) return null;
  
  const now = new Date();
  const remaining = this.expiresAt.getTime() - now.getTime();
  
  if (remaining <= 0) return 'expired';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Instance method to check if user has viewed the story
storySchema.methods.hasUserViewed = function(userId: string): boolean {
  return this.viewers.some((viewer: IStoryViewer) => 
    viewer.user.toString() === userId.toString()
  );
};

// Instance method to add viewer
storySchema.methods.addViewer = function(userId: string): void {
  if (!this.hasUserViewed(userId)) {
    this.viewers.push({
      user: new Types.ObjectId(userId),
      viewedAt: new Date()
    });
  }
};

// Static methods
storySchema.statics.findActiveStories = function(userId?: string) {
  const query: any = {
    expiresAt: { $gt: new Date() },
    isArchived: false
  };
  
  if (userId) {
    // Exclude stories hidden from this user
    query['privacy.hideFromUsers'] = { $ne: new Types.ObjectId(userId) };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

storySchema.statics.findUserStories = function(userId: string, includeExpired: boolean = false) {
  const query: any = {
    author: userId,
    isArchived: false
  };
  
  if (!includeExpired) {
    query.expiresAt = { $gt: new Date() };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

storySchema.statics.findHighlights = function(userId: string) {
  return this.find({
    author: userId,
    isHighlight: true,
    isArchived: false
  }).sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
storySchema.set('toJSON', { virtuals: true });
storySchema.set('toObject', { virtuals: true });

// Create and export the model
const Story = mongoose.model<IStory, IStoryModel>('Story', storySchema);

export default Story;