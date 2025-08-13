const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  radius: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  metadata: {
    type: Object,
    default: {}
  }
});

// Index for efficient queries
sessionSchema.index({ walletAddress: 1, status: 1 });
sessionSchema.index({ createdAt: 1, status: 1 });

// Method to check if session is expired
sessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to expire session
sessionSchema.methods.expire = function() {
  this.status = 'expired';
  return this.save();
};

// Static method to create session ID
sessionSchema.statics.generateSessionId = function() {
  return 'AGG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Static method to clean expired sessions
sessionSchema.statics.cleanExpiredSessions = async function() {
  const now = new Date();
  return this.updateMany(
    { expiresAt: { $lt: now }, status: 'active' },
    { status: 'expired' }
  );
};

module.exports = mongoose.model('Session', sessionSchema); 