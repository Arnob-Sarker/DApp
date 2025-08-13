require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`SP3 MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Ride Data Schema
const rideSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  driverName: { type: String, required: true },
  vehicleType: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  price: { type: Number, required: true },
  estimatedTime: { type: Number, required: true }, // in minutes
  status: { type: String, enum: ['available', 'booked', 'in-progress', 'completed'], default: 'available' },
  createdAt: { type: Date, default: Date.now }
});

const Ride = mongoose.model('Ride', rideSchema);

// Session Management Schema
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  lockedFare: { type: Number, required: true },
  rideId: { type: String, required: true },
  status: { type: String, enum: ['active', 'expired', 'booked'], default: 'active' },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-expire after 1 hour
});

const Session = mongoose.model('Session', sessionSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  walletAddress: { type: String, required: true },
  rideId: { type: String, required: true },
  fare: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  bookingUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Differential Privacy Engine
const addNoise = (value, epsilon = 1.0) => {
  const scale = 1.0 / epsilon;
  const noise = (Math.random() - 0.5) * 2 * scale;
  return value + noise;
};

// Load sample ride data for SP3
const loadSampleData = async () => {
  try {
    const count = await Ride.countDocuments();
    if (count === 0) {
      const sampleRides = [
        {
          driverId: 'SP3_DR001',
          driverName: 'Nurul Islam',
          vehicleType: 'Budget Car',
          vehicleNumber: 'SYL-1234',
          currentLocation: { lat: 23.7500, lng: 90.3700, address: 'Dhanmondi, Dhaka' },
          destination: { lat: 23.8103, lng: 90.4125, address: 'Gulshan, Dhaka' },
          price: 120,
          estimatedTime: 30
        },
        {
          driverId: 'SP3_DR002',
          driverName: 'Ayesha Begum',
          vehicleType: 'Mini Bus',
          vehicleNumber: 'SYL-5678',
          currentLocation: { lat: 23.8103, lng: 90.4125, address: 'Gulshan, Dhaka' },
          destination: { lat: 23.7937, lng: 90.4066, address: 'Banani, Dhaka' },
          price: 90,
          estimatedTime: 25
        },
        {
          driverId: 'SP3_DR003',
          driverName: 'Mizanur Rahman',
          vehicleType: 'Auto Rickshaw',
          vehicleNumber: 'SYL-9012',
          currentLocation: { lat: 23.7937, lng: 90.4066, address: 'Banani, Dhaka' },
          destination: { lat: 23.7500, lng: 90.3700, address: 'Dhanmondi, Dhaka' },
          price: 60,
          estimatedTime: 20
        }
      ];
      await Ride.insertMany(sampleRides);
      console.log('✅ Loaded sample ride data for SP3');
    }
  } catch (error) {
    console.error('Error loading sample data:', error);
  }
};

// Routes

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// OAuth Authorization Endpoint
app.get('/oauth/authorize', (req, res) => {
  const { client_id, response_type, redirect_uri, state } = req.query;
  
  if (client_id !== process.env.OAUTH_CLIENT_ID) {
    return res.status(400).json({ error: 'Invalid client_id' });
  }
  
  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Invalid response_type' });
  }

  // Store OAuth parameters for later use
  global.oauthParams = global.oauthParams || {};
  const sessionId = Math.random().toString(36).substring(2, 15);
  global.oauthParams[sessionId] = { client_id, redirect_uri, state, timestamp: Date.now() };
  
  // Redirect to login page with session ID
  res.redirect(`/oauth/login?session_id=${sessionId}`);
});

// OAuth Login Page
app.get('/oauth/login', (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id || !global.oauthParams || !global.oauthParams[session_id]) {
    return res.status(400).send('Invalid OAuth session');
  }
  
  // Serve the OAuth login page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SP3 - OAuth Login</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body { background-color: #f8f9fa; }
            .oauth-card { max-width: 400px; margin: 100px auto; }
            .oauth-header { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="oauth-card">
                <div class="card shadow">
                    <div class="card-header oauth-header text-white text-center">
                        <h4><i class="fas fa-motorcycle"></i> SP3 Budget Rides</h4>
                        <p class="mb-0">OAuth Authorization Required</p>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Authorization Request:</strong><br>
                            An application is requesting access to your SP3 account.
                        </div>
                        
                        <form id="oauthLoginForm">
                            <input type="hidden" id="sessionId" value="${session_id}">
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" required>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-warning">
                                    <i class="fas fa-sign-in-alt"></i> Authorize Access
                                </button>
                                <button type="button" class="btn btn-outline-secondary" onclick="window.close()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            document.getElementById('oauthLoginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const sessionId = document.getElementById('sessionId').value;
                
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Authentication successful, complete OAuth flow
                        const oauthResponse = await fetch('/oauth/complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                sessionId, 
                                user: data.user,
                                token: data.token 
                            })
                        });
                        
                        const oauthData = await oauthResponse.json();
                        
                        if (oauthResponse.ok) {
                            // Redirect back to the client
                            window.location.href = oauthData.redirectUrl;
                        } else {
                            alert('OAuth authorization failed: ' + oauthData.error);
                        }
                    } else {
                        alert('Login failed: ' + data.error);
                    }
                } catch (error) {
                    alert('Network error. Please try again.');
                }
            });
        </script>
    </body>
    </html>
  `);
});

