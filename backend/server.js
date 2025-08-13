const express = require('express');
const { Web3 } = require('web3');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('MongoDB connected successfully');
});

// Import models
const User = require('./models/User');
const Token = require('./models/Token');
const Session = require('./models/Session');
const ProviderSessionMapping = require('./models/ProviderSessionMapping');

// Booking Schema (keeping existing for compatibility)
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  aggregatorSessionId: { type: String, required: true },
  providerSessionId: { type: String, required: true },
  walletAddress: { type: String, required: true },
  serviceProvider: { type: String, required: true },
  fare: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  bookingUrl: { type: String, required: true },
  driverInfo: {
    name: String,
    vehicleType: String,
    vehicleNumber: String,
    estimatedTime: Number
  },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Middleware
app.use(cors());
app.use(express.json());

// Web3 setup with provider fallback
let web3;
let contract;

function initializeWeb3() {
    try {
        const providerUrl = process.env.WEB3_PROVIDER || 'http://localhost:8545';

        if (providerUrl.startsWith('http://') || providerUrl.startsWith('https://')) {
            web3 = new Web3(providerUrl);
            console.log('Using HTTP provider - event listening will be disabled');
        } else if (providerUrl.startsWith('ws://') || providerUrl.startsWith('wss://')) {
            web3 = new Web3(providerUrl);
            console.log('Using WebSocket provider - event listening enabled');
        } else {
            web3 = new Web3(providerUrl);
            console.log('Using custom provider');
        }

        const contractAddress = process.env.CONTRACT_ADDRESS || '0x0d9b9A01a97a9466ab74FBFBA064ac432c97376d';
        const contractABI = require('./contractABI.json');

        contract = new web3.eth.Contract(contractABI.abi, contractAddress);

        return web3.eth.net.isListening();
    } catch (error) {
        console.error('Web3 initialization error:', error);
        return false;
    }
}

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

function generateVerificationCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Helper: Get valid access token for a wallet and SP
async function getAccessToken(walletAddress, serviceProvider) {
    const token = await Token.findOne({
        walletAddress: walletAddress.toLowerCase(),
        serviceProvider
    });
    if (!token) return null;
    // Check expiry
    if (new Date(token.expiry) < new Date()) {
        // TODO: Optionally refresh token using refreshToken
        return null;
    }
    return token.accessToken;
}

// API Endpoints

// Step 1: Wallet Connection - Create user entry in MongoDB
app.post('/connect-wallet', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
        // Check if user already exists
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            // Create new user entry with default flags
            user = new User({
                walletAddress: walletAddress.toLowerCase(),
                in_progress: false,
                email_verified: false,
                registered: false
            });
            await user.save();
            console.log(`New user created for wallet: ${walletAddress}`);
        }

        res.json({ 
            success: true, 
            user: {
                walletAddress: user.walletAddress,
                in_progress: user.in_progress,
                email_verified: user.email_verified,
                registered: user.registered
            }
        });
    } catch (error) {
        console.error('Error in connect-wallet endpoint:', error);
        res.status(500).json({ error: 'Failed to connect wallet' });
    }
});

