"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import TradingChart from "@/components/TradingChart";
import TimeframeSelector from "@/components/TimeframeSelector";
import TimeSelector from "@/components/TimeSelector";
import RecentTrades from "@/components/RecentTrades";
import AssetSelector from "@/components/AssetSelector";
import { User, Layers, ArrowRightSquare, ArrowLeftSquare, X, Menu, SlidersHorizontal } from "lucide-react";

export default function Home() {
  const [userId, setUserId] = useState(null);

  // UI State for Mobile
  const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem('binary_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('binary_user_id', id);
    }
    setUserId(id);
  }, []);
  const [socket, setSocket] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(100.00);
  const [marketState, setMarketState] = useState({
    direction: 'neutral',
    volatility: 1.0,
    tickSpeed: 300,
    isActive: true,
  });
  const [tradeDuration, setTradeDuration] = useState(60);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [selectedTimeframe, setSelectedTimeframe] = useState('5s');
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT');
  const selectedAssetRef = useRef('BTCUSDT');

  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  // Refactored: Store candles for ALL timeframes in a map
  // Structure: { '5s': [...], ... }
  const [candlesMap, setCandlesMap] = useState({});
  const [ticks, setTicks] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    ticksPerMinute: 0,
    priceChange24h: 0,
    high24h: 0,
    low24h: 0,
  });

  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeResults, setTradeResults] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);

  const tickCountRef = useRef(0);
  const priceHistoryRef = useRef([]);

  // Derived state: Get candles for the currently selected timeframe
  const candles = candlesMap[selectedTimeframe] || [];

  useEffect(() => {
    if (activeTrades.length === 0) return;

    const interval = setInterval(() => {
      // Check for expired trades using the current scope variables (fresh due to dependency array)
      const now = Date.now();
      const expired = activeTrades.filter(trade => now >= trade.expiryTime);

      if (expired.length === 0) return;

      // 1. Update Active Trades (Remove expired)
      setActiveTrades(prev => prev.filter(trade => !expired.find(e => e.id === trade.id)));

      // 2. Process Results (Side effects)
      expired.forEach(trade => {
        const exitPrice = currentPrice;
        const isProfit = (trade.direction === 'up' && exitPrice > trade.entryPrice) ||
          (trade.direction === 'down' && exitPrice < trade.entryPrice);

        const result = {
          id: trade.id,
          result: isProfit ? 'PROFIT' : 'LOSS',
          amount: isProfit ? trade.amount * 1.82 : 0,
          entryPrice: trade.entryPrice,
          exitPrice: exitPrice,
          direction: trade.direction
        };

        // Add to popup results (avoid duplicates)
        setTradeResults(prev => {
          if (prev.some(r => r.id === result.id)) return prev;
          return [...prev, result];
        });

        // Add to history (avoid duplicates)
        setTradeHistory(prev => {
          if (prev.some(item => item.id === trade.id)) return prev;
          return [{
            ...result,
            amount: trade.amount,
            payout: isProfit ? trade.amount * 1.82 : 0,
            duration: trade.duration,
            expiryTime: trade.expiryTime,
            asset: trade.asset || selectedAsset // Persist asset name
          }, ...prev];
        });

        // Schedule removal of popup
        setTimeout(() => {
          setTradeResults(prev => prev.filter(r => r.id !== trade.id));
        }, 4000);
      });

    }, 50);

    return () => clearInterval(interval);
  }, [activeTrades, currentPrice]);

  const handleTrade = (direction) => {
    const durationSeconds = tradeDuration;
    const newTrade = {
      id: Date.now() + Math.random(),
      direction,
      amount: tradeAmount,
      entryPrice: currentPrice,
      startTime: Date.now(),
      expiryTime: Date.now() + (durationSeconds * 1000),
      duration: durationSeconds,
      asset: selectedAsset // Store the asset symbol with the trade
    };

    setActiveTrades(prev => [...prev, newTrade]);
    // Close panel on mobile after trade if desired, or keep open. Keeping open for rapid trading.

    if (socket && isConnected) {
      socket.emit('place_trade', {
        direction,
        amount: tradeAmount,
        timeframe: selectedTimeframe,
        userId: userId, // Send persistent ID
        symbol: selectedAsset // FIX: Send the selected asset symbol
      });
    }
  };

  const handleAmountChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setTradeAmount(Math.max(0, val));
  };

  const incrementAmount = () => setTradeAmount(prev => prev + 100);
  const decrementAmount = () => setTradeAmount(prev => Math.max(0, prev - 100));

  // Handler for persisting candle data from chart
  const handleCandlePersist = (candleData) => {
    if (socket && isConnected) {
      socket.emit('persist_candle', {
        ...candleData,
        symbol: selectedAsset,
        timeframe: selectedTimeframe
      });
    }
  };

  // Initialize Socket.IO
  useEffect(() => {
    // Connect to specific namespace and room
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    // Reset candles map when asset changes to prevent showing wrong data
    setCandlesMap({});
    setTicks([]);

    socketInstance.on('connect', () => {
      console.log('Connected to socket', socketInstance.id);
      setIsConnected(true);

      // Subscribe to selected asset
      socketInstance.emit('subscribe', selectedAsset);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket');
      setIsConnected(false);
    });

    socketInstance.on('market_state', (state) => {
      if (state.symbol === selectedAsset) {
        setMarketState(state);
        setCurrentPrice(state.currentPrice);
      }
    });

    socketInstance.on('tick_update', (tick) => {
      if (tick.symbol === selectedAsset) {
        setTicks(prev => {
          const newTicks = [...prev, tick];
          if (newTicks.length > 200) return newTicks.slice(-200);
          return newTicks;
        });
        setCurrentPrice(tick.price);
        setMarketState(prev => ({ ...prev, currentPrice: tick.price, direction: tick.direction }));

        // Update stats
        tickCountRef.current++;
        priceHistoryRef.current.push(tick.price);
        if (priceHistoryRef.current.length > 1000) priceHistoryRef.current.shift();
      }
    });

    socketInstance.on('candle_update', (candle) => {
      if (candle.symbol === selectedAsset) {
        setCandlesMap(prevMap => {
          const tf = candle.timeframe;
          const prev = prevMap[tf] || [];

          if (prev.length === 0) return { ...prevMap, [tf]: [candle] };

          const last = prev[prev.length - 1];
          const lastTime = new Date(last.timestamp).getTime();
          const newTime = new Date(candle.timestamp).getTime();

          let newCandles;
          if (lastTime === newTime) {
            // Update existing candle
            newCandles = [...prev];
            newCandles[newCandles.length - 1] = candle;
          } else if (newTime > lastTime) {
            // Add new candle
            newCandles = [...prev.slice(-299), candle];
          } else {
            newCandles = prev;
          }

          return { ...prevMap, [tf]: newCandles };
        });
      }
    });

    socketInstance.on('candle_complete', (candle) => {
      if (candle.symbol === selectedAsset) {
        setCandlesMap(prevMap => {
          const tf = candle.timeframe;
          const prev = prevMap[tf] || [];

          if (prev.length === 0) return { ...prevMap, [tf]: [candle] };

          const last = prev[prev.length - 1];
          const lastTime = new Date(last.timestamp).getTime();
          const newTime = new Date(candle.timestamp).getTime();

          let newCandles;
          if (lastTime === newTime) {
            newCandles = [...prev];
            newCandles[newCandles.length - 1] = candle;
          } else if (newTime > lastTime) {
            newCandles = [...prev.slice(-299), candle];
          } else {
            newCandles = prev;
          }

          return { ...prevMap, [tf]: newCandles };
        });
      }
    });

    socketInstance.on('historical_candles', (data) => {
      if (data.symbol === selectedAsset) {
        setCandlesMap(prevMap => ({
          ...prevMap,
          [data.timeframe]: data.candles
        }));
      }
    });

    setSocket(socketInstance);

    // Stats interval
    const statsInterval = setInterval(() => {
      const ticksPerMinute = tickCountRef.current * 60;
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
      socketInstance.disconnect();
      clearInterval(statsInterval);
    };
  }, [selectedAsset]); // Removed selectedTimeframe from dependencies!

  return (
    <main className="min-h-screen bg-[#111318] text-[#E3E5E8]">
      <header className="border-b border-[#262932] bg-[#191B22] shadow-sm relative z-40">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">

            {/* Asset Selector */}
            <AssetSelector
              selectedAsset={selectedAsset}
              onSelect={(asset) => {
                if (asset === selectedAsset) return;
                setSelectedAsset(asset);
                setCandlesMap({}); // Clear candles on switch
                setTicks([]);
              }}
            />

            {/* Timeframe Selector */}
            <div className="h-8 w-px bg-[#2C303A] mx-2" /> {/* Divider */}
            <TimeframeSelector
              selected={selectedTimeframe}
              onChange={(tf) => {
                if (tf === selectedTimeframe) return;
                setSelectedTimeframe(tf);
                // setCandles([]); // REMOVED: No need to clear, we switch view instantly
              }}
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Balance Display */}
            <div className="flex flex-col items-end mr-2">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Demo account</span>
              <span className="font-bold text-lg tabular-nums tracking-tight text-white drop-shadow-sm">
                ₹{Number(799900).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Deposit Button */}
            <button className="h-10 px-6 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-all active:scale-95 flex items-center justify-center">
              Deposit
            </button>

            {/* Withdraw Button */}
            <button className="h-10 px-5 rounded-xl bg-[#262932] hover:bg-[#323642] text-white font-semibold text-sm border border-[#3E4250] transition-all active:scale-95 flex items-center justify-center">
              Withdraw
            </button>

            {/* Profile Menu Trigger */}
            <button className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full h-[calc(100vh-64px)] flex-col lg:flex-row gap-0">
        <section className="flex-1 flex flex-col min-w-0 bg-[#0F1115] min-h-[50vh] lg:min-h-0">
          <div className="flex-1 relative bg-[#16181D] overflow-hidden flex flex-col">
            {/* Mobile Trade Notifications (Top Left) */}
            <div className="absolute left-4 top-4 lg:top-20 z-20 flex flex-col gap-2 pointer-events-none">
              {activeTrades.map(trade => {
                const timeLeft = Math.max(0, Math.ceil((trade.expiryTime - Date.now()) / 1000));
                if (timeLeft <= 0) return null;
                return (
                  <div key={trade.id} className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg backdrop-blur-md border border-white/10 shadow-lg min-w-[120px] pointer-events-auto
                      ${trade.direction === 'up' ? 'bg-[#064e3b]/80 border-l-4 border-l-emerald-500' : 'bg-[#4c0519]/80 border-l-4 border-l-rose-500'}
                    `}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                        {trade.direction === 'up' ? 'BUY' : 'SELL'}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="flex flex-col items-end flex-1">
                      <span className="text-[10px] text-white/70">Inv.</span>
                      <span className="text-xs font-semibold text-white">₹{trade.amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col h-full">
              <div className="relative bg-[#16181D] overflow-hidden flex-1 w-full h-full">
                <TradingChart
                  candles={candles}
                  currentPrice={currentPrice}
                  timeframe={selectedTimeframe}
                  direction={marketState.direction}
                  activeTrades={activeTrades}
                  onCandlePersist={handleCandlePersist}
                  key={selectedAsset}
                />

                {tradeResults.map(result => (
                  <div key={result.id} className="absolute bottom-4 right-4 lg:bottom-20 lg:right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className={`
                        flex items-center gap-4 px-6 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border
                        ${result.result === 'PROFIT' ? 'bg-[#1C2A20] border-emerald-500/50' : 'bg-[#2A1C1C] border-rose-500/50'}
                      `}>
                      <div className={`
                          flex items-center justify-center w-10 h-10 rounded-full font-bold
                          ${result.result === 'PROFIT' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}
                        `}>
                        {result.result === 'PROFIT' ? '+$' : '-$'}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${result.result === 'PROFIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {result.result}
                        </span>
                        <span className="text-xl font-bold text-white">
                          {result.result === 'PROFIT' ? `+₹${result.amount.toFixed(2)}` : '₹0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Controls - Vertical on mobile, persistent */}
        <aside className="w-full lg:w-[260px] flex flex-col border-t lg:border-t-0 lg:border-l border-[#262932] bg-[#16181F] px-4 py-4 gap-4 text-[12px] h-auto lg:h-full lg:sticky lg:top-[64px] z-30">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>Amount</span>
                <span className="text-gray-500">INR</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={handleAmountChange}
                    className="w-full bg-[#16181F] text-white font-bold pl-7 pr-3 py-1.5 rounded-lg border border-[#2C303A] outline-none text-lg"
                  />
                </div>
                <div className="flex gap-1">
                  <button onClick={decrementAmount} className="h-9 w-9 rounded-lg bg-[#262A34] text-gray-200 text-lg font-bold">-</button>
                  <button onClick={incrementAmount} className="h-9 w-9 rounded-lg bg-[#262A34] text-gray-200 text-lg font-bold">+</button>
                </div>
              </div>
              <TimeSelector duration={tradeDuration} onDurationChange={setTradeDuration} />
            </div>

            <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Earnings</span>
                  <span className="text-emerald-400 font-semibold">+82%</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-gray-100 mt-1">
                  <span>Potential</span>
                  <span>₹{(tradeAmount * 1.82).toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => handleTrade('up')}
                  className="flex flex-col items-center justify-center rounded-lg bg-emerald-500 text-[#04110A] py-3 text-sm font-bold active:scale-95 transition-transform"
                >
                  <span>UP</span>
                </button>
                <button
                  onClick={() => handleTrade('down')}
                  className="flex flex-col items-center justify-center rounded-lg bg-rose-500 text-[#14030A] py-3 text-sm font-bold active:scale-95 transition-transform"
                >
                  <span>DOWN</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 min-h-0 w-full overflow-hidden rounded-xl border border-[#2C303A] bg-[#1C1F27]">
            <RecentTrades trades={tradeHistory} asset={selectedAsset} />
          </div>
        </aside>
      </div>
    </main>
  );
}