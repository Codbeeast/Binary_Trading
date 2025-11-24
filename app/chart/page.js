"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import TradingChart from "@/components/TradingChart";
import PriceDisplay from "@/components/PriceDisplay";
import TimeframeSelector from "@/components/TimeframeSelector";
import MarketStats from "@/components/MarketStats";
import { TrendingUp, Activity, BarChart3, User, Clock, Settings, BarChart3 as IndicatorIcon, ZoomIn, ZoomOut } from "lucide-react";

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(100.00);
  const [marketState, setMarketState] = useState({
    direction: 'neutral',
    volatility: 1.0,
    tickSpeed: 300,
    isActive: true,
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('1s');
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
      console.log(`📈 Historical candles received for ${data.timeframe}:`, data.candles.length, 'candles');
      if (data.timeframe === selectedTimeframe) {
        console.log(`✅ Setting ${data.candles.length} historical candles for ${data.timeframe}`);
        if (data.candles.length > 0) {
          setCandles(data.candles);
        } else {
          console.log('⚠️  No historical candles available for', data.timeframe);
        }
      } else {
        console.log(`⏭️  Skipping historical candles for ${data.timeframe} (selected: ${selectedTimeframe})`);
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
      console.log('📊 Candle update received:', candle);
      if (candle.timeframe === selectedTimeframe) {
        setCandles(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = candle;
          } else {
            updated.push(candle);
          }
          console.log('📊 Updated candles array:', updated.length, 'candles');
          return updated.slice(-150); // Keep last 150 candles
        });
      }
    });

    // Receive completed candles
    newSocket.on('candle_complete', (candle) => {
      console.log('✅ Candle complete received:', candle);
      console.log('🔍 Candle timeframe:', candle.timeframe, '| Selected:', selectedTimeframe, '| Match:', candle.timeframe === selectedTimeframe);
      if (candle.timeframe === selectedTimeframe) {
        setCandles(prev => {
          const newCandles = [...prev, candle].slice(-150);
          console.log('✅ Added completed candle. Total:', newCandles.length);
          return newCandles;
        });
      } else {
        console.log('⏭️  Skipping candle - timeframe mismatch');
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
    <main className="min-h-screen bg-[#111318] text-[#E3E5E8]">
      {/* Top header bar */}
      <header className="border-b border-[#262932] bg-[#191B22]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-3 gap-3">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FACC15] text-[#111827] font-black text-xl">
                F
              </div>
              <span className="text-[18px] font-semibold tracking-tight">Finexa</span>
            </div>
          </div>

          {/* Center: symbol pill */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#20232B] px-3 py-1.5 text-xs border border-white/5">
              <span className="text-[11px] uppercase tracking-[0.16em] text-gray-400">Crypto IDX</span>
              <span className="text-[12px] font-semibold text-gray-100">82%</span>
            </div>
          </div>

          {/* Right: account + buttons */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="hidden md:flex flex-col items-end leading-tight mr-1">
              <span className="text-gray-400">Demo account</span>
              <span className="font-semibold text-gray-100">₹799,900.00</span>
            </div>
            <button className="rounded-md bg-[#FACC15] px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-md">
              Deposit
            </button>
            <button className="rounded-md bg-[#2D313A] px-3 py-1.5 text-xs font-semibold text-gray-100 border border-white/10">
              Withdraw
            </button>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-[0_0_18px_rgba(37,99,235,0.65)]">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout: left nav / center chart / right panel */}
      <div className="mx-auto flex max-w-[1920px] gap-0">
        {/* Left vertical nav */}
        <aside className="hidden md:flex w-[72px] flex-col items-center border-r border-[#262932] bg-[#16181F] py-4 gap-4 text-[11px]">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-[#FACC15] flex items-center justify-center text-[#111827] text-sm font-bold">
              P
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-2 text-gray-400">
            <button className="flex flex-col items-center gap-1">
              <span className="h-8 w-8 rounded-full bg-[#262932]" />
              <span className="text-[10px]">Trades</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <span className="h-8 w-8 rounded-full bg-[#262932]" />
              <span className="text-[10px]">Tournaments</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <span className="h-8 w-8 rounded-full bg-[#262932]" />
              <span className="text-[10px]">Market</span>
            </button>
          </div>
        </aside>

        {/* Center chart column */}
        <section className="flex-1 px-2 sm:px-4 py-3">
          {/* Time row above chart */}
          <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400">
            <span>18:13:15 GMT+5</span>
            <span className="hidden sm:inline">Crypto IDX 82%</span>
          </div>

          <div className="relative rounded-xl bg-[#16181D] border border-[#272A32] shadow-[0_20px_40px_rgba(0,0,0,0.65)] overflow-hidden px-2 sm:px-4 pt-3 pb-16">
            {/* Top-left symbol panel */}
            <div className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#20232B] to-[#1B1E24] border border-white/5 px-3 py-2 text-xs">
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-[0.16em] text-gray-400">Crypto IDX</span>
                <span className="text-[13px] font-semibold text-[#F9FAFB]">BTC / USDT</span>
              </div>
              <div className="ml-2 px-2 py-1 rounded-md bg-[#111827] text-[11px] font-semibold text-emerald-400">
                82%
              </div>
            </div>

            {/* Right-side circular timer elements */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-20">
              {/* Grey circle */}
              <div className="relative flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-[#4B4F59] text-xs font-medium text-gray-200">
                  -:31
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Time remaining
                </span>
              </div>

              {/* Red filled circle */}
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#D95252] text-xs font-medium text-white border-2 border-dotted border-red-100 shadow-[0_0_22px_rgba(217,82,82,0.8)]">
                00:01
              </div>
            </div>

            {/* Chart + overlay */}
            <div className="flex flex-col gap-2">
              {/* Actual chart area, large like brokers */}
              <div className="relative rounded-lg bg-[#14171A] border border-[#20232B] overflow-hidden h-[600px] md:h-[700px]">
                {/* Dashed horizontal reference line with label */}
                <div className="pointer-events-none absolute inset-x-16 md:inset-x-24 top-1/3 flex items-center">
                  <div className="w-full border-t border-dashed border-[#777777]/60" />
                  <div className="ml-2 px-2 py-1 rounded-md bg-[#2C2F36] text-[11px] text-gray-100">
                    00:01
                  </div>
                </div>

                {/* Vertical future marker line aligned with timer */}
                <div className="pointer-events-none absolute right-[5.2rem] top-3 bottom-3 border-r border-[#D95252]" />

                <TradingChart
                  candles={candles}
                  currentPrice={currentPrice}
                  timeframe={selectedTimeframe}
                  direction={marketState.direction}
                />

                {/* Bottom-left floating yellow banner */}
                <div className="pointer-events-none absolute left-4 bottom-4 max-w-xs rounded-2xl bg-[#FFD335] text-[#1A1D20] shadow-[0_14px_30px_rgba(0,0,0,0.45)] px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-xs font-bold">
                    !
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-semibold leading-tight">
                      Volatility spike expected in 00:30
                    </p>
                    <p className="text-[11px] text-black/70 leading-snug">
                      Consider adjusting your stake or expiry to manage risk.
                    </p>
                  </div>
                </div>

                {/* Zoom controls bottom-center */}
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center">
                  <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-[#111318]/95 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-white/5">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181B20] text-gray-200 shadow-[0_0_12px_rgba(0,0,0,0.7)]"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-[11px] text-gray-400 tracking-wide">Zoom</span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181B20] text-gray-200 shadow-[0_0_12px_rgba(0,0,0,0.7)]"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom-right floating action button */}
                <button
                  type="button"
                  className="absolute right-6 bottom-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD335] text-[#1A1D20] shadow-[0_16px_32px_rgba(0,0,0,0.55)] border border-black/10"
                >
                  <Clock className="h-5 w-5" />
                </button>
              </div>

              {/* Timeframe / footer bar */}
              <div className="mt-3 flex flex-col items-center gap-2 px-1 md:px-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-[#2C2F36] px-3 py-1.5 text-[11px] font-medium text-gray-100 shadow-sm"
                  >
                    5s
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C2F36] text-gray-200"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C2F36] text-gray-200"
                  >
                    <IndicatorIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C2F36] text-gray-200"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="px-2 py-0.5 rounded bg-black/20 text-gray-200">12:20:35</span>
                  <span>12:22:00</span>
                  <span>12:24:00</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right trading info panel */}
        <aside className="hidden lg:flex w-[260px] flex-col border-l border-[#262932] bg-[#16181F] px-4 py-4 gap-4 text-[12px]">
          {/* Amount & time cards */}
          <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>Amount</span>
              <span className="text-gray-500">INR</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-semibold text-gray-100">₹100</span>
              <div className="flex gap-1">
                <button className="h-7 w-7 rounded bg-[#262A34] text-gray-200 text-sm flex items-center justify-center">-</button>
                <button className="h-7 w-7 rounded bg-[#262A34] text-gray-200 text-sm flex items-center justify-center">+</button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
              <span>Time</span>
              <span>18:14</span>
            </div>
          </div>

          {/* Earnings & majority opinion */}
          <div className="rounded-xl bg-[#1C1F27] border border-[#2C303A] px-4 py-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Earnings</span>
              <span className="text-emerald-400 font-semibold">+82%</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-gray-100">
              <span>Potential</span>
              <span>₹182.00</span>
            </div>

            <div className="mt-3 text-[11px] text-gray-400">Majority opinion</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-[#1F2933] overflow-hidden flex">
                <div className="h-full w-[39%] bg-emerald-500" />
                <div className="h-full flex-1 bg-rose-500" />
              </div>
              <span className="text-[10px] text-gray-400">39% / 61%</span>
            </div>

            {/* Up / down buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center rounded-lg bg-emerald-500 text-[#04110A] py-2 text-xs font-semibold shadow-[0_8px_18px_rgba(16,185,129,0.4)]">
                <span>Up</span>
              </button>
              <button className="flex flex-col items-center justify-center rounded-lg bg-rose-500 text-[#14030A] py-2 text-xs font-semibold shadow-[0_8px_18px_rgba(244,63,94,0.5)]">
                <span>Down</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
