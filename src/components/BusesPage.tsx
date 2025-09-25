import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bus, Clock, Users, Zap, MapPin, Navigation } from 'lucide-react';
import type { Route, Bus as BusType } from '../App';

interface BusesPageProps {
  routes: Route[];
  onBusSelect: (bus: BusType) => void;
  onBackToSearch: () => void;
  backendUrl: string;
}

const BusesPage: React.FC<BusesPageProps> = ({ 
  routes, 
  onBusSelect, 
  onBackToSearch, 
  backendUrl 
}) => {
  const [updatedRoutes, setUpdatedRoutes] = useState<Route[]>(routes);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Update bus locations every 5 seconds
  useEffect(() => {
    const updateBusLocations = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/locations`);
        if (!response.ok) return;
        
        const locations = await response.json();
        
        setUpdatedRoutes(prevRoutes => {
          return prevRoutes.map(route => ({
            ...route,
            buses: route.buses.map(bus => {
              const updatedLocation = locations.find(
                (loc: any) => loc.device_id === bus.id
              );
              
              if (updatedLocation) {
                // Calculate ETA to final destination
                const finalStop = route.stops[route.stops.length - 1];
                const eta = calculateETA(
                  updatedLocation.lat,
                  updatedLocation.lon,
                  finalStop.lat,
                  finalStop.lon,
                  updatedLocation.speed
                );
                
                return {
                  ...bus,
                  location: updatedLocation,
                  eta
                };
              }
              
              return bus;
            })
          }));
        });
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error updating bus locations:', error);
      }
    };

    // Initial update
    updateBusLocations();

    // Set up interval for updates
    const interval = setInterval(updateBusLocations, 5000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const calculateETA = (lat1: number, lon1: number, lat2: number, lon2: number, speed: number) => {
    if (speed === 0) return 'Stopped';
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const etaHours = distance / speed;
    const etaMinutes = Math.round(etaHours * 60);
    
    return etaMinutes > 0 ? `${etaMinutes} min` : 'Arrived';
  };

  const getDriverName = (busId: string) => {
    const driverNames = {
      'BUS_101': 'Rajesh Kumar',
      'BUS_102': 'Amit Singh',
      'BUS_201': 'Priya Sharma',
      'BUS_202': 'Sunil Gupta'
    };
    return (driverNames as any)[busId] || 'Driver';
  };

  const getCapacity = (busId: string) => {
    return Math.floor(Math.random() * 20) + 30; // Random capacity between 30-50
  };

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
      default: return <Bus className="w-4 h-4" />;
    }
  };

  if (updatedRoutes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <button
              onClick={onBackToSearch}
              className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Search
            </button>
          </div>
          
          <div className="text-center py-16">
            <Bus className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Buses Found</h2>
            <p className="text-gray-600 mb-8">
              Sorry, we couldn't find any buses for your selected route.
            </p>
            <button
              onClick={onBackToSearch}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Different Route
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBackToSearch}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Search
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Buses</h1>
              <p className="text-gray-600">
                Found {updatedRoutes.reduce((acc, route) => acc + route.buses.length, 0)} buses 
                on {updatedRoutes.length} route{updatedRoutes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
              <p className="text-xs text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Routes */}
        <div className="space-y-8">
          {updatedRoutes.map((route) => (
            <div key={route.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Route Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <h2 className="text-xl font-semibold mb-2">{route.name}</h2>
                <div className="flex items-center space-x-4 text-blue-100">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{route.stops.length} stops</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bus className="w-4 h-4" />
                    <span className="text-sm">{route.buses.length} buses</span>
                  </div>
                </div>
              </div>

              {/* Route Stops */}
              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">Route:</span>
                  {route.stops.map((stop, index) => (
                    <React.Fragment key={index}>
                      <span className="text-gray-900">{stop.name}</span>
                      {index < route.stops.length - 1 && (
                        <span className="text-gray-400">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Buses */}
              <div className="p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {route.buses.map((bus) => (
                    <div
                      key={bus.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => onBusSelect(bus)}
                    >
                      {/* Bus Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {bus.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Driver: {getDriverName(bus.id)}
                          </p>
                        </div>
                        <div className="text-right">
                          {bus.location && (
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bus.location.status)}`}>
                              {getStatusIcon(bus.location.status)}
                              <span className="ml-1 capitalize">{bus.location.status}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bus Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">ETA:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {bus.eta || 'Calculating...'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Speed:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {bus.location?.speed ? `${bus.location.speed} km/h` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Capacity:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {getCapacity(bus.id)} seats
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">GPS:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {bus.location ? 'Live' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Track Button */}
                      <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium">
                        Track Live Location
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusesPage;