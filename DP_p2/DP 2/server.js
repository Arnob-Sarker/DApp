const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { getDistance } = require('geolib');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Privacy Parameters
const EPSILON = 0.1;  // Strong privacy (0.1-1.0 typical for locations)
const MAX_DISPLACEMENT = 10000; // meters (5km)
const METERS_PER_DEGREE = 111320; // At equator
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

let dataset = [];

// Corrected Noise Function
function addNoise(lat, lon) {
  const METERS_PER_DEGREE_LAT = 111320; // Constant for latitude
  const METERS_PER_DEGREE_LON = 111320 * Math.cos(lat * Math.PI / 180); // Adjusted for longitude
  // 1. Generate exponential noise for radius
  const radius = -Math.log(1 - Math.random()) / EPSILON;
  
  // 2. Clip to maximum displacement
  const clippedRadius = Math.min(radius, MAX_DISPLACEMENT);
  
  // 3. Random angle
  const angle = Math.random() * 2 * Math.PI;
  
  // 4. Convert to lat/lon displacement (accurate for Dhaka)
  const latDisplacement = clippedRadius * Math.cos(angle) / METERS_PER_DEGREE_LAT;
  const lonDisplacement = clippedRadius * Math.sin(angle) / (METERS_PER_DEGREE_LAT * Math.cos(lat * Math.PI / 180));
  
  return [
    lat + latDisplacement,
    lon + lonDisplacement
  ];
}

// File Upload Setup
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, 'dataset.csv')
});
const upload = multer({ storage });

// Load Dataset
function loadDataset() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(UPLOAD_DIR, 'dataset.csv');
    if (!fs.existsSync(filePath)) return reject(new Error('Dataset not found'));

    dataset = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (row['Pickup Lat'] && row['Pickup Lon']) {
          dataset.push({
            lat: parseFloat(row['Pickup Lat']),
            lon: parseFloat(row['Pickup Lon'])
          });
        }
      })
      .on('end', () => {
        console.log(`Loaded ${dataset.length} points`);
        resolve();
      })
      .on('error', reject);
  });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/upload', upload.single('dataset'), async (req, res) => {
  try {
    await loadDataset();
    res.json({ 
      success: true,
      message: `Uploaded ${dataset.length} points`,
      epsilon: EPSILON,
      maxDisplacement: MAX_DISPLACEMENT
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 1 } = req.body;
    
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const radiusMeters = radius * 1000;
    const results = dataset
      .filter(point => getDistance(
        { latitude: lat, longitude: lon },
        { latitude: point.lat, longitude: point.lon }
      ) <= radiusMeters)
      .map(point => {
        const [noisyLat, noisyLon] = addNoise(point.lat, point.lon);
        return {
          real: { lat: point.lat, lon: point.lon },
          noisy: { lat: noisyLat, lon: noisyLon },
          distance: getDistance(
            { latitude: lat, longitude: lon },
            { latitude: point.lat, longitude: point.lon }
          ) / 1000  // km
        };
      });

    res.json({
      count: results.length,
      points: results,
      privacy: { epsilon: EPSILON, maxDisplacementKm: MAX_DISPLACEMENT / 1000 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug Endpoint
app.get('/test-noise', (req, res) => {
  const testPoints = [
    { lat: 23.8103, lon: 90.4125 },  // Dhaka center
    { lat: 23.7800, lon: 90.4000 },  // Nearby point
  ];

  const results = testPoints.map(point => {
    const [noisyLat, noisyLon] = addNoise(point.lat, point.lon);
    const distance = getDistance(
      { latitude: point.lat, longitude: point.lon },
      { latitude: noisyLat, longitude: noisyLon }
    );
    return {
      original: point,
      noisy: { lat: noisyLat, lon: noisyLon },
      displacement: distance
    };
  });

  res.json({ epsilon: EPSILON, maxDisplacement: MAX_DISPLACEMENT, results });
});

// Start Server
async function startServer() {
  try {
    await loadDataset();
  } catch (error) {
    console.log('No initial dataset found. Upload one via POST /upload');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test endpoints:`);
    console.log(`- POST /nearby with { "lat":23.81, "lon":90.41, "radius":1 }`);
    console.log(`- GET  /test-noise to verify noise generation`);
  });
}

startServer();