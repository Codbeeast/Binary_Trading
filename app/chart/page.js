"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { io } from "socket.io-client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import TradingChart from "@/components/TradingChart";
import TimeframeSelector from "@/components/TimeframeSelector";
import TimeSelector from "@/components/TimeSelector";
import RecentTrades from "@/components/RecentTrades";
import AssetSelector from "@/components/AssetSelector";
import ChartTypeModal from "@/components/ChartTypeModal"; // Import Modal
// import LiveLeaderboard from "@/components/tournaments/LiveLeaderboard"; // Removed
import UserMenu from "@/components/UserMenu";
import { User, Menu, SlidersHorizontal, ArrowRightSquare, X, CandlestickChart, Trophy, Plus, Minus, Loader2 } from "lucide-react"; // Import Icon

function ChartContent() {
  const { data: session, status } = useSession();
  const router = useRouter(); // Restore router
  const searchParams = useSearchParams();
  // const tournamentId = searchParams.get('tournamentId'); // Removed

  const [userId, setUserId] = useState(null); // Restore userId
  const [isLoading, setIsLoading] = useState(true); // Restore isLoading

  // Tournament State - ALWAYS FALSE for Main Chart
  const isTournamentMode = false;
  const tournamentId = null;
  const [tournamentDetails, setTournamentDetails] = useState(null); // Keep merely to avoid breaking legacy refs if any, or remove
  const [tournamentBalance, setTournamentBalance] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    }
  }, [session]);



  // Protect Route
  useEffect(() => {
    console.log("🔐 Auth Status:", status, "Session:", session);
    if (status === "unauthenticated") {
      console.log("🚨 Redirecting to login due to unauthenticated status");
      router.push("/login"); // Now router is defined
    } else if (status === "authenticated" && session?.user) {
      setUserId(session.user.id);
    }
  }, [status, session, router]);


  // UI State for Mobile
  const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);
  const [isChartTypeModalOpen, setIsChartTypeModalOpen] = useState(false); // Modal State
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Socket State
  const [socket, setSocket] = useState(null); // Restore socket state

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
  const [chartType, setChartType] = useState('candle'); // Chart Type State
  const [hoverDirection, setHoverDirection] = useState(null); // New State for Hover Effects

  // Expiry State (Absolute Time)
  const [expiryTimestamp, setExpiryTimestamp] = useState(null);

  // Initialize expiry and Auto-Rollover
  useEffect(() => {
    // Initial Set
    const setInitialExpiry = () => {
      const now = Date.now();
      // Calculate next full minute
      const nextMinute = Math.ceil(now / 60000) * 60000;
      // Calculate remaining time
      const diff = nextMinute - now;

      // FIX: If we are in the "Dead Zone" (< 30s), push to next minute loop.
      // Otherwise (>= 30s), stay in current minute loop.
      // This prevents "Jumping" to 80s when user enters at XX:20 (40s remaining).
      let target;
      if (diff < 30000) {
        target = nextMinute + 60000;
      } else {
        target = nextMinute;
      }

      setExpiryTimestamp(target);
      return target;
    };

    let currentExpiry = setInitialExpiry();

    // Auto-update Interval (Check every 1s)
    const interval = setInterval(() => {
      const now = Date.now();
      // Buffer: Update at 30s mark (Red Line = 30s remaining, Grey Line = 0s).
      // Since TradingChart.js now enforces a 30s difference (Grey = Red - 30s),
      // checking for < 30000 means we rollover EXACTLY when Grey hits 0.
      // Resetting adds 60s -> Red becomes 90s -> Grey becomes 60s.
      // This gives the perfect 60..0 countdown user requested.
      if (currentExpiry && (currentExpiry - now) < 30000) {
        // Increment by 1 minute
        currentExpiry += 60000;
        setExpiryTimestamp(currentExpiry);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const selectedAssetRef = useRef('BTCUSDT');

  // -- PERSISTENCE LOGIC START --

  // 1. Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAmount = localStorage.getItem('binary_trade_amount');
      const savedTimeframe = localStorage.getItem('binary_selected_timeframe');
      const savedAsset = localStorage.getItem('binary_selected_asset');
      const savedChartType = localStorage.getItem('binary_chart_type'); // Load

      if (savedAmount) setTradeAmount(Number(savedAmount));
      if (savedTimeframe) setSelectedTimeframe(savedTimeframe);
      if (savedAsset) setSelectedAsset(savedAsset);
      if (savedChartType) setChartType(savedChartType); // Set

      const savedDuration = localStorage.getItem('binary_trade_duration');
      if (savedDuration) setTradeDuration(Number(savedDuration));

      setIsSettingsLoaded(true); // Enable saving
    }
  }, []);

  // 2. Save settings to localStorage on change (ONLY if loaded)
  useEffect(() => {
    if (isSettingsLoaded) localStorage.setItem('binary_trade_amount', tradeAmount);
  }, [tradeAmount, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) localStorage.setItem('binary_selected_timeframe', selectedTimeframe);
  }, [selectedTimeframe, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) localStorage.setItem('binary_selected_asset', selectedAsset);
  }, [selectedAsset, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) localStorage.setItem('binary_trade_duration', tradeDuration);
  }, [tradeDuration, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) localStorage.setItem('binary_chart_type', chartType);
  }, [chartType, isSettingsLoaded]); // Persist

  // -- PERSISTENCE LOGIC END --

  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  // Refactored: Store candles for ALL timeframes in a map
  // Structure: { '5s': [...], ... }
  const [candlesMap, setCandlesMap] = useState({});
  const [ticks, setTicks] = useState([]);
  const [lastTickTimestamp, setLastTickTimestamp] = useState(null);
  const [latestTick, setLatestTick] = useState({ price: 0, timestamp: 0 }); // ATOMIC SYNC
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    ticksPerMinute: 0,
    priceChange24h: 0,
    high24h: 0,
    low24h: 0,
  });

  const [demoBalance, setDemoBalance] = useState(0); // Synced with DB

  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeResults, setTradeResults] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);

  const tickCountRef = useRef(0);
  const priceHistoryRef = useRef([]);
  const activeTradesRef = useRef([]); // Sync Ref for socket callbacks

  // Derived state: Get candles for the currently selected timeframe
  const candles = candlesMap[selectedTimeframe] || [];

  useEffect(() => {
    if (activeTrades.length === 0) return;

    const interval = setInterval(() => {
      // Just force a re-render for timers
      setActiveTrades(prev => [...prev]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync activeTradesRef for synchronous access
  useEffect(() => {
    activeTradesRef.current = activeTrades;
  }, [activeTrades]);

  const [isProcessingTrade, setIsProcessingTrade] = useState(false);

  const handleTrade = (direction) => {
    if (isProcessingTrade) return;

    // Balance Check
    const currentBalance = isTournamentMode ? tournamentBalance : demoBalance;
    if (currentBalance < tradeAmount) {
      alert("Insufficient balance!");
      return;
    }

    setIsProcessingTrade(true);

    // Re-enable after delay
    setTimeout(() => setIsProcessingTrade(false), 1000);

    // Use Absolute Expiry (Red Line)
    // GROUPING LOGIC: If there is an active trade for this asset, inherit its expiry.
    // This allows "Stacking" trades on the same candle.
    let targetExpiry = expiryTimestamp || (Date.now() + 60000);

    const activeAssetTrades = activeTrades.filter(t =>
      (t.symbol === selectedAsset || t.asset === selectedAsset) &&
      (new Date(t.expiryTime).getTime() > Date.now())
    );

    if (activeAssetTrades.length > 0) {
      // Find the trade that is "Holding" the chart view (Earliest valid Expiry)
      // Usually, we want to join the CURRENT cycle.
      const earliestTrade = activeAssetTrades.sort((a, b) =>
        new Date(a.expiryTime).getTime() - new Date(b.expiryTime).getTime()
      )[0];

      const existingExpiry = new Date(earliestTrade.expiryTime).getTime();

      // Only join if it's not about to expire immediately (e.g. > 5s left)
      // Otherwise, the user might accidentally bet on a 1s candle.
      if (existingExpiry - Date.now() > 5000) {
        targetExpiry = existingExpiry;
      }
    }

    const calculatedDuration = Math.round((targetExpiry - Date.now()) / 1000);

    const newTrade = {
      id: String(Date.now() + Math.random()),
      direction,
      amount: tradeAmount,
      entryPrice: currentPrice,
      startTime: Date.now(),
      expiryTime: targetExpiry,
      duration: calculatedDuration,
      asset: selectedAsset,
      symbol: selectedAsset, // Explicitly set symbol for consistent filtering
      tournamentId: isTournamentMode ? tournamentId : null
    };

    setActiveTrades(prev => [...prev, newTrade]);
    // Close panel on mobile after trade if desired, or keep open. Keeping open for rapid trading.

    if (socket && isConnected) {
      socket.emit('place_trade', {
        direction,
        amount: tradeAmount,
        timeframe: selectedTimeframe,
        userId: userId, // Send persistent ID
        symbol: selectedAsset, // FIX: Send the selected asset symbol
        clientTradeId: newTrade.id, // Send unique ID for deduplication
        duration: calculatedDuration, // Send calculated duration
        expiryTime: targetExpiry, // Send Explicit Expiry
        tournamentId: isTournamentMode ? tournamentId : null // Send Tournament ID
      });

      // Deduct from balance immediately (Optimistic Update)
      if (isTournamentMode) {
        setTournamentBalance(prev => Math.max(0, prev - tradeAmount));
      } else {
        setDemoBalance(prev => Math.max(0, prev - tradeAmount));
      }
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

  // Leaderboard State
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);




  // Initialize Socket.IO
  useEffect(() => {
    // Connect to specific namespace and room
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    // Reset candles map and trades when asset or mode changes
    setCandlesMap({});
    setTicks([]);
    setActiveTrades([]); // Clear previous mode's active trades
    setTradeHistory([]); // Clear previous mode's history

    socketInstance.on('connect', () => {
      // console.log('Connected to socket', socketInstance.id);
      setIsConnected(true);

      // Join user-specific room for multi-tab sync
      if (userId) {
        socketInstance.emit('join_user', userId);
      }

      // Join Tournament Room if in mode
      if (tournamentId) {
        socketInstance.emit('join_tournament', tournamentId);
        setIsLeaderboardOpen(true); // Auto-open leaderboard on entry? Maybe
      }

      // Subscribe to selected asset
      socketInstance.emit('subscribe', selectedAsset);
    });

    // Handle Leaderboard Updates
    socketInstance.on('leaderboard_update', (data) => {
      setLeaderboardData(data);
    });

    // Handle initial balance
    socketInstance.on('active_balance', (balance) => {
      // Only update demo balance from this event
      setDemoBalance(balance);
    });

    // Handle real-time balance updates
    socketInstance.on('balance_update', (newBalance) => {
      // Only update demo balance
      setDemoBalance(newBalance);
    });

    // Handle TOURNAMENT balance updates
    socketInstance.on('tournament_balance_update', (newBalance) => {
      setTournamentBalance(newBalance);
    });

    // Handle historical trades load - Split into Active and History
    socketInstance.on('user_trade_history', (history) => {
      console.log(`📜 Received ${history.length} trades from server`);
      const now = Date.now();
      const active = [];
      const completed = [];

      history.forEach(trade => {
        // Reconstruct expiration time
        const startTime = new Date(trade.timestamp).getTime();
        const duration = trade.duration || 60;
        const expiryTime = trade.expiryTime ? new Date(trade.expiryTime).getTime() : (startTime + (duration * 1000));

        // Filter by Tournament Mode
        // If in tournament mode, only show trades for this tournament
        // If in demo/regular mode, only show trades WITHOUT tournamentId
        // console.log("Filtering Trade:", trade.tournamentId, "Current Mode TournId:", tournamentId);

        const isCurrentTournamentTrade = isTournamentMode && trade.tournamentId === tournamentId;
        const isRegularTrade = !isTournamentMode && !trade.tournamentId;

        if (!isCurrentTournamentTrade && !isRegularTrade) {
          return; // Skip this trade as it doesn't belong to current view
        }

        // Check if trade is still valid and pending
        // RELAXED FILTER: Keep trades for 5s after expiry to allow UI animations/buffers to finish
        // to prevent premature chart jumping.
        if (trade.result === 'pending' && expiryTime > (now - 5000)) {
          active.push({

            id: trade.clientTradeId || trade._id,
            direction: trade.direction,
            amount: trade.amount,
            entryPrice: trade.entryPrice,
            startTime: startTime,
            expiryTime: expiryTime,
            duration: duration,
            asset: trade.symbol,
            tournamentId: trade.tournamentId,
            isSynced: true
          });
        } else {
          completed.push(trade);
        }
      });

      setTradeHistory(completed);

      // Merge restored active trades with current active trades (deduplicate)
      if (active.length > 0) {
        setActiveTrades(prev => {
          const currentIds = new Set(prev.map(t => t.id));
          const newActive = active.filter(t => !currentIds.has(t.id));
          return [...prev, ...newActive];
        });
      } else {
        // If no active trades from server, but we have some locally? 
        // Actually, we should probably trust the server or keep local ones if they are very recent.
        // For now, let's just add new ones.
      }
    });

    // Handle new trade broadcast from other tabs
    socketInstance.on('new_trade', (trade) => {
      // If the trade already exists (added optimistically), skip or update it
      // We use clientTradeId for deduplication if provided, or fallback to database ID match
      setActiveTrades(prev => {
        const exists = prev.some(t =>
          (trade.clientTradeId && t.id === trade.clientTradeId) || t.id === trade._id
        );

        if (exists) return prev;

        // Otherwise, add this new trade (it came from another tab)
        // Need to ensure format matches `activeTrades` structure
        return [...prev, {
          id: trade.clientTradeId || trade._id, // Use persistent ID
          direction: trade.direction,
          amount: trade.amount,
          entryPrice: trade.entryPrice,
          startTime: new Date(trade.timestamp).getTime(),
          expiryTime: new Date(trade.timestamp).getTime() + ((trade.duration || 60) * 1000), // Reconstruct expiry
          duration: trade.duration || 60,
          asset: trade.symbol,
          symbol: trade.symbol, // Fix: Ensure symbol is set from backend
          tournamentId: trade.tournamentId,
          isSynced: true // Debug flag
        }];
      });
    });

    // Handle Server-Side Trade Results (Authoritative)
    socketInstance.on('trade_result', (data) => {
      // 1. Find the active trade to get its original duration/timeframe
      // Use REF to get synchronous state properly
      const match = activeTradesRef.current.find(t => String(t.id) === String(data.clientTradeId) || String(t.id) === String(data.id));
      const foundDuration = match ? match.duration : null;
      let tradeDuration = foundDuration || data.duration || 60; // Fallback

      // Remove from Active Trades
      setActiveTrades(prev => prev.filter(t => String(t.id) !== String(data.clientTradeId) && String(t.id) !== String(data.id)));

      // 2. Add to Results (Popup)
      const resultItem = {
        id: data.id || Date.now(),
        result: data.result, // 'PROFIT' or 'LOSS'
        amount: data.amount,
        investment: data.investment,
        asset: data.symbol, // Use server symbol
        symbol: data.symbol,
        entryPrice: data.entryPrice,
        duration: tradeDuration,
        // ... other fields if needed
      };

      setTradeResults(prev => {
        if (prev.some(r => r.id === resultItem.id)) return prev;
        return [...prev, resultItem];
      });

      // 3. Add to History
      setTradeHistory(prev => {
        if (prev.some(item => item.id === resultItem.id)) return prev;
        return [resultItem, ...prev];
      });

      // Schedule popup removal
      setTimeout(() => {
        setTradeResults(prev => prev.filter(r => r.id !== resultItem.id));
      }, 4000);
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
        setLastTickTimestamp(tick.timestamp); // Capture timestamp
        setLatestTick({ price: tick.price, timestamp: tick.timestamp }); // Atomic sync
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
  }, [selectedAsset, userId, isTournamentMode, tournamentId]); // Re-run if mode changes to filter trades

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#111318] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

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
              className="lg:hidden landscape:hidden p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C303A]"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile: Logo */}
            <div className="lg:hidden flex items-center gap-2 landscape:ml-12">
              <Link href="/" className="flex items-center justify-center mt-1 ml-1 hover:brightness-110 active:scale-95 transition-all cursor-pointer">
                <Image
                  src="/iconbarlogo.png"
                  alt="Finexa"
                  width={100}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Desktop: Asset & Timeframe Selectors */}
            <div className="hidden lg:flex landscape:flex landscape:ml-4  lg:ml-0 items-center gap-6">
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

              <div className="h-8 w-px bg-[#2C303A]" />
              {/* Chart Type Trigger */}
              <button
                onClick={() => setIsChartTypeModalOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C303A] transition-colors"
                title="Chart Type"
              >
                <CandlestickChart size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            {/* ... balance ... */}
            <div className="flex flex-col items-end">
              <span className={`text-[10px] lg:text-[11px] font-medium uppercase tracking-wider ${isTournamentMode ? 'text-emerald-400' : 'text-gray-400'}`}>
                {isTournamentMode ? '🏆 Tournament Account' : 'Demo account'}
              </span>
              <span className="font-bold text-sm lg:text-lg tabular-nums tracking-tight text-white shadow-black drop-shadow-sm">
                ₹{(isTournamentMode ? tournamentBalance : demoBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Wallet / Deposit Button */}
            {!isTournamentMode && (
              <button className="h-9 w-9 lg:h-10 lg:w-auto lg:px-6 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-all active:scale-95 flex items-center justify-center">
                <span className="hidden lg:inline">Deposit</span>
                <span className="lg:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                  </svg>
                </span>
              </button>
            )}

            {/* Exit Tournament Button (Only if in Tournament Mode) */}
            {/* Exit Tournament Button (Only if in Tournament Mode) */}
            {isTournamentMode && (
              <button
                onClick={() => {
                  // Clear active session and exit
                  localStorage.removeItem('activeTournamentId');
                  router.push('/tournaments');
                }}
                className="h-9 lg:h-10 px-4 rounded-xl bg-[#2C303A] hover:bg-[#3C414D] text-white font-bold text-xs lg:text-sm flex items-center gap-2 transition-all"
              >
                <span className="hidden lg:inline">Exit Tournament</span>
                <span className="lg:hidden">Exit</span>
              </button>
            )}

            {/* User Menu */}
            <UserMenu user={session?.user} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <ChartTypeModal
          isOpen={isChartTypeModalOpen}
          onClose={() => setIsChartTypeModalOpen(false)}
          selectedType={chartType}
          onSelect={setChartType}
        />

        {/* Live Leaderboard Overlay */}
        {isTournamentMode && (
          <LiveLeaderboard
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            leaderboard={leaderboardData}
            currentUserId={userId}
          />
        )}

        {/* Chart Section */}
        <section className="flex-1 relative bg-[#0F1115] flex flex-col min-w-0 pl-1">

          {/* Chart Container */}
          <div className="flex-1 relative overflow-hidden">

            {/* Tournament Leaderboard Toggle (Desktop/Mobile) */}
            {isTournamentMode && (
              <button
                onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
                className="absolute top-4 right-16 z-30 bg-[#1A1D24]/80 backdrop-blur border border-[#FCC419]/30 text-[#FCC419] p-2 rounded-xl hover:bg-[#FCC419]/10 transition-all shadow-lg active:scale-95 animate-in fade-in slide-in-from-top-4 duration-500"
                title="Live Leaderboard"
              >
                <Trophy className="w-5 h-5" />
              </button>
            )}

            <TradingChart
              candles={candles}
              currentPrice={currentPrice}
              lastTickTimestamp={lastTickTimestamp}
              latestTick={latestTick}
              timeframe={selectedTimeframe}
              direction={marketState.direction}
              // ISOLATION FIX: Filter Active Trades at PARENT level.
              // This guarantees the chart ONLY sees trades for the selected asset.
              activeTrades={activeTrades.filter(t => {
                const s1 = String(t.symbol || t.asset || "").trim().toUpperCase();
                const s2 = String(selectedAsset || "").trim().toUpperCase();
                return s1 === s2;
              })}
              onCandlePersist={handleCandlePersist}
              key={selectedAsset}
              chartType={chartType}
              hoverDirection={hoverDirection}
              userSelectedExpiry={expiryTimestamp} // Pass controlled expiry
              userSelectedAsset={selectedAsset}
            />

            {/* Mobile Floating Overlays */}
            <div className="lg:hidden landscape:hidden absolute top-2 left-2 z-10 max-w-[50%]">
              {/* Floating Asset Selector */}
              <div className="shadow-lg shadow-black/40 rounded-lg">
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
            {/* Mobile Floating Timeframe (Top Right, fixed position) */}
            <div className="lg:hidden landscape:hidden absolute top-0 right-4 z-20 flex items-center gap-2">

              {/* Chart Type Trigger (Mobile) */}
              <div className="bg-[#1C1F27]/90 backdrop-blur rounded-lg border border-white/10 shadow-lg p-1">
                <button
                  onClick={() => setIsChartTypeModalOpen(true)}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-[#2C303A]"
                >
                  <CandlestickChart size={16} />
                </button>
              </div>

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
              {activeTrades.filter(trade => (trade.asset || trade.symbol) === selectedAsset).map(trade => {
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
            {tradeResults.filter(result => (result.asset || result.symbol) === selectedAsset).map(result => (
              <div key={result.id} className="absolute bottom-12 right-16 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className={`
                        flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl shadow-2xl shadow-black/60 border border-white/10
                        ${result.result === 'PROFIT' ? 'bg-[#1C2A20] border-emerald-500/50' : 'bg-[#2A1C1C] border-rose-500/50'}
                      `}>
                  <div className="text-sm font-black text-white/90 tracking-widest uppercase">{result.result}</div>
                  <div className={`text-xl font-bold ${result.result === 'PROFIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.result === 'PROFIT' ? `+₹${result.amount.toFixed(2)}` : `-₹${(result.investment || 0).toFixed(2)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Desktop Sidebar (Right) - Remains visible on LG */}
        <aside className="hidden lg:flex landscape:flex w-[280px] flex-col border-l border-[#262932] bg-[#16181F] px-4 py-4 gap-4 z-30 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 landscape:py-1 space-y-3 landscape:space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1 landscape:mb-0">
                <span>Amount</span>
                <span className="text-gray-500">INR</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input type="number" value={tradeAmount} onChange={handleAmountChange} className="w-full bg-[#16181F] text-white font-bold pl-7 pr-3 py-1.5 landscape:py-0.5 rounded-lg border border-[#2C303A] outline-none text-lg landscape:text-sm" />
                </div>
                <div className="flex gap-1">
                  <button onClick={decrementAmount} className="h-9 w-9 landscape:h-7 landscape:w-7 rounded-lg bg-[#262A34] text-gray-200 text-lg landscape:text-sm font-bold">-</button>
                  <button onClick={incrementAmount} className="h-9 w-9 landscape:h-7 landscape:w-7 rounded-lg bg-[#262A34] text-gray-200 text-lg landscape:text-sm font-bold">+</button>
                </div>
              </div>
              <TimeSelector
                duration={tradeDuration}
                onDurationChange={setTradeDuration}
                expiryTimestamp={expiryTimestamp}
                onExpiryChange={setExpiryTimestamp}
              />
            </div>

            <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 landscape:py-1 space-y-3 landscape:space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Earnings</span>
                <span className="text-emerald-400 font-semibold">+82%</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-gray-100">
                <span>Potential</span>
                <span>₹{(tradeAmount * 1.82).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 landscape:gap-1 mt-2 landscape:mt-1">
                <button
                  onClick={() => handleTrade('up')}
                  onMouseEnter={() => setHoverDirection('up')}
                  onMouseLeave={() => setHoverDirection(null)}
                  className="bg-emerald-500 text-black py-3 landscape:py-1 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all"
                >
                  UP
                </button>
                <button
                  onClick={() => handleTrade('down')}
                  onMouseEnter={() => setHoverDirection('down')}
                  onMouseLeave={() => setHoverDirection(null)}
                  className="bg-rose-500 text-white py-3 landscape:py-1 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all"
                >
                  DOWN
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 landscape:min-h-[300px] overflow-y-auto overflow-x-hidden rounded-xl border border-[#2C303A] bg-[#1C1F27]">
            <RecentTrades trades={tradeHistory} asset={selectedAsset} />
          </div>
        </aside>
      </div>

      {/* Mobile Backdrop */}
      {
        isTradePanelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] lg:hidden landscape:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsTradePanelOpen(false)}
          />
        )
      }

      {/* Sidebar Controls - Drawer on mobile */}
      <aside className={`
          fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#16181F] border-r border-[#262932] flex flex-col px-4 py-4 gap-4 transition-transform duration-300 ease-in-out shadow-2xl
          lg:hidden landscape:hidden
          ${isTradePanelOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Sidebar Header */}
        <div className="flex items-center justify-between lg:hidden mb-2">
          <span className="font-bold text-white">Menu</span>
          {
            isTradePanelOpen && <button onClick={() => setIsTradePanelOpen(false)} className="p-1 rounded-md hover:bg-[#2C303A] text-gray-400">
              <X className="w-5 h-5" />
            </button>}
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 w-full overflow-hidden rounded-xl border border-[#2C303A] bg-[#1C1F27]">
          <RecentTrades trades={tradeHistory} asset={selectedAsset} />
        </div>
      </aside>

      {/* Mobile Fixed Bottom Panel */}
      <div className="lg:hidden landscape:hidden bg-[#16181F] border-t border-[#262932] px-4 pt-3 pb-safe z-50">
        {/* Controls Row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Time Input */}
          {/* Time Input - Replaced with Shared TimeSelector logic */}
          <div className="flex-1 bg-[#23262F] rounded-xl p-0.5 flex flex-col items-center justify-center relative">
            <TimeSelector
              duration={tradeDuration}
              onDurationChange={setTradeDuration}
              expiryTimestamp={expiryTimestamp}
              onExpiryChange={setExpiryTimestamp}
            />
          </div>

          {/* Amount Input */}
          {/* Amount Input - Styled to match TimeSelector */}
          <div className="flex-1">
            <div className="flex flex-col gap-1 p-3 border border-[#2C303A] rounded-xl bg-[#1C1F27]">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-medium">Investment</span>
                <span className="text-[10px] text-gray-500 font-bold">INR</span>
              </div>
              <div className="flex items-center justify-between mt-1 gap-2">
                <button onClick={decrementAmount} className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#2A2E39] text-gray-300 hover:bg-[#323642] transition-colors">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center text-lg font-bold text-white tracking-wide font-mono">₹{tradeAmount}</span>
                <button onClick={incrementAmount} className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#2A2E39] text-gray-300 hover:bg-[#323642] transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
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

    </main >
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#16181F]">
        <Loader2 className="h-10 w-10 animate-spin text-[#FCC419]" />
      </div>
    }>
      <ChartContent />
    </Suspense>
  );
}