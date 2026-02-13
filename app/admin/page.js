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

import AssetSelector from "@/components/AssetSelector";

export default function AdminPage() {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize asset from LocalStorage if available
    const [selectedAsset, setSelectedAsset] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('adminSelectedAsset');
            return saved || 'BTCUSDT';
        }
        return 'BTCUSDT';
    });

    const [marketState, setMarketState] = useState({
        direction: 'neutral',
        volatility: 1.0,
        tickSpeed: 300,
        isActive: true,
        symbol: 'BTCUSDT'
    });

    // -- PERSISTENCE LOGIC START --
    const selectedAssetRef = useRef(selectedAsset);
    // Sync ref
    useEffect(() => { selectedAssetRef.current = selectedAsset; }, [selectedAsset]);

    // Active Trades List
    const [adminActiveTrades, setAdminActiveTrades] = useState([]);

    // Ref to track last user action time to prevent server overriding local optimistic updates
    const lastActionTime = useRef(0);

    // Load saved state for the SELECTED asset on mount or change
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Save selected asset to LS
        localStorage.setItem('adminSelectedAsset', selectedAsset);

        // Load settings for this specific asset
        const allStates = JSON.parse(localStorage.getItem('adminAssetStates') || '{}');
        const savedAssetData = allStates[selectedAsset];

        if (savedAssetData) {
            console.log(`📂 Loaded local settings for ${selectedAsset}:`, savedAssetData);
            setMarketState(prev => ({ ...prev, ...savedAssetData }));
            // Start buffer to prevent server override
            lastActionTime.current = Date.now();
        }
    }, [selectedAsset]);

    // Save state to LocalStorage (Dictionary) whenever it changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const allStates = JSON.parse(localStorage.getItem('adminAssetStates') || '{}');
        allStates[selectedAsset] = {
            direction: marketState.direction,
            isActive: marketState.isActive,
            volatility: marketState.volatility,
            tickSpeed: marketState.tickSpeed,
            symbol: selectedAsset
        };
        localStorage.setItem('adminAssetStates', JSON.stringify(allStates));
    }, [marketState, selectedAsset]);
    // ... existing stats state ...
    const [stats, setStats] = useState({
        activeUsers: 0,
        totalTrades: 0,
        buyCount: 0,
        sellCount: 0,
        activeBuyCount: 0,
        activeSellCount: 0,
        buyVolume: 0,
        sellVolume: 0,
    });

    // Calculate sentiment percentages based on REAL-TIME ACTIVE trades
    const { buyPercentage, sellPercentage } = calculateSentiment(stats.activeBuyCount, stats.activeSellCount);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('✅ Admin Connected');
            setIsConnected(true);
            newSocket.emit('request_stats', selectedAsset); // Fetch stats for THIS asset
            newSocket.emit('subscribe', selectedAsset); // Subscribe to selected asset to get its state

            // FIX: Join admin room AFTER connection is established
            newSocket.emit('join_admin');
            newSocket.emit('request_active_trades', selectedAsset);

            // RESTORE SERVER STATE from Local Storage (Client is Master)
            const allStates = JSON.parse(localStorage.getItem('adminAssetStates') || '{}');
            const savedAssetData = allStates[selectedAsset];

            if (savedAssetData) {
                console.log("🔄 Restoring Server State from Client:", savedAssetData);
                // Mark this as a user action
                lastActionTime.current = Date.now();

                newSocket.emit('control_update', {
                    symbol: selectedAsset,
                    direction: savedAssetData.direction,
                    isActive: savedAssetData.isActive,
                    volatility: savedAssetData.volatility,
                    tickSpeed: savedAssetData.tickSpeed
                });
            }
        });

        newSocket.on('disconnect', () => setIsConnected(false));

        // Admin: Active Trades Sync (listeners only - no emits before connect)
        newSocket.on('active_trades_list', (trades) => {
            setAdminActiveTrades(trades);
        });

        newSocket.on('admin_new_trade', (trade) => {
            // Only add if it belongs to currently viewed asset
            if (trade.symbol === selectedAssetRef.current) {
                setAdminActiveTrades(prev => [trade, ...prev]);
            }
        });

        newSocket.on('admin_trade_result', (result) => {
            console.log('🗑️ Trade Completed:', result.id, 'Removing from list...');
            // Remove trade from list when completed
            setAdminActiveTrades(prev => {
                const filtered = prev.filter(t => {
                    const tId = t._id || t.id;
                    const rId = result.id;
                    // Loose equality to catch string vs objectid
                    return tId != rId && t.clientTradeId != rId;
                });
                console.log(`Remaining active trades: ${filtered.length} (was ${prev.length})`);
                return filtered;
            });
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Admin Disconnected');
            setIsConnected(false);
        });

        newSocket.on('market_state', (state) => {
            if (state.symbol === selectedAsset) {
                // IGNORE server updates if user just clicked something (2s buffer)
                if (Date.now() - lastActionTime.current < 2000) {
                    return;
                }
                setMarketState(state);
            }
        });

        newSocket.on('stats_update', (newStats) => {
            // Only update if stats belong to the currently selected asset
            if (newStats.symbol === selectedAssetRef.current) {
                setStats(newStats);
            }
        });

        newSocket.on('candle_closed', (data) => {
            alert(`Candle closed for ${data.timeframe}: ${data.success ? 'Success' : 'Failed'}`);
        });

        // POLLING FALLBACK: Request fresh stats every 5 seconds
        // This guarantees real-time updates even if server push events are missed
        const statsInterval = setInterval(() => {
            if (newSocket.connected) {
                newSocket.emit('request_stats', selectedAssetRef.current);
            }
        }, 5000);

        setSocket(newSocket);

        return () => {
            clearInterval(statsInterval);
            newSocket.close();
        };
    }, [selectedAsset]); // Re-connect or re-subscribe when asset changes

    // Re-fetch trades when asset changes
    useEffect(() => {
        if (socket && isConnected) {
            socket.emit('request_active_trades', selectedAsset);
        }
    }, [selectedAsset, socket, isConnected]);

    // Refetch stats when asset changes (if socket exists)
    useEffect(() => {
        if (socket && isConnected) {
            socket.emit('request_stats', selectedAsset);
        }
    }, [selectedAsset, socket, isConnected]);

    const handleControlUpdate = (field, value) => {
        if (!socket) return;

        // Mark action time
        lastActionTime.current = Date.now();

        const updates = { [field]: value, symbol: selectedAsset };
        // Update local state immediately for better UX
        setMarketState(prev => ({ ...prev, [field]: value }));

        // Send the update to the backend server
        socket.emit('control_update', updates);
    };

    // MODIFIED: Removed the confirmation prompt
    const handleForceCloseCandle = (timeframe) => {
        if (!socket) return;
        socket.emit('force_close_candle', { timeframe, symbol: selectedAsset });
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

                <div className="flex items-center gap-4">
                    {/* Asset Selector for Admin */}
                    <div className="flex items-center gap-2 bg-[#16181D] px-3 py-1.5 rounded-lg border border-[#272A32]">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Target Asset:</span>
                        <AssetSelector
                            selectedAsset={selectedAsset}
                            onSelect={(asset) => setSelectedAsset(asset)}
                        />
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {isConnected ? 'System Online' : 'System Offline'}
                    </div>
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
                                <div className="text-sm text-gray-400 mb-1">Active Buy Orders</div>
                                <div className="text-xl font-bold text-emerald-400">{stats.activeBuyCount}</div>
                            </div>
                            <div className="bg-[#1C1F27] p-4 rounded-lg border border-[#2C303A]">
                                <div className="text-sm text-gray-400 mb-1">Active Sell Orders</div>
                                <div className="text-xl font-bold text-rose-400">{stats.activeSellCount}</div>
                            </div>
                        </div>
                    </section>


                </div>

                {/* Active Trades List */}
                <section className="bg-[#16181D] border border-[#272A32] rounded-xl p-6 mt-6">
                    <h2 className="text-lg font-semibold mb-4 text-white flex items-center justify-between">
                        <span>Active Trades ({selectedAsset})</span>
                        <span className="text-xs text-gray-400 bg-[#2C303A] px-2 py-1 rounded-md">{adminActiveTrades.length} Active</span>
                    </h2>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {adminActiveTrades.length === 0 ? (
                            <div className="text-center text-gray-500 py-4 text-sm">No active trades</div>
                        ) : (
                            adminActiveTrades.map(trade => (
                                <div key={trade._id || trade.id} className="flex items-center justify-between p-3 bg-[#1F2128] rounded-lg border border-[#2C303A]">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-mono">ID: {(trade.userId || '...').slice(-4)}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs font-bold uppercase ${trade.direction === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {trade.direction === 'up' ? 'CALL ↗' : 'PUT ↘'}
                                            </span>
                                            <span className="text-sm font-semibold text-white">₹{trade.amount}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-gray-500">Entry: {trade.entryPrice}</span>
                                        <span className="text-xs text-blue-400">{trade.duration}s</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

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