// OAuth Complete Endpoint
app.post('/oauth/complete', (req, res) => {
  const { sessionId, user, token } = req.body;
  
  if (!sessionId || !global.oauthParams || !global.oauthParams[sessionId]) {
    return res.status(400).json({ error: 'Invalid session' });
  }
  
  const oauthParams = global.oauthParams[sessionId];
  
  // Generate authorization code
  const authCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store the authorization code with user info
  global.authCodes = global.authCodes || {};
  global.authCodes[authCode] = { 
    ...oauthParams, 
    user: user,
    token: token,
    timestamp: Date.now() 
  };
  
  // Clean up session
  delete global.oauthParams[sessionId];
  
  // Redirect back to the client
  const redirectUrl = `${oauthParams.redirect_uri}?code=${authCode}&state=${oauthParams.state}`;
  res.json({ redirectUrl });
});

// OAuth Token Endpoint
app.post('/oauth/token', (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;
  
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'Invalid grant_type' });
  }
  
  if (client_id !== process.env.OAUTH_CLIENT_ID || client_secret !== process.env.OAUTH_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Invalid client credentials' });
  }
  
  // Verify authorization code
  if (!global.authCodes || !global.authCodes[code]) {
    return res.status(400).json({ error: 'Invalid authorization code' });
  }
  
  const authCodeData = global.authCodes[code];
  
  // Clean up used code
  delete global.authCodes[code];
  
  // Generate access token
  const accessToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const refreshToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
    user: authCodeData.user
  });
});

// Differential Privacy API - Nearby Rides
app.post('/api/nearby', async (req, res) => {
  try {
    const { location, type, lat, lon, radius = 5 } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all available rides
    const rides = await Ride.find({ status: 'available' });
    
    // Apply differential privacy to location data
    const privatizedRides = rides.map(ride => ({
      ...ride.toObject(),
      currentLocation: {
        lat: addNoise(ride.currentLocation.lat, process.env.DP_EPSILON),
        lng: addNoise(ride.currentLocation.lng, process.env.DP_EPSILON),
        address: ride.currentLocation.address
      },
      destination: {
        lat: addNoise(ride.destination.lat, process.env.DP_EPSILON),
        lng: addNoise(ride.destination.lng, process.env.DP_EPSILON),
        address: ride.destination.address
      },
      price: addNoise(ride.price, process.env.DP_EPSILON)
    }));

    res.json({
      serviceProvider: 'SP3_BudgetRides',
      data: privatizedRides,
      privacyApplied: true,
      epsilon: process.env.DP_EPSILON
    });
  } catch (error) {
    console.error('Error in nearby rides API:', error);
    res.status(500).json({ error: 'Failed to fetch nearby rides' });
  }
});

