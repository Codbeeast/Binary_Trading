'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Zap, 
  Play, 
  Pause,
  Lock,
  Unlock,
  Settings
} from 'lucide-react';

export default function AdminPanel() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [marketState, setMarketState] = useState({
    direction: 'neutral',
    volatility: 1.0,
    tickSpeed: 300,
    currentPrice: 100.00,
    isActive: true,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Connect to Socket.IO server
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Admin connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Admin disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('market_state', (state) => {
      console.log('📊 Market state received:', state);
      setMarketState(state);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple password check (in production, use proper authentication)
    if (password === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      alert('Invalid password');
    }
  };

  const handleControlUpdate = (updates) => {
    if (socket && isConnected) {
      socket.emit('control_update', updates);
      console.log('🎮 Sent control update:', updates);
    }
  };

  const setDirection = (direction) => {
    handleControlUpdate({ direction });
  };

  const setVolatility = (volatility) => {
    handleControlUpdate({ volatility: parseFloat(volatility) });
  };

  const setTickSpeed = (tickSpeed) => {
    handleControlUpdate({ tickSpeed: parseInt(tickSpeed) });
  };

  const toggleActive = () => {
    handleControlUpdate({ isActive: !marketState.isActive });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    if (socket) {
      socket.close();
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="chart-container p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-purple-500/20 rounded-2xl mb-4">
              <Lock className="w-12 h-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
            <p className="text-gray-400">Enter password to access control panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Login
            </button>

            <p className="text-sm text-gray-500 text-center">
              Default password: <code className="text-purple-400">admin123</code>
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl">
              <Settings className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Admin Control Panel
              </h1>
              <p className="text-gray-400 text-sm">Full market control and configuration</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="chart-container p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Current Price</span>
            </div>
            <div className="text-3xl font-bold font-mono">
              ${marketState.currentPrice.toFixed(2)}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="chart-container p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Direction</span>
            </div>
            <div className="text-2xl font-bold capitalize">
              {marketState.direction}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="chart-container p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Volatility</span>
            </div>
            <div className="text-3xl font-bold">
              {marketState.volatility.toFixed(1)}x
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="chart-container p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              {marketState.isActive ? (
                <Play className="w-5 h-5 text-green-400" />
              ) : (
                <Pause className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm text-gray-400">Status</span>
            </div>
            <div className={`text-2xl font-bold ${marketState.isActive ? 'text-green-400' : 'text-red-400'}`}>
              {marketState.isActive ? 'Active' : 'Paused'}
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Direction Control */}
          <div className="chart-container p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Market Direction
            </h2>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDirection('up')}
                className={`w-full p-6 rounded-xl font-semibold text-lg transition-all ${
                  marketState.direction === 'up'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg glow-green'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>📈 Bullish (UP)</span>
                  {marketState.direction === 'up' && (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  )}
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDirection('neutral')}
                className={`w-full p-6 rounded-xl font-semibold text-lg transition-all ${
                  marketState.direction === 'neutral'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg glow-blue'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>➡️ Neutral</span>
                  {marketState.direction === 'neutral' && (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  )}
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDirection('down')}
                className={`w-full p-6 rounded-xl font-semibold text-lg transition-all ${
                  marketState.direction === 'down'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg glow-red'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>📉 Bearish (DOWN)</span>
                  {marketState.direction === 'down' && (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  )}
                </div>
              </motion.button>
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="space-y-6">
            {/* Volatility Control */}
            <div className="chart-container p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Volatility
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Current:</span>
                  <span className="text-2xl font-bold">{marketState.volatility.toFixed(1)}x</span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={marketState.volatility}
                  onChange={(e) => setVolatility(e.target.value)}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />

                <div className="flex justify-between text-sm text-gray-500">
                  <span>0.1x (Calm)</span>
                  <span>5.0x (Extreme)</span>
                </div>
              </div>
            </div>

            {/* Tick Speed Control */}
            <div className="chart-container p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6" />
                Tick Speed
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Interval:</span>
                  <span className="text-2xl font-bold">{marketState.tickSpeed}ms</span>
                </div>

                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={marketState.tickSpeed}
                  onChange={(e) => setTickSpeed(e.target.value)}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex justify-between text-sm text-gray-500">
                  <span>100ms (Fast)</span>
                  <span>1000ms (Slow)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pause/Resume Control */}
        <div className="mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleActive}
            className={`w-full p-8 rounded-xl font-bold text-xl transition-all ${
              marketState.isActive
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {marketState.isActive ? (
                <>
                  <Pause className="w-8 h-8" />
                  <span>Pause Market</span>
                </>
              ) : (
                <>
                  <Play className="w-8 h-8" />
                  <span>Resume Market</span>
                </>
              )}
            </div>
          </motion.button>
        </div>

        {/* Back to Chart */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-block px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-all"
          >
            ← Back to Chart
          </a>
        </div>
      </div>
    </div>
  );
}
