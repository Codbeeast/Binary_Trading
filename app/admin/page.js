"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Users, Activity, TrendingUp, TrendingDown, Power, StopCircle, RefreshCw, DollarSign } from "lucide-react";

// Helper function to calculate percentages for the sentiment meter
const calculateSentiment = (buy, sell) => {
    const total = buy + sell;
    if (total === 0) {
        return { buyPercentage: 50, sellPercentage: 50 };
    }
    const buyPercentage = Math.round((buy / total) * 100);
    const sellPercentage = 100 - buyPercentage; // Ensures total is exactly 100
    return { buyPercentage, sellPercentage };
};

export default function AdminPage() {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [marketState, setMarketState] = useState({
        direction: 'neutral',
        volatility: 1.0,
        tickSpeed: 300,
        isActive: true,
    });
    const [stats, setStats] = useState({
        activeUsers: 0,
        totalTrades: 0,
        buyCount: 0,
        sellCount: 0,
        buyVolume: 0,
        sellVolume: 0,
    });

    // Calculate sentiment percentages
    const { buyPercentage, sellPercentage } = calculateSentiment(stats.buyCount, stats.sellCount);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('✅ Admin Connected');
            setIsConnected(true);
            newSocket.emit('request_stats'); // Initial fetch
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Admin Disconnected');
            setIsConnected(false);
        });

        newSocket.on('market_state', (state) => {
            setMarketState(state);
        });

        newSocket.on('stats_update', (newStats) => {
            console.log('Stats received:', newStats);
            setStats(newStats);
        });

        newSocket.on('candle_closed', (data) => {
            alert(`Candle closed for ${data.timeframe}: ${data.success ? 'Success' : 'Failed'}`);
        });

        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    const handleControlUpdate = (field, value) => {
        if (!socket) return;
        const updates = { [field]: value };
        // Update local state immediately for better UX (optional)
        setMarketState(prev => ({ ...prev, [field]: value }));

        // Send the update to the backend server
        socket.emit('control_update', updates);
    };

    // MODIFIED: Removed the confirmation prompt
    const handleForceCloseCandle = (timeframe) => {
        if (!socket) return;

        // Send the force close command without confirmation
        socket.emit('force_close_candle', { timeframe });
    }

    return (
        <main className="min-h-screen bg-[#0F1115] text-[#E3E5E8] p-6 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Real-time market control and monitoring</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {isConnected ? 'System Online' : 'System Offline'}
                </div>
            </header>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#16181D] border border-[#272A32] p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={20} /></div>
                        <span className="text-gray-400 text-sm">Active Users</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.activeUsers}</div>
                </div>
                <div className="bg-[#16181D] border border-[#272A32] p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Activity size={20} /></div>
                        <span className="text-gray-400 text-sm">Total Trades</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalTrades}</div>
                </div>
                <div className="bg-[#16181D] border border-[#272A32] p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><DollarSign size={20} /></div>
                        <span className="text-gray-400 text-sm">Volume (Buy)</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">₹{stats.buyVolume}</div>
                </div>
                <div className="bg-[#16181D] border border-[#272A32] p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400"><DollarSign size={20} /></div>
                        <span className="text-gray-400 text-sm">Volume (Sell)</span>
                    </div>
                    <div className="text-2xl font-bold text-rose-400">₹{stats.sellVolume}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Col: Live Sentiment & Controls */}
                <div className="space-y-6 mt-3">
                    {/* Sentiment Meter */}
                    <section className="bg-[#16181D] border border-[#272A32] rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white">Live Sentiment Analysis</h2>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-emerald-400 font-medium">Buy {buyPercentage}%</span>
                            <span className="text-rose-400 font-medium">Sell {sellPercentage}%</span>
                        </div>
                        <div className="h-4 w-full bg-[#1F2933] rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${buyPercentage}%` }}></div>
                            <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${sellPercentage}%` }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-[#1C1F27] p-4 rounded-lg border border-[#2C303A]">
                                <div className="text-sm text-gray-400 mb-1">Buy Orders</div>
                                <div className="text-xl font-bold text-emerald-400">{stats.buyCount}</div>
                            </div>
                            <div className="bg-[#1C1F27] p-4 rounded-lg border border-[#2C303A]">
                                <div className="text-sm text-gray-400 mb-1">Sell Orders</div>
                                <div className="text-xl font-bold text-rose-400">{stats.sellCount}</div>
                            </div>
                        </div>
                    </section>

                   
                </div>

                {/* Right Col: Market Configuration */}
                <div className="space-y-6">
                    <section className="bg-[#16181D] border border-[#272A32] rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-6 text-white flex items-center gap-2">
                            <RefreshCw size={18} className="text-indigo-400" />
                            Market Configuration
                        </h2>

                        <div className="space-y-6">
                            {/* Market Status */}
                            <div className="flex items-center justify-between p-4 bg-[#1C1F27] rounded-lg border border-[#2C303A]">
                                <div>
                                    <div className="font-medium text-white mb-1">Market Status</div>
                                    <div className="text-sm text-gray-400">Enable/Disable market data generation</div>
                                </div>
                                <button
                                    onClick={() => handleControlUpdate('isActive', !marketState.isActive)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${marketState.isActive ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all transform ${marketState.isActive ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Market Direction */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-300">Market Bias (Direction)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => handleControlUpdate('direction', 'up')}
                                        className={`py-2 rounded-md font-medium text-sm transition-all border ${marketState.direction === 'up' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[#1C1F27] text-gray-400 border-[#2C303A]'}`}
                                    >
                                        Bullish (Up)
                                    </button>
                                    <button
                                        onClick={() => handleControlUpdate('direction', 'neutral')}
                                        className={`py-2 rounded-md font-medium text-sm transition-all border ${marketState.direction === 'neutral' ? 'bg-blue-500 text-black border-blue-500' : 'bg-[#1C1F27] text-gray-400 border-[#2C303A]'}`}
                                    >
                                        Neutral
                                    </button>
                                    <button
                                        onClick={() => handleControlUpdate('direction', 'down')}
                                        className={`py-2 rounded-md font-medium text-sm transition-all border ${marketState.direction === 'down' ? 'bg-rose-500 text-black border-rose-500' : 'bg-[#1C1F27] text-gray-400 border-[#2C303A]'}`}
                                    >
                                        Bearish (Down)
                                    </button>
                                </div>
                            </div>

                            {/* Volatility */}
                            {/* <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-gray-300">Volatility Index</label>
                                    <span className="text-sm text-indigo-400 font-bold">{marketState.volatility}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5.0"
                                    step="0.1"
                                    value={marketState.volatility}
                                    onChange={(e) => handleControlUpdate('volatility', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-[#2C303A] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Stable</span>
                                    <span>Highly Volatile</span>
                                </div>
                            </div> */}

                            {/* Tick Speed
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-gray-300">Tick Speed (Update Rate)</label>
                                    <span className="text-sm text-indigo-400 font-bold">{marketState.tickSpeed}ms</span>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="1000"
                                    step="50"
                                    value={marketState.tickSpeed}
                                    onChange={(e) => handleControlUpdate('tickSpeed', parseInt(e.target.value))}
                                    className="w-full h-2 bg-[#2C303A] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Fast (100ms)</span>
                                    <span>Slow (1000ms)</span>
                                </div>
                            </div> */}
                        </div>
                    </section>
                </div>
                
            </div>
             {/* Critical Actions */}
                    <section className="bg-[#16181D] border border-[#272A32] rounded-xl mt-8 p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                            <StopCircle size={18} className="text-red-500" />
                            Emergency Controls
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleForceCloseCandle('5s')}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 py-3 rounded-lg font-semibold transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <span>Stop 5s Candle</span>
                                <span className="text-[10px] opacity-70">Force Close Immediately</span>
                            </button>
                            <button
                                onClick={() => handleForceCloseCandle('1m')}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 py-3 rounded-lg font-semibold transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <span>Stop 1m Candle</span>
                                <span className="text-[10px] opacity-70">Force Close Immediately</span>
                            </button>
                            {/* Add more timeframes as needed */}
                        </div>
                    </section>
        </main>
    );
}