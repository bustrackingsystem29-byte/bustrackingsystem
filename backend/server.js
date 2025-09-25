import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for bus locations (in production, use a proper database)
const busLocations = new Map();
const busRoutes = new Map();

// Sample bus routes data
const sampleRoutes = [
  {
    id: 'ROUTE_001',
    name: 'City Center - Airport',
    buses: ['BUS_101', 'BUS_102'],
    stops: [
      { name: 'City Center', lat: 11.1563, lon: 77.5932 },
      { name: 'Main Market', lat: 11.1663, lon: 77.6032 },
      { name: 'University', lat: 11.1763, lon: 77.6132 },
      { name: 'Airport', lat: 11.1863, lon: 77.6232 }
    ]
  },
  {
    id: 'ROUTE_002', 
    name: 'Railway Station - Tech Park',
    buses: ['BUS_201', 'BUS_202'],
    stops: [
      { name: 'Railway Station', lat: 11.1463, lon: 77.5832 },
      { name: 'Shopping Mall', lat: 11.1513, lon: 77.5932 },
      { name: 'Hospital', lat: 11.1613, lon: 77.6032 },
      { name: 'Tech Park', lat: 11.1713, lon: 77.6132 }
    ]
  }
];

// Initialize sample data
sampleRoutes.forEach(route => {
  busRoutes.set(route.id, route);
  route.buses.forEach(busId => {
    // Initialize with first stop location
    busLocations.set(busId, {
      device_id: busId,
      lat: route.stops[0].lat,
      lon: route.stops[0].lon,
      speed: 0,
      route_id: route.id,
      updated: new Date().toISOString(),
      status: 'stopped'
    });
  });
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Calculate ETA to a destination
function calculateETA(currentLat, currentLon, destLat, destLon, speed) {
  if (speed === 0) return 'Stopped';
  
  const distance = calculateDistance(currentLat, currentLon, destLat, destLon);
  const etaHours = distance / speed;
  const etaMinutes = Math.round(etaHours * 60);
  
  return etaMinutes > 0 ? `${etaMinutes} min` : 'Arrived';
}

// Get local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const netInterface of interfaces[name]) {
      if (netInterface.family === 'IPv4' && !netInterface.internal) {
        return netInterface.address;
      }
    }
  }
  return 'localhost';
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    totalBuses: busLocations.size 
  });
});

// Receive GPS data from hardware (ESP32)
app.post('/api/locations', (req, res) => {
  try {
    const { device_id, lat, lon, speed } = req.body;
    
    if (!device_id || lat === undefined || lon === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: device_id, lat, lon' 
      });
    }

    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedSpeed = parseFloat(speed) || 0;

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      return res.status(400).json({ 
        error: 'Invalid latitude or longitude values' 
      });
    }

    // Find route for this bus
    let routeId = null;
    for (const [id, route] of busRoutes.entries()) {
      if (route.buses.includes(device_id)) {
        routeId = id;
        break;
      }
    }

    const locationData = {
      device_id,
      lat: parsedLat,
      lon: parsedLon,
      speed: parsedSpeed,
      route_id: routeId,
      updated: new Date().toISOString(),
      status: parsedSpeed > 0 ? 'active' : 'stopped'
    };

    busLocations.set(device_id, locationData);
    
    console.log(`📍 GPS Update: ${device_id} - Lat: ${parsedLat}, Lon: ${parsedLon}, Speed: ${parsedSpeed} km/h`);
    
    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      data: locationData
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific bus location
app.get('/api/locations/:device_id', (req, res) => {
  const { device_id } = req.params;
  const location = busLocations.get(device_id);
  
  if (!location) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  res.json(location);
});

// Get all bus locations
app.get('/api/locations', (req, res) => {
  const locations = Array.from(busLocations.values());
  res.json(locations);
});

// Get routes
app.get('/api/routes', (req, res) => {
  const routes = Array.from(busRoutes.values()).map(route => ({
    ...route,
    buses: route.buses.map(busId => ({
      id: busId,
      location: busLocations.get(busId) || null
    }))
  }));
  res.json(routes);
});

// Search buses by departure and destination
app.get('/api/search', (req, res) => {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ error: 'Missing from or to parameter' });
  }

  const matchingRoutes = Array.from(busRoutes.values()).filter(route => {
    const stopNames = route.stops.map(stop => stop.name.toLowerCase());
    return stopNames.some(name => name.includes(from.toLowerCase())) &&
           stopNames.some(name => name.includes(to.toLowerCase()));
  });

  const results = matchingRoutes.map(route => {
    const routeBuses = route.buses.map(busId => {
      const location = busLocations.get(busId);
      return {
        id: busId,
        route: route.name,
        location,
        eta: location ? calculateETA(
          location.lat, 
          location.lon, 
          route.stops[route.stops.length - 1].lat,
          route.stops[route.stops.length - 1].lon,
          location.speed
        ) : 'Unknown'
      };
    });
    
    return {
      route_id: route.id,
      route_name: route.name,
      buses: routeBuses,
      stops: route.stops
    };
  });

  res.json(results);
});

function simulateBusMovement() {
  setInterval(() => {
    busLocations.forEach((location, busId) => {
      if (location.status === 'active') {
        // Small random movement to simulate real GPS updates
        const latChange = (Math.random() - 0.5) * 0.001; // ~100m movement
        const lonChange = (Math.random() - 0.5) * 0.001;
        
        location.lat += latChange;
        location.lon += lonChange;
        location.speed = Math.max(0, location.speed + (Math.random() - 0.5) * 10);
        location.updated = new Date().toISOString();
        
        console.log(`🚌 Simulated GPS Update: ${busId} - Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}, Speed: ${location.speed.toFixed(1)} km/h`);
      }
    });
  }, 8000); // Update every 8 seconds for demo
}

// Start server
app.listen(PORT, () => {
  const localIP = getLocalIPAddress();
  
  console.log('\n🚍 Smart Bus Tracking System - Backend Server');
  console.log('=' .repeat(50));
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`🌍 Access from other devices: http://${localIP}:${PORT}`);
  console.log('\n📡 API Endpoints for ESP32 Hardware:');
  console.log(`👉 POST GPS Data: http://${localIP}:${PORT}/api/locations`);
  console.log(`👉 Get Bus Location: http://${localIP}:${PORT}/api/locations/BUS_101`);
  console.log(`👉 Get All Locations: http://${localIP}:${PORT}/api/locations`);
  console.log(`👉 Health Check: http://${localIP}:${PORT}/api/health`);
  console.log('\n📱 Example ESP32 POST Body:');
  console.log('{ "device_id": "BUS_101", "lat": 11.1863, "lon": 77.6232, "speed": 35 }');
  console.log('=' .repeat(50));
  
  // Start bus movement simulation for demo
  console.log('\n🎯 Starting GPS simulation for demo purposes...');
  simulateBusMovement();
});