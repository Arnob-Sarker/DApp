const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { getDistance } = require('geolib');

const app = express();
const PORT = process.env.PORT || 4000;
const EPSILON = 0.5; // Optimal privacy-utility balance
const METERS_PER_DEGREE = 111320;
const MAX_DISPLACEMENT = 5000; // 5km maximum displacement

let dataset = [];

// Enhanced dataset loading with error handling
async function loadDataset() {
  return new Promise((resolve, reject) => {
    const csvPath = path.join(__dirname, 'uploads', 'dataset.csv');
    
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
          console.log(`✅ Loaded ${dataset.length} data points`);
          resolve();
        })
        .on('error', reject);
    });
  });
}

// Improved Geo-Indistinguishability function
function addNoise(lat, lon) {
  // Exponential distribution for radius
  const radius = -Math.log(1 - Math.random()) / EPSILON;
  const clippedRadius = Math.min(radius, MAX_DISPLACEMENT);
  const angle = Math.random() * 2 * Math.PI;
  
  // Convert meters to degrees (latitude-adjusted)
  const deltaLat = clippedRadius * Math.cos(angle) / METERS_PER_DEGREE;
  const deltaLon = clippedRadius * Math.sin(angle) / (METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180));
  
  return [
    lat + deltaLat,
    lon + deltaLon
  ];
}

// Middleware
app.use(express.static('public'));
app.use(express.json());

// API Endpoint with enhanced error handling
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
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server with async initialization
async function startServer() {
  try {
    await loadDataset();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`API Endpoint: POST /api/nearby`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();