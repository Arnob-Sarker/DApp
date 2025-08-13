const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const userRoutes = require('./routes/userRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
const session = require('express-session');
const crypto = require('crypto');
const url = require('url');
const User = require('./models/userModel'); // Make sure path is correct!
const cors = require('cors');
const csv = require('csv-parser');
const fs = require('fs');
const { getDistance } = require('geolib');

dotenv.config();
const app = express();
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// --- Session setup for browser-based login ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret',
  resave: false,
  saveUninitialized: true
}));

// --- In-memory OAuth code store (for demo only!) ---
const codeStore = {}; // { code: { email, issuedAt } }

// DP Engine Parameters
const EPSILON = 0.5; // Privacy-utility balance
const METERS_PER_DEGREE = 111320;
const MAX_DISPLACEMENT = 5000; // 5km
let dataset = [];

// Load dataset from DP_p2/DP/uploads/dataset.csv
async function loadDataset() {
  return new Promise((resolve, reject) => {
    const csvPath = path.join(__dirname, '../../../DP_p2/DP/uploads/dataset.csv');
    fs.access(csvPath, fs.constants.F_OK, (err) => {
      if (err) return reject(new Error(`Dataset file not found at ${csvPath}`));
      dataset = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          if (row['Pickup Lat'] && row['Pickup Lon']) {
            dataset.push({
              lat: parseFloat(row['Pickup Lat']),
              lon: parseFloat(row['Pickup Lon']),
              area: row['Pickup Area'] || 'Unknown'
            });
          }
        })
        .on('end', () => {
          console.log(`✅ Loaded ${dataset.length} data points for DP engine`);
          resolve();
        })
        .on('error', reject);
    });
  });
}

function addNoise(lat, lon) {
  const radius = -Math.log(1 - Math.random()) / EPSILON;
  const clippedRadius = Math.min(radius, MAX_DISPLACEMENT);
  const angle = Math.random() * 2 * Math.PI;
  const deltaLat = clippedRadius * Math.cos(angle) / METERS_PER_DEGREE;
  const deltaLon = clippedRadius * Math.sin(angle) / (METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180));
  return [lat + deltaLat, lon + deltaLon];
}

// --- Regular API routes ---
app.use('/api', meetingRoutes);
app.get("/api", (req, res) => {
    res.send("API is running..");
});
app.use('/api/auth', userRoutes);

// Replace dummy DP endpoint with real DP engine
app.post('/api/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 1 } = req.body;
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    const radiusMeters = (radius || 1) * 1000;
    const nearbyPoints = dataset
      .filter(d => getDistance(
        { latitude: lat, longitude: lon },
        { latitude: d.lat, longitude: d.lon }
      ) <= radiusMeters)
      .map(d => {
        const [noisyLat, noisyLon] = addNoise(d.lat, d.lon);
        return {
          lat: noisyLat,
          lon: noisyLon,
          area: d.area
        };
      });
  res.json({
      success: true,
      count: nearbyPoints.length,
      results: nearbyPoints,
      privacy: {
        epsilon: EPSILON,
        maxDisplacementKm: MAX_DISPLACEMENT / 1000
      }
  });
  } catch (error) {
    console.error('DP API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Serve frontend (including index.html, js, css, etc.) ---
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Serve index.html explicitly
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Helper: Middleware to check login for OAuth
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  // If not logged in: redirect to login page with 'next'
  const returnUrl = req.originalUrl;
  return res.redirect(`/index.html?next=${encodeURIComponent(returnUrl)}`);
}

// --- OAuth Authorization Endpoint (must login first) ---
app.get('/oauth/authorize', requireLogin, (req, res) => {
  const { client_id, redirect_uri, state } = req.query;
  const code = crypto.randomBytes(16).toString('hex');
  // Store code with minimal info (here, just user's email)
  codeStore[code] = { email: req.session.user.email, issuedAt: Date.now() };
  // Build redirect URI with code & state
  const uri = url.parse(redirect_uri, true);
  uri.query.code = code;
  if (state) uri.query.state = state;
  delete uri.search;
  return res.redirect(url.format(uri));
});

// --- OAuth login handler (checks MongoDB) ---
app.post('/oauth/spa-login', async (req, res) => {
  const { email, password, next } = req.body;
  if (!email || !password) {
    return res.status(400).send('Email and password required.');
  }
  // Validate user against MongoDB
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) { // matchPassword should be on your model!
    return res.status(401).send('Invalid credentials.');
  }
  req.session.user = { id: user._id, email: user.email };
  // Redirect back to 'next' (usually /oauth/authorize?...), else /
  return res.redirect(next || '/');
});

// --- OAuth token endpoint (now uses codeStore!) ---
app.post('/oauth/token', (req, res) => {
  const { client_id, client_secret, code, redirect_uri, grant_type } = req.body;
  if (!code || !codeStore[code]) {
    return res.status(400).json({ error: 'invalid_grant' });
  }
  // Optionally: Check client_id/client_secret, expiration, etc.
  // Remove code after use (one-time)
  delete codeStore[code];
  // Generate tokens
  const accessToken = crypto.randomBytes(24).toString('hex');
  const refreshToken = crypto.randomBytes(24).toString('hex');
  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    token_type: 'Bearer'
  });
});

// --- Catchall for SPA routing (don't serve index.html for api/oauth) ---
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/oauth')) {
    return next();
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));

loadDataset().catch(err => {
  console.error('❌ Failed to load DP dataset:', err.message);
  process.exit(1);
});
