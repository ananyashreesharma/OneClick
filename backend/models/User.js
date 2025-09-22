const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    defaultNoteType: {
      type: String,
      enum: ['text', 'draw', 'voice', 'photo', 'supernote'],
      default: 'text'
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    searchHistory: [{
      query: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  stats: {
    totalNotes: { type: Number, default: 0 },
    totalDrawings: { type: Number, default: 0 },
    totalVoiceNotes: { type: Number, default: 0 },
    totalPhotos: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
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

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    avatar: this.avatar,
    preferences: this.preferences,
    stats: this.stats,
    createdAt: this.createdAt
  };
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to update user stats
userSchema.statics.updateUserStats = function(userId, statsUpdate) {
  return this.findByIdAndUpdate(
    userId,
    { 
      $inc: statsUpdate,
      $set: { 'stats.lastActive': new Date() }
    },
    { new: true }
  );
};

module.exports = mongoose.model('User', userSchema);
