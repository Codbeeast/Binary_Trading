"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import TradingChart from "@/components/TradingChart";
import TimeframeSelector from "@/components/TimeframeSelector";
import TimeSelector from "@/components/TimeSelector";
import RecentTrades from "@/components/RecentTrades";
import AssetSelector from "@/components/AssetSelector";
import { User, Menu, SlidersHorizontal, ArrowRightSquare, X } from "lucide-react";

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
  }, [selectedAsset]);

  return (
    // Use 100dvh for proper mobile viewport height
    <main className="h-[100dvh] bg-[#111318] text-[#E3E5E8] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-[#262932] bg-[#191B22] shadow-sm relative z-40">
        <div className="flex h-14 lg:h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
            {/* Mobile: Hamburger/Back */}
            <button
              onClick={() => setIsTradePanelOpen(!isTradePanelOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C303A]"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile: 'F' Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center text-black font-extrabold italic text-xl">
                F
              </div>
            </div>

            {/* Desktop: Asset & Timeframe Selectors */}
            <div className="hidden lg:flex items-center gap-6">
              <AssetSelector
                selectedAsset={selectedAsset}
                onSelect={(asset) => {
                  if (asset === selectedAsset) return;
                  setSelectedAsset(asset);
                  setCandlesMap({});
                  setTicks([]);
                }}
              />
              <div className="h-8 w-px bg-[#2C303A]" />
              <TimeframeSelector
                selected={selectedTimeframe}
                onChange={(tf) => {
                  if (tf === selectedTimeframe) return;
                  setSelectedTimeframe(tf);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4 shrink-0">

            {/* Balance Display */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] lg:text-[11px] font-medium text-gray-400 uppercase tracking-wider">Demo account</span>
              <span className="font-bold text-sm lg:text-lg tabular-nums tracking-tight text-white shadow-black drop-shadow-sm">
                ₹{Number(799900).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Wallet / Deposit Button */}
            <button className="h-9 w-9 lg:h-10 lg:w-auto lg:px-6 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-all active:scale-95 flex items-center justify-center">
              <span className="hidden lg:inline">Deposit</span>
              <span className="lg:hidden">
                {/* Wallet Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                </svg>
              </span>
            </button>

            {/* Profile Menu Trigger */}
            <button className="hidden lg:flex h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white items-center justify-center shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chart Section */}
        <section className="flex-1 relative bg-[#0F1115] flex flex-col min-w-0 pl-1">

          {/* Chart Container */}
          <div className="flex-1 relative overflow-hidden">
            <TradingChart
              candles={candles}
              currentPrice={currentPrice}
              timeframe={selectedTimeframe}
              direction={marketState.direction}
              activeTrades={activeTrades}
              onCandlePersist={handleCandlePersist}
              key={selectedAsset}
            />

            {/* Mobile Floating Overlays */}
            <div className="lg:hidden absolute top-4 left-4 z-10 max-w-[50%]">
              {/* Floating Asset Selector */}
              <div className="shadow-lg shadow-black/40 rounded-lg overflow-hidden">
                <AssetSelector
                  selectedAsset={selectedAsset}
                  onSelect={(asset) => {
                    if (asset === selectedAsset) return;
                    setSelectedAsset(asset);
                    setCandlesMap({});
                    setTicks([]);
                  }}
                />
              </div>
            </div>

            {/* Mobile Floating Timeframe (Top Right, fixed position) */}
            <div className="lg:hidden absolute top-0 right-4 z-20">
              {/* Position adjusted to avoid Y-axis labels. Assuming labels take ~50-60px */}
              <div className="bg-[#1C1F27]/90 backdrop-blur rounded-lg border border-white/10 shadow-lg p-1">
                <TimeframeSelector
                  selected={selectedTimeframe}
                  onChange={(tf) => {
                    if (tf === selectedTimeframe) return;
                    setSelectedTimeframe(tf);
                  }}
                />
              </div>
            </div>

            {/* Active Trade Notifications */}
            <div className="absolute top-16 left-4 right-4 flex flex-col gap-2 pointer-events-none z-0">
              {activeTrades.map(trade => {
                const timeLeft = Math.max(0, Math.ceil((trade.expiryTime - Date.now()) / 1000));
                if (timeLeft <= 0) return null;
                return (
                  <div key={trade.id} className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg backdrop-blur-md border border-white/10 shadow-lg w-fit pointer-events-auto
                          ${trade.direction === 'up' ? 'bg-[#064e3b]/80 border-l-4 border-l-emerald-500' : 'bg-[#4c0519]/80 border-l-4 border-l-rose-500'}
                        `}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">{trade.direction === 'up' ? 'BUY' : 'SELL'}</span>
                      <span className="text-sm font-bold text-white font-mono">{timeLeft}s</span>
                    </div>
                    <div className="flex flex-col items-end flex-1 pl-4">
                      <span className="text-[10px] text-white/70">Inv.</span>
                      <span className="text-xs font-semibold text-white">₹{trade.amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results Popup */}
            {tradeResults.map(result => (
              <div key={result.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
                <div className={`
                        flex flex-col items-center gap-2 px-8 py-6 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-2
                        ${result.result === 'PROFIT' ? 'bg-[#1C2A20] border-emerald-500' : 'bg-[#2A1C1C] border-rose-500'}
                      `}>
                  <div className="text-2xl font-black text-white tracking-widest">{result.result}</div>
                  <div className={`text-4xl font-bold ${result.result === 'PROFIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.result === 'PROFIT' ? `+₹${result.amount.toFixed(2)}` : '₹0.00'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Desktop Sidebar (Right) - Remains visible on LG */}
        <aside className="hidden lg:flex w-[280px] flex-col border-l border-[#262932] bg-[#16181F] px-4 py-4 gap-4 z-30">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>Amount</span>
                <span className="text-gray-500">INR</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input type="number" value={tradeAmount} onChange={handleAmountChange} className="w-full bg-[#16181F] text-white font-bold pl-7 pr-3 py-1.5 rounded-lg border border-[#2C303A] outline-none text-lg" />
                </div>
                <div className="flex gap-1">
                  <button onClick={decrementAmount} className="h-9 w-9 rounded-lg bg-[#262A34] text-gray-200 text-lg font-bold">-</button>
                  <button onClick={incrementAmount} className="h-9 w-9 rounded-lg bg-[#262A34] text-gray-200 text-lg font-bold">+</button>
                </div>
              </div>
              <TimeSelector duration={tradeDuration} onDurationChange={setTradeDuration} />
            </div>

            <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Earnings</span>
                <span className="text-emerald-400 font-semibold">+82%</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-gray-100">
                <span>Potential</span>
                <span>₹{(tradeAmount * 1.82).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button onClick={() => handleTrade('up')} className="bg-emerald-500 text-black py-3 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all">UP</button>
                <button onClick={() => handleTrade('down')} className="bg-rose-500 text-white py-3 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all">DOWN</button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-[#2C303A] bg-[#1C1F27]">
            <RecentTrades trades={tradeHistory} asset={selectedAsset} />
          </div>
        </aside>
      </div>

      {/* Mobile Backdrop */}
      {isTradePanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsTradePanelOpen(false)}
        />
      )}

      {/* Sidebar Controls - Drawer on mobile */}
      <aside className={`
          fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#16181F] border-r border-[#262932] flex flex-col px-4 py-4 gap-4 transition-transform duration-300 ease-in-out shadow-2xl
          lg:hidden
          ${isTradePanelOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Sidebar Header */}
        <div className="flex items-center justify-between lg:hidden mb-2">
          <span className="font-bold text-white">Menu</span>
          {
         isTradePanelOpen&& <button onClick={() => setIsTradePanelOpen(false)} className="p-1 rounded-md hover:bg-[#2C303A] text-gray-400">
            <X className="w-5 h-5" />
          </button>}
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 w-full overflow-hidden rounded-xl border border-[#2C303A] bg-[#1C1F27]">
          <RecentTrades trades={tradeHistory} asset={selectedAsset} />
        </div>
      </aside>

      {/* Mobile Fixed Bottom Panel */}
      <div className="lg:hidden bg-[#16181F] border-t border-[#262932] px-4 pt-3 pb-safe z-50">
        {/* Controls Row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Time Input */}
          <div className="flex-1 bg-[#23262F] rounded-xl p-2 flex flex-col items-center justify-center relative">
            <span className="text-[10px] text-gray-400 mb-1">Time</span>
            <div className="flex items-center justify-between w-full">
              <button onClick={() => setTradeDuration(prev => Math.max(5, prev - 5))} className="w-8 h-8 flex items-center justify-center bg-[#2C303A] rounded-lg text-gray-300 active:scale-90">-</button>
              <span className="font-bold text-white text-lg">{tradeDuration}s</span>
              <button onClick={() => setTradeDuration(prev => prev + 5)} className="w-8 h-8 flex items-center justify-center bg-[#2C303A] rounded-lg text-gray-300 active:scale-90">+</button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="flex-1 bg-[#23262F] rounded-xl p-2 flex flex-col items-center justify-center relative">
            <span className="text-[10px] text-gray-400 mb-1">Investment</span>
            <div className="flex items-center justify-between w-full">
              <button onClick={decrementAmount} className="w-8 h-8 flex items-center justify-center bg-[#2C303A] rounded-lg text-gray-300 active:scale-90">-</button>
              <span className="font-bold text-white text-lg">₹{tradeAmount}</span>
              <button onClick={incrementAmount} className="w-8 h-8 flex items-center justify-center bg-[#2C303A] rounded-lg text-gray-300 active:scale-90">+</button>
            </div>
          </div>
        </div>

        {/* Info Row (Earnings) */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Earnings:</span>
            <span className="text-emerald-400 font-bold text-sm">+82%</span>
            <span className="text-white font-bold ml-1">₹{(tradeAmount * 1.82).toFixed(2)}</span>
          </div>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex gap-3 h-14 mb-2">
          <button
            onClick={() => handleTrade('up')}
            className="flex-1 bg-[#2FB86F] hover:bg-[#25A160] text-white rounded-xl shadow-[0_4px_0_#1E834C] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            <ArrowRightSquare className="w-6 h-6 -rotate-90" />
          </button>
          <button
            onClick={() => handleTrade('down')}
            className="flex-1 bg-[#FF4757] hover:bg-[#E03A48] text-white rounded-xl shadow-[0_4px_0_#C52E3B] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
            <ArrowRightSquare className="w-6 h-6 rotate-90" />
          </button>
        </div>
      </div>

    </main>
  );
}