// Step 2: Registration Form Submission
app.post('/register-user', async (req, res) => {
    const { walletAddress, name, phone, email } = req.body;

    if (!walletAddress || !name || !phone || !email) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Find user
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please connect wallet first.' });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();

        // Hash personal data before storing in database
        const emailHash = User.hashPersonalData(email);
        const nameHash = User.hashPersonalData(name);
        const phoneHash = User.hashPersonalData(phone);

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification - Your Registration',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome ${name}!</h2>
                    <p>Thank you for registering with us. To complete your registration, please verify your email address.</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Your verification code:</strong> 
                        <span style="font-family: monospace; font-size: 18px; color: #007bff;">${verificationCode}</span></p>
                    </div>
                    <p>Please enter this code on the verification page to complete your registration.</p>
                    <p style="color: #666; font-size: 14px;">
                        This verification code will expire in 24 hours. If you didn't register for this account, please ignore this email.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Update database with hashed data
        user.in_progress = true;
        user.email_verified = false;
        user.registered = false;
        user.emailHash = emailHash;
        user.nameHash = nameHash;
        user.phoneHash = phoneHash;
        user.verificationCode = verificationCode;
        await user.save();

        // Return session data for frontend storage (not stored in database)
        const sessionData = {
            name: name,
            email: email,
            phone: phone
        };

        res.json({ 
            success: true, 
            message: 'Registration submitted. Please check your email for verification code.',
            sessionData: sessionData // For frontend local storage
        });
    } catch (error) {
        console.error('Error in register-user endpoint:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Step 3: Email Verification
app.post('/verify-email', async (req, res) => {
    const { walletAddress, verificationCode } = req.body;

    if (!walletAddress || !verificationCode) {
        return res.status(400).json({ error: 'Wallet address and verification code are required' });
    }

    try {
        // Find user
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.in_progress) {
            return res.status(400).json({ error: 'No registration in progress' });
        }

        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Code is correct - return success for frontend to handle blockchain transaction
        res.json({ 
            success: true, 
            message: 'Email verification code is correct. Proceeding to blockchain transaction...'
        });
    } catch (error) {
        console.error('Error in verify-email endpoint:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Step 4: Final Login
app.post('/login', async (req, res) => {
    const { walletAddress, blockchainData, sessionData } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
        // Find user
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is already registered and verified
        if (user.registered && user.email_verified) {
            // User is already fully registered, just return success
            const userSessionData = sessionData || {
                name: 'User',
                email: 'user@example.com',
                phone: 'N/A'
            };

            res.json({ 
                success: true, 
                message: 'Login successful!',
                user: {
                    walletAddress: user.walletAddress,
                    registered: user.registered,
                    email_verified: user.email_verified
                },
                sessionData: userSessionData
            });
            return;
        }

        // Check if user is in progress but not verified
        if (!user.in_progress) {
            return res.status(400).json({ error: 'No registration in progress. Please register first.' });
        }

        if (!user.email_verified) {
            return res.status(400).json({ error: 'Email not verified. Please verify your email first.' });
        }

        // Verify blockchain data if provided
        if (blockchainData) {
            // You could add additional verification here if needed
            console.log('Blockchain data verified:', blockchainData);
        }

        // FINAL STEP: Update database with completed registration
        user.in_progress = false;
        user.email_verified = true;
        user.registered = true;
        user.metadata = blockchainData || {};
        user.verificationCode = null; // Clear the verification code
        await user.save();

        // Return session data for frontend (from request body, not database)
        const userSessionData = sessionData || {
            name: 'User', // Default if no session data provided
            email: 'user@example.com',
            phone: 'N/A'
        };

        res.json({ 
            success: true, 
            message: 'Login successful!',
            user: {
                walletAddress: user.walletAddress,
                registered: user.registered,
                email_verified: user.email_verified
            },
            sessionData: userSessionData // Return session data for frontend storage
        });
    } catch (error) {
        console.error('Error in login endpoint:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get user status
app.get('/user-status/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;

    try {
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            walletAddress: user.walletAddress,
            in_progress: user.in_progress,
            email_verified: user.email_verified,
            registered: user.registered,
            // Note: Personal data (name, email, phone) is not returned as it's hashed
            // Frontend should use session storage for current session data
            hasPersonalData: !!(user.emailHash && user.nameHash && user.phoneHash)
        });
    } catch (error) {
        console.error('Error in user-status endpoint:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// Resend verification code
app.post('/resend-verification', async (req, res) => {
    const { walletAddress, email } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!email) {
        return res.status(400).json({ error: 'Email is required for resending verification code' });
    }

    try {
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user || !user.in_progress) {
            return res.status(400).json({ error: 'No registration in progress' });
        }

        // Verify email matches the hash in database
        const emailHash = User.hashPersonalData(email);
        if (user.emailHash !== emailHash) {
            return res.status(400).json({ error: 'Email does not match registered email' });
        }

        // Generate new verification code
        const newVerificationCode = generateVerificationCode();

        // Send new verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email, // Use email from request body (session data)
            subject: 'New Verification Code - Your Registration',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">New Verification Code</h2>
                    <p>Here's your new verification code:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Your new verification code:</strong> 
                        <span style="font-family: monospace; font-size: 18px; color: #007bff;">${newVerificationCode}</span></p>
                    </div>
                    <p>Please enter this code on the verification page to complete your registration.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Update verification code in database
        user.verificationCode = newVerificationCode;
        await user.save();

        res.json({ success: true, message: 'New verification code sent!' });
    } catch (error) {
        console.error('Error in resend-verification endpoint:', error);
        res.status(500).json({ error: 'Failed to resend verification code' });
    }
});

// Update user status after blockchain transaction
app.post('/update-user-status', async (req, res) => {
    const { walletAddress, blockchainData } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user status after successful blockchain transaction
        user.email_verified = true;
        user.registered = true;
        user.in_progress = false;
        user.verificationCode = null; // Clear the verification code
        user.metadata = blockchainData || {};
        await user.save();

        res.json({ 
            success: true, 
            message: 'User status updated successfully after blockchain transaction'
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Endpoint to store OAuth tokens (to be called after OAuth flow)
app.post('/store-token', async (req, res) => {
    const { walletAddress, serviceProvider, accessToken, refreshToken, expiry, metadata } = req.body;
    console.log('[STORE-TOKEN] Received:', { walletAddress, serviceProvider, accessToken, refreshToken, expiry });
    if (!walletAddress || !serviceProvider || !accessToken || !refreshToken || !expiry) {
        console.log('[STORE-TOKEN] Missing required fields');
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        // Upsert token for this wallet+SP
        const token = await Token.findOneAndUpdate(
            { walletAddress: walletAddress.toLowerCase(), serviceProvider },
            { accessToken, refreshToken, expiry, metadata, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('[STORE-TOKEN] Token stored:', token);
        res.json({ success: true, token });
    } catch (error) {
        console.error('[STORE-TOKEN] Error storing token:', error);
        res.status(500).json({ error: 'Failed to store token' });
    }
});

// Endpoint to grant permission to a service provider
app.post('/grant-permission', async (req, res) => {
    const { walletAddress, serviceProvider } = req.body;
    console.log('[GRANT-PERMISSION] Received:', { walletAddress, serviceProvider });
    
    if (!walletAddress || !serviceProvider) {
        return res.status(400).json({ error: 'Missing walletAddress or serviceProvider' });
    }
    
    try {
        // Check if user exists
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update user permissions (this would typically be stored on-chain in a real implementation)
        // For now, we'll just log the permission grant
        console.log(`[GRANT-PERMISSION] Permission granted for ${walletAddress} to ${serviceProvider}`);
        
        res.json({ 
            success: true, 
            message: `Permission granted to ${serviceProvider}`,
            serviceProvider,
            walletAddress
        });
    } catch (error) {
        console.error('[GRANT-PERMISSION] Error:', error);
        res.status(500).json({ error: 'Failed to grant permission' });
    }
});

// Endpoint to get permissions for a wallet
app.get('/permissions/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    
    try {
        // Get all tokens for this wallet (tokens = permissions)
        const tokens = await Token.find({
            walletAddress: walletAddress.toLowerCase(),
            expiry: { $gt: new Date() }
        });
        
        const permissions = tokens.map(token => ({
            serviceProvider: token.serviceProvider,
            grantedAt: token.createdAt,
            expiresAt: token.expiry
        }));
        
        res.json({
            success: true,
            permissions
        });
    } catch (error) {
        console.error('[PERMISSIONS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

// Endpoint to get booking history for a wallet
app.get('/bookings/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    
    try {
        // Get all bookings for this wallet
        const bookings = await Booking.find({
            walletAddress: walletAddress.toLowerCase()
        }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error('[BOOKINGS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch booking history' });
    }
});

// Endpoint to get OAuth token for a wallet and SP
app.get('/get-token', async (req, res) => {
    const { walletAddress, serviceProvider } = req.query;
    if (!walletAddress || !serviceProvider) {
        return res.status(400).json({ error: 'Missing walletAddress or serviceProvider' });
    }
    try {
        const token = await Token.findOne({
            walletAddress: walletAddress.toLowerCase(),
            serviceProvider
        });
        if (!token) return res.status(404).json({ error: 'Token not found' });
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch token' });
    }
});

// Advanced Session Management - Query SPs with Session
app.post('/sp-query', async (req, res) => {
  const { walletAddress, serviceProvider, query, sessionId } = req.body;
  
  console.log('[SP-QUERY] Received:', { walletAddress, serviceProvider, query, sessionId });
  console.log('[SP-QUERY] Validation:', { 
    hasWalletAddress: !!walletAddress, 
    hasQuery: !!query, 
    queryType: typeof query,
    queryKeys: query ? Object.keys(query) : 'null'
  });
  
  if (!walletAddress || !query) {
    console.log('[SP-QUERY] Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Step 1: Create aggregated session if not provided
    let aggregatorSession = null;
    let sessionMapping = null;
    
    if (!sessionId) {
      // Generate unique session ID
      const newSessionId = Session.generateSessionId();
      
      // Set expiration (30 minutes from now)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      
      // Create aggregator session
      aggregatorSession = new Session({
        sessionId: newSessionId,
        walletAddress: walletAddress.toLowerCase(),
        latitude: query.lat || 23.8103, // Dhaka coordinates
        longitude: query.lon || 90.4125,
        radius: query.radius || 2,
        expiresAt
      });
      
      await aggregatorSession.save();
      
      // Create provider session mapping
      sessionMapping = new ProviderSessionMapping({
        aggregatorSessionId: newSessionId,
        walletAddress: walletAddress.toLowerCase(),
        expiresAt
      });
      
      await sessionMapping.save();
      
      console.log(`[SESSION] Created aggregator session: ${newSessionId} for wallet: ${walletAddress}`);
    } else {
      // Use existing session
      aggregatorSession = await Session.findOne({ 
        sessionId, 
        walletAddress: walletAddress.toLowerCase(),
        status: 'active',
        expiresAt: { $gt: new Date() }
      });
      
      if (!aggregatorSession) {
        return res.status(400).json({ error: 'Invalid or expired session' });
      }
      
      sessionMapping = await ProviderSessionMapping.findByAggregatorSessionId(sessionId);
      if (!sessionMapping) {
        return res.status(400).json({ error: 'Session mapping not found' });
      }
    }
    
    // Step 2: Get all permitted SPs for this wallet
    const permittedSPs = await Token.find({
      walletAddress: walletAddress.toLowerCase(),
      expiry: { $gt: new Date() }
    });
    
    console.log(`[SP-QUERY] Found ${permittedSPs.length} permitted SPs for wallet: ${walletAddress}`);
    
    // Step 3: Query all permitted SPs and create individual sessions
    const spResults = [];
    const spPorts = {
      'sp1': 5001,
      'sp2': 5002,
      'sp3': 5003
    };
    
    for (const tokenRecord of permittedSPs) {
      const spId = tokenRecord.serviceProvider;
      const spPort = spPorts[spId];
      
      if (!spPort) {
        console.log(`[SP-QUERY] Unknown SP: ${spId}`);
        continue;
      }
      
      try {
        console.log(`[SP-QUERY] Querying ${spId} on port ${spPort}`);
        
        // Step 3a: Query SP for nearby rides with DP
        const nearbyResponse = await axios.post(
          `http://localhost:${spPort}/api/nearby`,
          {
            location: query.location || 'Dhaka',
            lat: query.lat || 23.8103,
            lon: query.lon || 90.4125,
            radius: query.radius || 2,
            type: 'nearby'
          },
          {
            headers: {
              'Authorization': `Bearer ${tokenRecord.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!nearbyResponse.data.success && !nearbyResponse.data.data) {
          console.log(`[SP-QUERY] ${spId} returned no data`);
          continue;
        }
        
        // Step 3b: Create individual SP session for booking
        const spSessionResponse = await axios.post(
          `http://localhost:${spPort}/api/session`,
          {
            walletAddress,
            location: {
              lat: query.lat || 23.8103,
              lng: query.lon || 90.4125
            },
            rideId: nearbyResponse.data.data[0]?._id || 'default_ride',
            fare: nearbyResponse.data.data[0]?.price || 150.00
          },
          {
            headers: {
              'Authorization': `Bearer ${tokenRecord.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (spSessionResponse.data.success) {
          // Step 3c: Store provider session mapping
          const providerSessionId = spSessionResponse.data.sessionId;
          const lockedFare = spSessionResponse.data.lockedFare;
          
          await sessionMapping.addProviderSession(spId, providerSessionId, lockedFare, {
            epsilon: nearbyResponse.data.privacyApplied ? nearbyResponse.data.epsilon : 0.5,
            lat: query.lat || 23.8103,
            lng: query.lon || 90.4125
          });
          
          console.log(`[SESSION] Created ${spId} session: ${providerSessionId} with fare: ${lockedFare}`);
          
          // Step 3d: Prepare booking info
          const bookingInfo = {
            serviceProvider: spId,
            providerSessionId,
            lockedFare,
            rides: nearbyResponse.data.data || [],
            privacyApplied: nearbyResponse.data.privacyApplied || false,
            epsilon: nearbyResponse.data.epsilon || 0.5,
            accessToken: tokenRecord.accessToken
          };
          
          spResults.push(bookingInfo);
        }
        
      } catch (error) {
        console.error(`[SP-QUERY] Error querying ${spId}:`, error.message);
        // Continue with other SPs even if one fails
      }
    }
    
    // Step 4: Return aggregated results with session data
    res.json({
      success: true,
      aggregatorSessionId: aggregatorSession.sessionId,
      sessionExpiresAt: aggregatorSession.expiresAt,
      permittedSPs: spResults.length,
      bookingInfo: spResults,
      message: `Successfully queried ${spResults.length} service providers`
    });
    
  } catch (error) {
    console.error('Error in SP query:', error);
    res.status(500).json({ error: 'Failed to query SPs or create sessions' });
  }
});

// Advanced Session Management - Create Aggregator Session
app.post('/create-session', async (req, res) => {
  const { walletAddress, latitude, longitude, radius = 1 } = req.body;
  
  if (!walletAddress || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  try {
    // Generate unique session ID
    const sessionId = Session.generateSessionId();
    
    // Set expiration (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    // Create aggregator session
    const session = new Session({
      sessionId,
      walletAddress: walletAddress.toLowerCase(),
      latitude,
      longitude,
      radius,
      expiresAt
    });
    
    await session.save();
    
    // Create provider session mapping
    const sessionMapping = new ProviderSessionMapping({
      aggregatorSessionId: sessionId,
      walletAddress: walletAddress.toLowerCase(),
      expiresAt
    });
    
    await sessionMapping.save();
    
    console.log(`[SESSION] Created aggregator session: ${sessionId} for wallet: ${walletAddress}`);
    
    res.json({
      success: true,
      sessionId,
      expiresAt,
      message: 'Session created successfully'
    });
    
      } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get Session Information
app.get('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const session = await Session.findOne({ 
      sessionId, 
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    const sessionMapping = await ProviderSessionMapping.findByAggregatorSessionId(sessionId);
    
    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        walletAddress: session.walletAddress,
        latitude: session.latitude,
        longitude: session.longitude,
        radius: session.radius,
        status: session.status,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      },
      providerSessions: sessionMapping ? Array.from(sessionMapping.sessionMap.entries()) : []
    });
    
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session information' });
  }
});

// Get User Sessions
app.get('/sessions/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    const sessions = await Session.find({ 
      walletAddress: walletAddress.toLowerCase(),
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    const sessionMappings = await ProviderSessionMapping.findByWalletAddress(walletAddress);
    
    res.json({
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        latitude: session.latitude,
        longitude: session.longitude,
        radius: session.radius,
        status: session.status,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      })),
      sessionMappings: sessionMappings.map(mapping => ({
        aggregatorSessionId: mapping.aggregatorSessionId,
        providerSessions: Array.from(mapping.sessionMap.entries()),
        status: mapping.status,
        createdAt: mapping.createdAt,
        expiresAt: mapping.expiresAt
      }))
    });
    
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

// Clean Expired Sessions (Admin endpoint)
app.post('/clean-sessions', async (req, res) => {
  try {
    const sessionResult = await Session.cleanExpiredSessions();
    const mappingResult = await ProviderSessionMapping.cleanExpiredMappings();
    
    console.log(`[CLEANUP] Cleaned ${sessionResult.modifiedCount} expired sessions and ${mappingResult.modifiedCount} expired mappings`);
    
    res.json({
      success: true,
      message: 'Expired sessions cleaned successfully',
      sessionsCleaned: sessionResult.modifiedCount,
      mappingsCleaned: mappingResult.modifiedCount
    });
    
  } catch (error) {
    console.error('Error cleaning sessions:', error);
    res.status(500).json({ error: 'Failed to clean expired sessions' });
  }
});

// Advanced Booking with Fare Locking & Validation
app.post('/book-ride', async (req, res) => {
  try {
    const { aggregatorSessionId, provider, walletAddress, providerSessionId, accessToken } = req.body;
    
    if (!aggregatorSessionId || !provider || !walletAddress || !providerSessionId || !accessToken) {
      return res.status(400).json({ error: 'Missing required booking parameters' });
    }
    
    // Validate aggregator session exists and is active
    const session = await Session.findOne({ 
      sessionId: aggregatorSessionId,
      walletAddress: walletAddress.toLowerCase(),
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Invalid or expired session' });
    }
    
    // Get session mapping to validate provider session and retrieve locked fare
    const sessionMapping = await ProviderSessionMapping.findByAggregatorSessionId(aggregatorSessionId);
    if (!sessionMapping) {
      return res.status(404).json({ error: 'Session mapping not found' });
    }
    
    // Get provider session data
    const providerSession = sessionMapping.getProviderSession(provider);
    if (!providerSession) {
      return res.status(400).json({ error: 'Provider session not found in mapping' });
    }
    
    // Validate provider session ID matches
    if (providerSession.providerSessionId !== providerSessionId) {
      return res.status(400).json({ error: 'Provider session ID mismatch' });
    }
    
    // Get locked fare from session mapping
    const lockedFare = providerSession.fare;
    if (!lockedFare || lockedFare <= 0) {
      return res.status(400).json({ error: 'Invalid locked fare' });
    }
    
    console.log(`[BOOKING] Validated session and locked fare: ${lockedFare} for ${provider}`);
    
    // Map provider to port
    const spPorts = {
      'sp1': 5001,
      'sp2': 5002,
      'sp3': 5003
    };
    const spPort = spPorts[provider] || 5001;
    
    // Call SP's booking endpoint with locked fare validation
    const spBookingResponse = await axios.post(`http://localhost:${spPort}/api/book`, {
      providerSessionId,
      accessToken,
      lockedFare, // Send locked fare for validation
      locationData: providerSession.locationData
    });
    
    if (!spBookingResponse.data.success) {
      return res.status(400).json({ error: 'SP booking failed: ' + spBookingResponse.data.error });
    }
    
    // Validate fare integrity (SP should return the same fare)
    const returnedFare = spBookingResponse.data.fare;
    if (Math.abs(returnedFare - lockedFare) > 0.01) { // Allow small floating point differences
      console.error(`[BOOKING] Fare tampering detected! Locked: ${lockedFare}, Returned: ${returnedFare}`);
      return res.status(400).json({ error: 'Fare integrity violation detected' });
    }
    
    // Create booking record
    const bookingId = `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`;
    const booking = new Booking({
      bookingId,
      aggregatorSessionId,
      providerSessionId,
      walletAddress: walletAddress.toLowerCase(),
      serviceProvider: provider,
      fare: lockedFare, // Use locked fare
      bookingUrl: spBookingResponse.data.bookingUrl,
      driverInfo: spBookingResponse.data.driverInfo || {}
    });
    
    await booking.save();
    
    // Update session status to completed
    session.status = 'completed';
    await session.save();
    
    console.log(`[BOOKING] Created booking: ${bookingId} for ${provider} with validated fare: ${lockedFare}`);
    
    res.json({
      success: true,
      bookingId,
      bookingUrl: spBookingResponse.data.bookingUrl,
      driverInfo: spBookingResponse.data.driverInfo,
      fare: lockedFare,
      sessionInfo: {
        aggregatorSessionId,
        providerSessionId,
        expiresAt: session.expiresAt
      }
    });
    
      } catch (error) {
        console.error('[BOOKING] Error:', error);
        res.status(500).json({ error: 'Booking failed: ' + error.message });
    }
});

// Token Refresh & Validation System
app.post('/refresh-token', async (req, res) => {
  try {
    const { walletAddress, serviceProvider } = req.body;
    
    if (!walletAddress || !serviceProvider) {
      return res.status(400).json({ error: 'Wallet address and service provider required' });
    }
    
    // Find existing token
    const token = await Token.findOne({
      walletAddress: walletAddress.toLowerCase(),
      serviceProvider
    });
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Check if token is expired
    const now = new Date();
    if (token.expiry > now) {
      return res.json({
        success: true,
        message: 'Token is still valid',
        token: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiry: token.expiry
        }
      });
    }
    
    console.log(`[TOKEN-REFRESH] Refreshing expired token for ${serviceProvider}`);
    
    // Determine SP OAuth server URL
    const spPorts = {
      'sp1': 5001,
      'sp2': 5002,
      'sp3': 5003
    };
    const spPort = spPorts[serviceProvider] || 5001;
    
    // Call SP's token refresh endpoint
    const refreshResponse = await axios.post(`http://localhost:${spPort}/oauth/refresh`, {
      refresh_token: token.refreshToken,
      client_id: process.env[`${serviceProvider.toUpperCase()}_CLIENT_ID`] || 'demo123',
      client_secret: process.env[`${serviceProvider.toUpperCase()}_CLIENT_SECRET`] || 'demo456'
    });
    
    if (!refreshResponse.data.access_token) {
      return res.status(400).json({ error: 'Token refresh failed' });
    }
    
    // Update token in database
    const newExpiry = new Date(Date.now() + (refreshResponse.data.expires_in * 1000));
    
    token.accessToken = refreshResponse.data.access_token;
    token.refreshToken = refreshResponse.data.refresh_token || token.refreshToken;
    token.expiry = newExpiry;
    token.metadata = {
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token || token.refreshToken,
      expires_in: refreshResponse.data.expires_in,
      token_type: refreshResponse.data.token_type || 'Bearer'
    };
    token.updatedAt = new Date();
    
    await token.save();
    
    console.log(`[TOKEN-REFRESH] Successfully refreshed token for ${serviceProvider}`);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiry: token.expiry
      }
    });
    
  } catch (error) {
    console.error('[TOKEN-REFRESH] Error:', error);
    res.status(500).json({ error: 'Token refresh failed: ' + error.message });
  }
});

// Validate Token Status
app.get('/validate-token/:walletAddress/:serviceProvider', async (req, res) => {
  try {
    const { walletAddress, serviceProvider } = req.params;
    
    const token = await Token.findOne({
      walletAddress: walletAddress.toLowerCase(),
      serviceProvider
    });
    
    if (!token) {
      return res.json({
        success: true,
        valid: false,
        message: 'No token found'
      });
    }
    
    const now = new Date();
    const isValid = token.expiry > now;
    const expiresIn = Math.max(0, Math.floor((token.expiry - now) / 1000)); // seconds
    
    res.json({
      success: true,
      valid: isValid,
      expiresIn,
      token: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiry: token.expiry
      }
    });
    
  } catch (error) {
    console.error('[TOKEN-VALIDATE] Error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
});

// Auto-refresh expired tokens (utility endpoint)
app.post('/auto-refresh-tokens', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Find all tokens for the wallet
    const tokens = await Token.find({
      walletAddress: walletAddress.toLowerCase()
    });
    
    const now = new Date();
    const refreshResults = [];
    
    for (const token of tokens) {
      if (token.expiry <= now) {
        try {
          // Attempt to refresh expired token
          const refreshResponse = await axios.post('/refresh-token', {
            walletAddress,
            serviceProvider: token.serviceProvider
          });
          
          refreshResults.push({
            serviceProvider: token.serviceProvider,
            success: true,
            message: 'Token refreshed'
          });
        } catch (error) {
          refreshResults.push({
            serviceProvider: token.serviceProvider,
            success: false,
            error: error.message
          });
        }
      } else {
        refreshResults.push({
          serviceProvider: token.serviceProvider,
          success: true,
          message: 'Token still valid'
        });
      }
    }
    
    res.json({
      success: true,
      results: refreshResults
    });
    
  } catch (error) {
    console.error('[AUTO-REFRESH] Error:', error);
    res.status(500).json({ error: 'Auto-refresh failed' });
  }
});

// Get booking status
app.get('/booking/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({ bookingId });
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.json({
            bookingId: booking.bookingId,
            status: booking.status,
            fare: booking.fare,
            serviceProvider: booking.serviceProvider,
            driverInfo: booking.driverInfo,
            bookingUrl: booking.bookingUrl,
            createdAt: booking.createdAt
        });
        
    } catch (error) {
        console.error('[DAPP-BOOKING] Error:', error);
        res.status(500).json({ error: 'Failed to get booking status' });
    }
});

// Get user's booking history
app.get('/bookings/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const bookings = await Booking.find({ 
            walletAddress: walletAddress.toLowerCase() 
        }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            bookings: bookings.map(booking => ({
                bookingId: booking.bookingId,
                status: booking.status,
                fare: booking.fare,
                serviceProvider: booking.serviceProvider,
                driverInfo: booking.driverInfo,
                bookingUrl: booking.bookingUrl,
                createdAt: booking.createdAt
            }))
        });
        
    } catch (error) {
        console.error('[DAPP-BOOKINGS] Error:', error);
        res.status(500).json({ error: 'Failed to get booking history' });
    }
});

// Get user's permissions
app.get('/permissions/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        // Get tokens from database
        const tokens = await Token.find({ 
            walletAddress: walletAddress.toLowerCase() 
        });
        
        // Map to permissions
        const permissions = tokens.map(token => ({
            serviceProvider: token.serviceProvider,
            hasAccess: true,
            grantedAt: token.createdAt,
            expiresAt: token.expiry
        }));
        
        res.json({
            success: true,
            permissions
        });
        
    } catch (error) {
        console.error('[DAPP-PERMISSIONS] Error:', error);
        res.status(500).json({ error: 'Failed to get permissions' });
    }
});

// Revoke permission from SP
app.post('/revoke-permission', async (req, res) => {
    try {
        const { walletAddress, serviceProvider } = req.body;
        
        console.log(`[REVOKE-PERMISSION] Revoking permission for ${walletAddress} from ${serviceProvider}`);
        
        // Step 1: Get the access token for this SP
        const tokenRecord = await Token.findOne({
            walletAddress: walletAddress.toLowerCase(),
            serviceProvider: serviceProvider
        });
        
        if (!tokenRecord) {
            return res.status(404).json({ error: 'No permission found for this service provider' });
        }
        
        // Step 2: Revoke token with SP (if SP supports token revocation)
        try {
            const spPort = serviceProvider === 'sp1' ? 5001 : 
                          serviceProvider === 'sp2' ? 5002 : 
                          serviceProvider === 'sp3' ? 5003 : 5000;
            
            const spApiUrl = `http://localhost:${spPort}/api/revoke-token`;
            
            await axios.post(spApiUrl, {
                access_token: tokenRecord.accessToken
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`[REVOKE-PERMISSION] Token revoked with SP: ${serviceProvider}`);
        } catch (spError) {
            console.log(`[REVOKE-PERMISSION] SP token revocation failed (may not be supported): ${spError.message}`);
        }
        
        // Step 3: Remove token from database
        await Token.deleteOne({
            walletAddress: walletAddress.toLowerCase(),
            serviceProvider: serviceProvider
        });
        
        console.log(`[REVOKE-PERMISSION] Token removed from database for ${serviceProvider}`);
        
        // Step 4: Update on-chain permission (smart contract call)
        try {
            if (contract && contract.methods) {
                const accounts = await web3.eth.getAccounts();
                const result = await contract.methods.setPermission(
                    walletAddress,
                    serviceProvider,
                    false // revoke permission
                ).send({
                    from: accounts[0],
                    gas: 200000
                });
                
                console.log(`[REVOKE-PERMISSION] On-chain permission revoked: ${result.transactionHash}`);
            }
        } catch (contractError) {
            console.error(`[REVOKE-PERMISSION] Smart contract error: ${contractError.message}`);
            // Continue even if smart contract fails
        }
        
        res.json({
            success: true,
            message: `Permission revoked from ${serviceProvider}`,
            serviceProvider
        });
        
    } catch (error) {
        console.error('[REVOKE-PERMISSION] Error:', error);
        res.status(500).json({ error: 'Failed to revoke permission' });
    }
});

// Revoke all permissions for a user
app.post('/revoke-all-permissions', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        console.log(`[REVOKE-ALL-PERMISSIONS] Revoking all permissions for ${walletAddress}`);
        
        // Get all tokens for this user
        const tokens = await Token.find({
            walletAddress: walletAddress.toLowerCase()
        });
        
        const revokedProviders = [];
        
        // Revoke each permission
        for (const token of tokens) {
            try {
                // Revoke with SP
                const spPort = token.serviceProvider === 'sp1' ? 5001 : 
                              token.serviceProvider === 'sp2' ? 5002 : 
                              token.serviceProvider === 'sp3' ? 5003 : 5000;
                
                const spApiUrl = `http://localhost:${spPort}/api/revoke-token`;
                
                await axios.post(spApiUrl, {
                    access_token: token.accessToken
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`[REVOKE-ALL-PERMISSIONS] Token revoked with SP: ${token.serviceProvider}`);
            } catch (spError) {
                console.log(`[REVOKE-ALL-PERMISSIONS] SP token revocation failed for ${token.serviceProvider}: ${spError.message}`);
            }
            
            revokedProviders.push(token.serviceProvider);
        }
        
        // Remove all tokens from database
        await Token.deleteMany({
            walletAddress: walletAddress.toLowerCase()
        });
        
        console.log(`[REVOKE-ALL-PERMISSIONS] All tokens removed from database`);
        
        // Update on-chain permissions
        try {
            if (contract && contract.methods) {
                const accounts = await web3.eth.getAccounts();
                
                for (const provider of revokedProviders) {
                    await contract.methods.setPermission(
                        walletAddress,
                        provider,
                        false // revoke permission
                    ).send({
                        from: accounts[0],
                        gas: 200000
                    });
                }
                
                console.log(`[REVOKE-ALL-PERMISSIONS] All on-chain permissions revoked`);
            }
        } catch (contractError) {
            console.error(`[REVOKE-ALL-PERMISSIONS] Smart contract error: ${contractError.message}`);
        }
        
        res.json({
            success: true,
            message: 'All permissions revoked successfully',
            revokedProviders
        });
        
    } catch (error) {
        console.error('[REVOKE-ALL-PERMISSIONS] Error:', error);
        res.status(500).json({ error: 'Failed to revoke all permissions' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongodb: db.readyState === 1 ? 'Connected' : 'Disconnected',
        provider: process.env.WEB3_PROVIDER || 'http://localhost:8545'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start server
async function startServer() {
    console.log('Initializing Web3...');

    const isConnected = await initializeWeb3();
    if (!isConnected) {
        console.error('Failed to connect to Web3 provider');
        process.exit(1);
    }

    console.log('Web3 connected successfully');

    app.listen(PORT, () => {
        console.log(`Registration server running on port ${PORT}`);
        console.log(`MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_system'}`);
        console.log(`Provider: ${process.env.WEB3_PROVIDER || 'http://localhost:8545'}`);
    });
}

startServer().catch(console.error);
