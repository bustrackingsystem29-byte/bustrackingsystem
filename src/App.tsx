import React, { useState, useEffect } from 'react';
import { Search, MapPin, Clock, Users, Zap, Bus, Navigation } from 'lucide-react';
import SearchPage from './components/SearchPage';
import BusesPage from './components/BusesPage';
import LiveTrackingPage from './components/LiveTrackingPage';

export type Bus = {
  id: string;
  route: string;
  location?: {
    device_id: string;
    lat: number;
    lon: number;
    speed: number;
    route_id: string;
    updated: string;
    status: string;
  };
  eta?: string;
  driver?: string;
  capacity?: number;
};

export type Route = {
  id: string;
  name: string;
  buses: Bus[];
  stops: Array<{
    name: string;
    lat: number;
    lon: number;
  }>;
};

function App() {
  const [currentPage, setCurrentPage] = useState<'search' | 'buses' | 'tracking'>('search');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3000');

  // Detect backend URL on component mount
  useEffect(() => {
    // Try to detect if we're running on a different port or host
    const currentHost = window.location.hostname;
    const detectedUrl = currentHost === 'localhost' || currentHost === '127.0.0.1' 
      ? 'http://localhost:3000' 
      : `http://${currentHost}:3000`;
    
    setBackendUrl(detectedUrl);
    
    // Log frontend URLs
    const localIP = window.location.hostname;
    const currentPort = window.location.port;
    
    console.log('\n🎨 Smart Bus Tracking System - Frontend');
    console.log('=' .repeat(50));
    console.log(`✅ Frontend running at ${window.location.origin}`);
    if (localIP !== 'localhost' && localIP !== '127.0.0.1') {
      console.log(`🌍 Access from other devices: http://${localIP}:${currentPort || '80'}`);
    }
    console.log(`🔗 Backend API: ${detectedUrl}`);
    console.log('=' .repeat(50));
  }, []);

  const handleSearch = (from: string, to: string) => {
    // This will be handled by SearchPage component
  };

  const handleBusSelect = (bus: Bus) => {
    setSelectedBus(bus);
    setCurrentPage('tracking');
  };

  const handleBackToSearch = () => {
    setCurrentPage('search');
    setSelectedBus(null);
    setSearchResults([]);
  };

  const handleBackToBuses = () => {
    setCurrentPage('buses');
    setSelectedBus(null);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'search':
        return (
          <SearchPage 
            onSearch={(from, to, results) => {
              setSearchResults(results);
              setCurrentPage('buses');
            }}
            backendUrl={backendUrl}
          />
        );
      case 'buses':
        return (
          <BusesPage 
            routes={searchResults}
            onBusSelect={handleBusSelect}
            onBackToSearch={handleBackToSearch}
            backendUrl={backendUrl}
          />
        );
      case 'tracking':
        return selectedBus ? (
          <LiveTrackingPage 
            bus={selectedBus}
            onBack={handleBackToBuses}
            backendUrl={backendUrl}
          />
        ) : (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No bus selected</p>
              <button 
                onClick={handleBackToSearch}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Search
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smart Bus Tracker</h1>
                <p className="text-sm text-gray-500">Real-time GPS tracking</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <Navigation className="w-4 h-4" />
                <span>Hardware Connected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>GPS Accuracy: ±5m</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Updates: Every 5s</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Real-time Tracking</span>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Powered by ESP32 + GPS Hardware
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;