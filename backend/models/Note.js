const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    trim: true 
  },
  type: { 
    type: String, 
    enum: ['text', 'draw', 'voice', 'photo', 'supernote'], 
    required: true 
  },
  content: { 
    type: String, 
    trim: true 
  },
  drawingData: [{ 
    path: String, 
    strokeWidth: Number, 
    strokeColor: String 
  }],
  drawingUrl: { 
    type: String 
  },
  voiceUrl: { 
    type: String 
  },
  photoUrl: { 
    type: String 
  },
  mood: { 
    type: String, 
    enum: ['happy', 'sad', 'excited', 'tired', 'inspired', 'frustrated'] 
  },
  isPrivate: { 
    type: Boolean, 
    default: false 
  },
  pinned: { 
    type: Boolean, 
    default: false 
  },
  archived: { 
    type: Boolean, 
    default: false 
  },
  deleted: { 
    type: Boolean, 
    default: false 
  },
  tags: [{ 
    type: String, 
    trim: true 
  }],
  metadata: {
    drawingDuration: Number,
    voiceDuration: Number,
    photoSize: Number,
    lastInputMode: String
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Text indexes for search functionality
noteSchema.index({ 
  title: 'text', 
  content: 'text' 
});

// Compound indexes for efficient querying
noteSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
noteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });
noteSchema.index({ userId: 1, isPrivate: 1, deleted: 1 });
noteSchema.index({ userId: 1, type: 1, deleted: 1 });

// Pre-save middleware to update timestamps
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to check if note is a supernote
noteSchema.methods.isSuperNote = function() {
  return this.type === 'supernote' || 
         (this.content && (this.drawingData?.length > 0 || this.voiceUrl || this.photoUrl));
};

// Static method to get user's notes with filters
noteSchema.statics.getUserNotes = function(userId, options = {}) {
  const {
    search,
    type,
    showPrivate = true,
    showArchived = false,
    limit = 50,
    skip = 0,
    sortBy = 'updatedAt',
    sortOrder = -1
  } = options;

  const filter = { 
    userId, 
    deleted: false 
  };

  if (!showPrivate) filter.isPrivate = false;
  if (!showArchived) filter.archived = false;
  if (type) filter.type = type;

  let query = this.find(filter);

  if (search) {
    query = query.find({ $text: { $search: search } });
  }

  return query
    .sort({ [sortBy]: sortOrder, pinned: -1 })
    .limit(limit)
    .skip(skip)
    .exec();
};

// Static method to get note statistics
noteSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), deleted: false } },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        textNotes: { $sum: { $cond: [{ $eq: ['$type', 'text'] }, 1, 0] } },
        drawingNotes: { $sum: { $cond: [{ $eq: ['$type', 'draw'] }, 1, 0] } },
        voiceNotes: { $sum: { $cond: [{ $eq: ['$type', 'voice'] }, 1, 0] } },
        photoNotes: { $sum: { $cond: [{ $eq: ['$type', 'photo'] }, 1, 0] } },
        superNotes: { $sum: { $cond: [{ $eq: ['$type', 'supernote'] }, 1, 0] } },
        privateNotes: { $sum: { $cond: ['$isPrivate', 1, 0] } },
        pinnedNotes: { $sum: { $cond: ['$pinned', 1, 0] } }
      }
    }
  ]);
};

module.exports = mongoose.model('Note', noteSchema);
