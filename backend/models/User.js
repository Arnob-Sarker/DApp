const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  emailHash: {
    type: String,
    required: false
  },
  nameHash: {
    type: String,
    required: false
  },
  phoneHash: {
    type: String,
    required: false
  },
  in_progress: {
    type: Boolean,
    default: false
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  registered: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    required: false
  },
  metadata: {
    type: Object,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to hash personal data
userSchema.statics.hashPersonalData = function(data) {
  const salt = process.env.HASH_SALT || 'default-salt-for-development';
  return crypto.createHmac('sha256', salt).update(data.toLowerCase().trim()).digest('hex');
};

// Static method to verify personal data against hash
userSchema.statics.verifyPersonalData = function(data, hash) {
  const expectedHash = this.hashPersonalData(data);
  return expectedHash === hash;
};

// Instance method to get hashed personal data
userSchema.methods.getHashedPersonalData = function() {
  return {
    emailHash: this.emailHash,
    nameHash: this.nameHash,
    phoneHash: this.phoneHash
  };
};

module.exports = mongoose.model('User', userSchema); 