// Get all rides (for internal use)
app.get('/api/rides', async (req, res) => {
  try {
    const rides = await Ride.find();
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Token Revocation Endpoint
app.post('/api/revoke-token', (req, res) => {
  try {
    const { access_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    // In a real implementation, you would:
    // 1. Validate the token
    // 2. Add it to a blacklist
    // 3. Remove it from active sessions
    
    // For demo purposes, we'll just acknowledge the revocation
    console.log(`[SP3] Token revoked: ${access_token}`);
    
    res.json({
      success: true,
      message: 'Token revoked successfully'
    });
    
  } catch (error) {
    console.error('[SP3] Token revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// Add new ride
app.post('/api/rides', async (req, res) => {
  try {
    const ride = new Ride(req.body);
    await ride.save();
    res.status(201).json(ride);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add ride' });
  }
});

// Update ride status
app.put('/api/rides/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(ride);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

// Booking endpoints
app.post('/api/book', async (req, res) => {
  try {
    const { providerSessionId, accessToken, lockedFare, locationData } = req.body;
    
    console.log('[SP3-BOOKING] Received booking request:', {
      providerSessionId,
      lockedFare,
      hasAccessToken: !!accessToken
    });
    
    // Validate access token (in real implementation, verify JWT)
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Find session
    const session = await Session.findOne({ sessionId: providerSessionId, status: 'active' });
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    // Validate locked fare integrity
    if (Math.abs(session.lockedFare - lockedFare) > 0.01) {
      console.error(`[SP3-BOOKING] Fare tampering detected! Session: ${session.lockedFare}, Request: ${lockedFare}`);
      return res.status(400).json({ error: 'Fare integrity violation detected' });
    }
    
    // Find the ride
    const ride = await Ride.findById(session.rideId);
    if (!ride || ride.status !== 'available') {
      return res.status(400).json({ error: 'Ride not available' });
    }
    
    // Generate booking
    const bookingId = `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`;
    const bookingUrl = `http://localhost:${PORT}/booking/${bookingId}`;
    
    const booking = new Booking({
      bookingId,
      sessionId: providerSessionId,
      walletAddress: session.walletAddress,
      rideId: session.rideId,
      fare: session.lockedFare, // Use locked fare for integrity
      bookingUrl
    });
    
    await booking.save();
    
    // Update session status
    session.status = 'booked';
    await session.save();
    
    // Update ride status
    ride.status = 'booked';
    await ride.save();
    
    console.log(`[SP3-BOOKING] Booking created: ${bookingId} for session: ${providerSessionId} with fare: ${session.lockedFare}`);
    
    res.json({
      success: true,
      bookingId,
      bookingUrl,
      fare: session.lockedFare, // Return locked fare for verification
      driverInfo: {
        name: ride.driverName,
      vehicleType: ride.vehicleType,
        vehicleNumber: ride.vehicleNumber,
      estimatedTime: ride.estimatedTime
      }
    });
    
  } catch (error) {
    console.error('[SP3-BOOKING] Error:', error);
    res.status(500).json({ error: 'Booking failed' });
  }
});

// Get booking status
app.get('/api/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const ride = await Ride.findById(booking.rideId);
    
    res.json({
      bookingId: booking.bookingId,
      status: booking.status,
      fare: booking.fare,
      driverName: ride.driverName,
      vehicleType: ride.vehicleType,
      vehicleNumber: ride.vehicleNumber,
      estimatedTime: ride.estimatedTime,
      bookingUrl: booking.bookingUrl
    });
    
  } catch (error) {
    console.error('[SP3-BOOKING] Error:', error);
    res.status(500).json({ error: 'Failed to get booking status' });
  }
});

// Create session for booking
app.post('/api/session', async (req, res) => {
  try {
    const { walletAddress, location, rideId, fare } = req.body;
    
    const sessionId = `SESS${Date.now()}${Math.random().toString(36).substring(2, 5)}`;
    
    const session = new Session({
      sessionId,
      walletAddress,
      location,
      lockedFare: fare,
      rideId
    });
    
    await session.save();
    
    console.log(`[SP3-SESSION] Session created: ${sessionId} for session: ${sessionId}`);
    
    res.json({
      success: true,
      sessionId,
      lockedFare: fare
    });
    
  } catch (error) {
    console.error('[SP3-SESSION] Error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const startServer = async () => {
  await connectDB();
  await loadSampleData();
  
  app.listen(PORT, () => {
    console.log(`🚗 SP3 Budget Rides Server running on port ${PORT}`);
    console.log(`📍 OAuth Server: http://localhost:${PORT}/oauth/authorize`);
    console.log(`🔐 API Base: http://localhost:${PORT}/api`);
  });
};

startServer(); 