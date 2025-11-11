'use client';

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import TradingChart from '@/components/TradingChart';
import PriceDisplay from '@/components/PriceDisplay';
import TimeframeSelector from '@/components/TimeframeSelector';
import MarketStats from '@/components/MarketStats';
import { TrendingUp, Activity, BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  const [socket, setSocket] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(100.00);
  const [marketState, setMarketState] = useState({
    direction: 'neutral',
    volatility: 1.0,
    tickSpeed: 300,
    isActive: true,
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('5s');
  const [candles, setCandles] = useState([]);
  const [ticks, setTicks] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    ticksPerMinute: 0,
    priceChange24h: 0,
    high24h: 0,
    low24h: 0,
  });

  const tickCountRef = useRef(0);
  const priceHistoryRef = useRef([]);

  useEffect(() => {
    // Connect to Socket.IO server
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    // Receive market state
    newSocket.on('market_state', (state) => {
      console.log('📊 Market state:', state);
      setMarketState(state);
      setCurrentPrice(state.currentPrice);
    });

    // Receive historical candles
    newSocket.on('historical_candles', (data) => {
      if (data.timeframe === selectedTimeframe) {
        console.log(`📈 Received ${data.candles.length} historical candles for ${data.timeframe}`);
        setCandles(data.candles);
      }
    });

    // Receive tick updates
    newSocket.on('tick_update', (tick) => {
      setCurrentPrice(tick.price);
      setTicks(prev => [...prev.slice(-100), tick]);
      
      // Update price history for stats
      priceHistoryRef.current.push(tick.price);
      if (priceHistoryRef.current.length > 1000) {
        priceHistoryRef.current.shift();
      }
      
      // Count ticks for stats
      tickCountRef.current++;
    });

    // Receive candle updates
    newSocket.on('candle_update', (candle) => {
      if (candle.timeframe === selectedTimeframe) {
        setCandles(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = candle;
          } else {
            updated.push(candle);
          }
          return updated.slice(-150); // Keep last 150 candles
        });
      }
    });

    // Receive completed candles
    newSocket.on('candle_complete', (candle) => {
      if (candle.timeframe === selectedTimeframe) {
        setCandles(prev => [...prev, candle].slice(-150));
      }
    });

    setSocket(newSocket);

    // Calculate stats every second
    const statsInterval = setInterval(() => {
      const ticksPerMinute = tickCountRef.current * (60 / 1);
      tickCountRef.current = 0;

      const prices = priceHistoryRef.current;
      if (prices.length > 0) {
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = ((last - first) / first) * 100;

        setStats({
          ticksPerMinute: Math.round(ticksPerMinute),
          priceChange24h: change.toFixed(2),
          high24h: high.toFixed(2),
          low24h: low.toFixed(2),
        });
      }
    }, 1000);

    return () => {
      newSocket.close();
      clearInterval(statsInterval);
    };
  }, [selectedTimeframe]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-lg hover:border-brand-green/50 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-brand-green transition-colors" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-brand-green/20 to-brand-cyan/20 rounded-xl">
                <BarChart3 className="w-8 h-8 text-brand-green" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-green to-brand-cyan bg-clip-text text-transparent">
                  Live Trading Demo
                </h1>
                <p className="text-gray-400 text-sm">Real-time market simulation with admin controls</p>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-brand-green animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <MarketStats stats={stats} marketState={marketState} />
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-3 space-y-4">
            {/* Price Display */}
            <PriceDisplay 
              price={currentPrice} 
              direction={marketState.direction}
              change={stats.priceChange24h}
            />

            {/* Timeframe Selector */}
            <TimeframeSelector 
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
            />

            {/* Chart */}
            <div className="chart-container p-6">
              <TradingChart 
                candles={candles}
                currentPrice={currentPrice}
                timeframe={selectedTimeframe}
                direction={marketState.direction}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Market Direction */}
            <div className="chart-container p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Market Direction
              </h3>
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  marketState.direction === 'up' 
                    ? 'border-brand-green bg-brand-green/10' 
                    : 'border-gray-700 bg-gray-800/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Bullish</span>
                    {marketState.direction === 'up' && (
                      <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  marketState.direction === 'neutral' 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-700 bg-gray-800/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Neutral</span>
                    {marketState.direction === 'neutral' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  marketState.direction === 'down' 
                    ? 'border-red-500 bg-red-500/10' 
                    : 'border-gray-700 bg-gray-800/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Bearish</span>
                    {marketState.direction === 'down' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Volatility Info */}
            <div className="chart-container p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Market Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Volatility</span>
                  <span className="font-semibold">{marketState.volatility.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tick Speed</span>
                  <span className="font-semibold">{marketState.tickSpeed}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-semibold ${marketState.isActive ? 'text-brand-green' : 'text-red-400'}`}>
                    {marketState.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Link */}
            <Link 
              href="/admin"
              className="block w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-center font-semibold transition-all transform hover:scale-105"
            >
              🎮 Admin Control Panel
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
