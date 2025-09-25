import React, { useState, useEffect } from 'react';
import { Search, MapPin, Clock, History } from 'lucide-react';
import type { Route } from '../App';

interface SearchPageProps {
  onSearch: (from: string, to: string, results: Route[]) => void;
  backendUrl: string;
}

interface RecentSearch {
  from: string;
  to: string;
  timestamp: string;
}

const SearchPage: React.FC<SearchPageProps> = ({ onSearch, backendUrl }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [error, setError] = useState('');

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentBusSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading recent searches:', err);
      }
    }
  }, []);

  const saveRecentSearch = (from: string, to: string) => {
    const newSearch: RecentSearch = {
      from,
      to,
      timestamp: new Date().toISOString()
    };

    const updated = [newSearch, ...recentSearches.filter(
      search => !(search.from === from && search.to === to)
    )].slice(0, 5); // Keep only 5 recent searches

    setRecentSearches(updated);
    localStorage.setItem('recentBusSearches', JSON.stringify(updated));
  };

  const handleSearch = async () => {
    if (!from.trim() || !to.trim()) {
      setError('Please enter both departure and destination');
      return;
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      setError('Departure and destination cannot be the same');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${backendUrl}/api/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search buses');
      }

      const results: Route[] = await response.json();
      saveRecentSearch(from, to);
      onSearch(from, to, results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to search buses. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearchClick = (search: RecentSearch) => {
    setFrom(search.from);
    setTo(search.to);
  };

  const popularRoutes = [
    { from: 'City Center', to: 'Airport' },
    { from: 'Railway Station', to: 'Tech Park' },
    { from: 'University', to: 'Shopping Mall' },
    { from: 'Hospital', to: 'Main Market' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Bus
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            Track buses in real-time with GPS accuracy. Get live updates and ETAs.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            {/* From Input */}
            <div>
              <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                From (Departure)
              </label>
              <input
                type="text"
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Enter departure location..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                disabled={loading}
              />
            </div>

            {/* To Input */}
            <div>
              <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                To (Destination)
              </label>
              <input
                type="text"
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Enter destination..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Searching...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Search className="w-5 h-5 mr-2" />
                  Find Available Buses
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Recent Searches
            </h3>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200 border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-900">{search.from}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-gray-900">{search.to}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(search.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Routes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Popular Routes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {popularRoutes.map((route, index) => (
              <button
                key={index}
                onClick={() => {
                  setFrom(route.from);
                  setTo(route.to);
                }}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
              >
                <div className="text-gray-900 font-medium">{route.from}</div>
                <div className="text-gray-400 text-sm">to</div>
                <div className="text-gray-900 font-medium">{route.to}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;