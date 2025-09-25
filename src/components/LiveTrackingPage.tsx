import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Clock, Zap, Navigation, Users, Bell, BellOff } from 'lucide-react';
import type { Bus } from '../App';

// Leaflet imports
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveTrackingPageProps {
  bus: Bus;
  onBack: () => void;
  backendUrl: string;
}

const LiveTrackingPage: React.FC<LiveTrackingPageProps> = ({ bus, onBack, backendUrl }) => {
  const [currentLocation, setCurrentLocation] = useState(bus.location);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<number>(10);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Sample route data (in production, this would come from the backend)
  const routeStops = [
    { name: 'City Center', lat: 11.1563, lon: 77.5932, eta: '2 min' },
    { name: 'Main Market', lat: 11.1663, lon: 77.6032, eta: '8 min' },
    { name: 'University', lat: 11.1763, lon: 77.6132, eta: '15 min' },
    { name: 'Airport', lat: 11.1863, lon: 77.6232, eta: '25 min' }
  ];

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [currentLocation?.lat || 11.1663, currentLocation?.lon || 77.6032], 
        15
      );

      // Add detailed street map with clear labels and place names
      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap France | © OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10,
      }).addTo(mapInstanceRef.current);

      // Create custom bus icon
      const busIcon = L.divIcon({
        html: `
          <div style="background: #2563EB; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            🚌
          </div>
        `,
        className: 'custom-bus-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      // Add bus marker
      if (currentLocation) {
        markerRef.current = L.marker([currentLocation.lat, currentLocation.lon], { 
          icon: busIcon 
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div class="text-center">
              <strong>${bus.id}</strong><br>
              Speed: ${currentLocation.speed} km/h<br>
              Status: ${currentLocation.status}
            </div>
          `);
      }

      // Add route line
      const routeCoordinates: [number, number][] = routeStops.map(stop => [stop.lat, stop.lon]);
      routeLineRef.current = L.polyline(routeCoordinates, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
      }).addTo(mapInstanceRef.current);

      // Add stop markers
      routeStops.forEach((stop, index) => {
        const stopIcon = L.divIcon({
          html: `
            <div style="background: white; color: #3B82F6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid #3B82F6;">
              ${index + 1}
            </div>
          `,
          className: 'custom-stop-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker([stop.lat, stop.lon], { icon: stopIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div>
              <strong>${stop.name}</strong><br>
              ETA: ${stop.eta}
            </div>
          `);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update bus location every 5 seconds
  useEffect(() => {
    const updateLocation = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/locations/${bus.id}`);
        if (!response.ok) return;
        
        const location = await response.json();
        
        // Only update if location actually changed
        if (currentLocation && 
            Math.abs(location.lat - currentLocation.lat) < 0.000001 && 
            Math.abs(location.lon - currentLocation.lon) < 0.000001) {
          return;
        }
        
        // Update marker position with smooth animation
        if (markerRef.current && mapInstanceRef.current) {
          const newLatLng = L.latLng(location.lat, location.lon);
          markerRef.current.setLatLng(newLatLng);
          
          // Update popup content
          markerRef.current.bindPopup(`
            <div class="text-center">
              <strong>${bus.id}</strong><br>
              Speed: ${location.speed} km/h<br>
              Status: ${location.status}<br>
              <small>Lat: ${location.lat.toFixed(6)}</small><br>
              <small>Lon: ${location.lon.toFixed(6)}</small>
            </div>
          `);
          
          // Smoothly pan to new location
          mapInstanceRef.current.panTo(newLatLng, {
            animate: true,
            duration: 1.0
          });
        }
        
        setCurrentLocation(location);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Initial update
    updateLocation();

    // Set up interval
    const interval = setInterval(updateLocation, 3000); // Update every 3 seconds for more real-time feel
    return () => clearInterval(interval);
  }, [bus.id, backendUrl]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Navigation className="w-4 h-4" />;
      case 'stopped': return <Clock className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Live Tracking - {bus.id}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live GPS</span>
                  </div>
                  <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentLocation && (
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentLocation.status)}`}>
                  {getStatusIcon(currentLocation.status)}
                  <span className="ml-2 capitalize">{currentLocation.status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-screen">
        {/* Map Section */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full min-h-96" />
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-2">GPS Tracking</div>
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Hardware Data</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Updates: Every 3s
            </div>
          </div>
          
          {/* GPS Coordinates Display */}
          {currentLocation && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
              <div className="text-xs font-medium text-gray-900 mb-1">GPS Coordinates</div>
              <div className="text-xs text-gray-600">
                <div>Lat: {currentLocation.lat.toFixed(6)}</div>
                <div>Lon: {currentLocation.lon.toFixed(6)}</div>
                <div>Accuracy: ±5m</div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white shadow-lg">
          <div className="p-6">
            {/* Current Status */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
              <div className="space-y-3">
                {currentLocation && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Speed</span>
                      </div>
                      <span className="font-medium">{currentLocation.speed} km/h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Location</span>
                      </div>
                      <span className="font-medium text-green-600">Live GPS</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Last Update</span>
                      </div>
                      <span className="font-medium text-green-600">
                        {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Navigation className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">GPS Signal</span>
                      </div>
                      <span className="font-medium text-green-600">Strong</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Route Stops */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Stops</h2>
              <div className="space-y-3">
                {routeStops.map((stop, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{stop.name}</span>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{stop.eta}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Arrival Alerts</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Enable Notifications</span>
                  <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      alertsEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                </div>
                
                {alertsEnabled && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Alert me when bus is:
                    </label>
                    <select
                      value={selectedAlert}
                      onChange={(e) => setSelectedAlert(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={5}>5 minutes away</option>
                      <option value={10}>10 minutes away</option>
                      <option value={15}>15 minutes away</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingPage;