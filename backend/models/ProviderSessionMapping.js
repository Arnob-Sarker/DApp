const mongoose = require('mongoose');

const providerSessionMappingSchema = new mongoose.Schema({
  aggregatorSessionId: {
    type: String,
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  sessionMap: {
    type: Map,
    of: {
      providerSessionId: String,
      serviceProvider: String,
      fare: Number,
      locationData: {
        epsilon: Number,
        lat: Number,
        lng: Number
      },
      createdAt: Date,
      expiresAt: Date
    },
    default: new Map()
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
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
});

// Index for efficient queries
providerSessionMappingSchema.index({ aggregatorSessionId: 1, status: 1 });
providerSessionMappingSchema.index({ walletAddress: 1, status: 1 });
providerSessionMappingSchema.index({ createdAt: 1, status: 1 });

// Pre-save middleware to update updatedAt
providerSessionMappingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add provider session
providerSessionMappingSchema.methods.addProviderSession = function(serviceProvider, providerSessionId, fare, locationData) {
  this.sessionMap.set(serviceProvider, {
    providerSessionId,
    serviceProvider,
    fare,
    locationData,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  });
  return this.save();
};

// Method to get provider session
providerSessionMappingSchema.methods.getProviderSession = function(serviceProvider) {
  return this.sessionMap.get(serviceProvider);
};

// Method to remove provider session
providerSessionMappingSchema.methods.removeProviderSession = function(serviceProvider) {
  this.sessionMap.delete(serviceProvider);
  return this.save();
};

// Method to check if session is expired
providerSessionMappingSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to expire mapping
providerSessionMappingSchema.methods.expire = function() {
  this.status = 'expired';
  return this.save();
};

// Static method to clean expired mappings
providerSessionMappingSchema.statics.cleanExpiredMappings = async function() {
  const now = new Date();
  return this.updateMany(
    { expiresAt: { $lt: now }, status: 'active' },
    { status: 'expired' }
  );
};

// Static method to find active mapping by aggregator session ID
providerSessionMappingSchema.statics.findByAggregatorSessionId = function(sessionId) {
  return this.findOne({ 
    aggregatorSessionId: sessionId, 
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

// Static method to find active mappings by wallet address
providerSessionMappingSchema.statics.findByWalletAddress = function(walletAddress) {
  return this.find({ 
    walletAddress: walletAddress.toLowerCase(), 
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('ProviderSessionMapping', providerSessionMappingSchema); 