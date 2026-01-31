"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";

const formatPrice = (price) => {
  if (typeof price !== 'number') return '0.00';
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
};

export default function TradingChart({ candles, currentPrice, lastTickTimestamp, latestTick, timeframe, direction, activeTrades = [], onCandlePersist, chartType = 'candle', hoverDirection = null, userSelectedExpiry = null, userSelectedAsset = null }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isChartReady, setIsChartReady] = useState(false); // Controls loader and initial animation suppression
  const animationFrameRef = useRef(null);

  // Render state refs (decoupled from raw props)
  const renderPriceRef = useRef(null);
  const priceVelocityRef = useRef(0);
  const renderCandlesRef = useRef([]);
  const scrollOffsetRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const layoutRef = useRef(null); // Share layout data between render and mouse handlers

  // Interaction refs
  const isPanningRef = useRef(false);
  const lastPanXRef = useRef(0);
  const zoomRef = useRef(1.0); // 1.0 = default zoom (shows ~45 candles)
  const hoverStateRef = useRef({ x: null, y: null, price: null, index: null, time: null });

  // Visual Noise Refs
  const noiseRef = useRef(0);
  const noiseTargetRef = useRef(0);

  // FRAMER MOTION: Spring for smooth price movement
  const priceSpring = useSpring(currentPrice || 0, { stiffness: 60, damping: 15, mass: 1 });

  // ATOMIC REF: For accessing fresh tick data inside the closure of the render loop
  const latestTickRef = useRef(latestTick);
  const clockOffsetRef = useRef(0); // OFFSET: ServerTime - LocalTime

  // Sync Ref with Prop & Calculate Offset
  useEffect(() => {
    latestTickRef.current = latestTick;

    // TIME SYNC: strictly synchronize local clock to server
    // If latestTick is fresh (roughly now), we calculate offset.
    if (latestTick?.timestamp) {
      clockOffsetRef.current = latestTick.timestamp - Date.now();
    }
  }, [latestTick]);

  // SYNC USER EXPIRY REF
  const userSelectedExpiryRef = useRef(userSelectedExpiry);
  useEffect(() => {
    userSelectedExpiryRef.current = userSelectedExpiry;
  }, [userSelectedExpiry]);

  // Persistent Visual State for Active Candle (to persist wicks from jitter)
  const activeCandleVisualRef = useRef({ timestamp: 0, high: -Infinity, low: Infinity });

  // Helper to get duration in ms from timeframe string
  const getTimeframeDuration = (tf) => {
    const map = {
      '1s': 1000,
      '5s': 5000,
      '15s': 15000,
      '30s': 30000,
      '1m': 60000,
      '2m': 120000,
      '5m': 300000,
      '15m': 900000,
    };
    return map[tf] || 1000;
  };

  // Handle resize
  // Handle resize with ResizeObserver for layout changes (sidebar toggle)
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Only update if dimensions actually changed to avoid loop
        setDimensions(prev => (prev.width === width && prev.height === height ? prev : { width, height: height || 500 }));
      }
    };

    // Initial measure
    updateDimensions();

    const observer = new ResizeObserver(() => {
      // Small delay or rAF can optimize, but direct call is usually fine for charts
      requestAnimationFrame(updateDimensions);
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Keep renderCandlesRef in sync with incoming candles (target state for interpolation)
  useEffect(() => {
    if (!candles || candles.length === 0) {
      renderCandlesRef.current = [];
      return;
    }

    // Initialization Logic: Prevent "Jump" from 0
    // If this is the first valid data batch, seed the render price immediately
    if (!renderPriceRef.current && (currentPrice || candles[0].close)) {
      const initialPrice = currentPrice || candles[0].close;
      renderPriceRef.current = initialPrice;
      priceVelocityRef.current = 0;
      noiseRef.current = 0;
      // Small delay to ensure canvas is ready before hiding loader
      setTimeout(() => setIsChartReady(true), 100);
    } else if (renderPriceRef.current && !isChartReady) {
      // Recovery if re-mounted
      setIsChartReady(true);
    }

    // PERSISTENCE LOGIC: Detect if the previously "active" candle is now finished
    const existing = renderCandlesRef.current;
    if (existing.length > 0 && candles.length > 0) {
      const lastRenderedCandle = existing[existing.length - 1];
      const incomingLastCandle = candles[candles.length - 1];

      const lastRenderedTs = lastRenderedCandle.timestamp.getTime();
      const incomingLastTs = new Date(incomingLastCandle.timestamp).getTime();

      // If the incoming data has a NEWER candle than what we last rendered as "active",
      // it means the previous one (lastRenderedCandle) has completed.
      // We must save its *Client Modified* state to the DB.
      if (incomingLastTs > lastRenderedTs) {
        if (onCandlePersist && lastRenderedCandle.isClientModified) {

          // STALENESS CHECK: Only persist if the chart is actively rendering (tab active)
          // If the tab was backgrounded, the render loop stops, and the local candle state is "frozen".
          // We must NOT overwrite the server's live data with our frozen stale data.
          const isStale = (Date.now() - (lastTimestampRef.current || 0)) > 2000;

          if (!isStale) {
            // VALIDATION: Ensure no Infinity/NaN values are sent
            const safeFloat = (v) => (Number.isFinite(v) ? v : 0);

            const finalData = {
              timestamp: lastRenderedCandle.timestamp,
              open: safeFloat(lastRenderedCandle.open),
              high: safeFloat(lastRenderedCandle.high),
              low: safeFloat(lastRenderedCandle.low),
              close: safeFloat(lastRenderedCandle.close),
              volume: lastRenderedCandle.volume || 0
            };

            // Only persist if values are valid (sanity check against -Infinity init)
            if (finalData.high > 0 && finalData.low > 0) {
              onCandlePersist(finalData);
            }
          }
        }
      }
    }

    const existingMap = new Map();
    existing.forEach(c => existingMap.set(c.timestamp.getTime(), c));

    const updated = candles.map((c, index) => {
      const ts = new Date(c.timestamp).getTime();
      const prev = existingMap.get(ts);
      const isLast = index === candles.length - 1;

      if (!prev) {
        return {
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          targetOpen: c.open,
          targetHigh: c.high,
          targetLow: c.low,
          targetClose: c.close,
          timestamp: new Date(c.timestamp),
          isNew: true
        };
      }

      // SYNC LOGIC:
      // For historical candles (not the last one), Server is strictly authority. Overwrite everything.
      // For the active candle, we must prevent "flicker" by preserving higher-fidelity local state (ticks).

      if (!isLast) {
        return {
          ...prev,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          timestamp: new Date(c.timestamp),
          isNew: false
        };
      }

      // Active Candle Merge:
      // Open: Trust Server (Open shouldn't change, but if it does, server is right)
      // High: Max(Server, Local) - prevents shrinking wicks
      // Low: Min(Server, Local) - prevents shrinking wicks
      // Close: Trust Local (prev.close) because it reflects the most recent 'currentPrice' tick, 
      //        which is likely newer than the 'candles' prop update (socket latency).
      return {
        ...prev,
        open: c.open,
        high: Math.max(prev.high, c.high),
        low: Math.min(prev.low, c.low),
        close: prev.close, // Keep local live price
        targetOpen: c.open,
        targetHigh: c.high,
        targetLow: c.low,
        targetClose: c.close,
        timestamp: new Date(c.timestamp),
        isNew: false
      };
    });

    renderCandlesRef.current = updated;
    renderCandlesRef.current = updated;
  }, [candles]);

  // LIVE AGGREGATION: Update active candle visuals immediately on price change
  // ATOMIC FIX: Use `latestTick` object to ensure price and timestamp are perfectly synced.
  useEffect(() => {
    // If we haven't received a tick yet, use legacy props or return
    const tickPrice = latestTick?.price || currentPrice;

    // ATOMIC TIMESTAMP: Crucial for mobile sync.
    // If latestTick is exhausted/used, we fallback to lastTickTimestamp prop.
    const tickTimestamp = latestTick?.timestamp || lastTickTimestamp || Date.now();

    if (!tickPrice || renderCandlesRef.current.length === 0) return;

    const lastCandle = renderCandlesRef.current[renderCandlesRef.current.length - 1];

    // SAFETY CHECK: Prevent contaminating the *previous* candle if a new tick arrives 
    // before the Phantom Candle is created.
    if (lastCandle.timestamp) {
      const duration = getTimeframeDuration(timeframe);
      const endTime = lastCandle.timestamp.getTime() + duration;

      // STRICT FILTER: If the TICK TIME itself is beyond the candle window, reject it.
      if (tickTimestamp >= endTime) return;
    }

    // Update Targets for smooth interpolation
    lastCandle.targetClose = tickPrice;
    if (tickPrice > lastCandle.targetHigh) lastCandle.targetHigh = tickPrice;
    if (tickPrice < lastCandle.targetLow) lastCandle.targetLow = tickPrice;

    // Immediate update for High/Low (snap) to prevent "wick lag"
    if (tickPrice > lastCandle.high) lastCandle.high = tickPrice;
    if (tickPrice < lastCandle.low) lastCandle.low = tickPrice;

    // Mark as modified so persistence logic can pick it up if needed (though we prefer server source)
    lastCandle.isClientModified = true;

    // FRAMER MOTION: Update spring target
    if (priceSpring) {
      // ASSET SWITCH FIX: If price change is massive (likely asset switch), SNAP immediately.
      const currentSpringValue = priceSpring.get();
      const diff = Math.abs(tickPrice - currentSpringValue);

      // If diff is > 10% of price, SNAP.
      if (currentSpringValue === 0 || (tickPrice > 0 && diff / tickPrice > 0.1)) {
        priceSpring.jump(tickPrice);
      } else {
        priceSpring.set(tickPrice);
      }
    }

  }, [latestTick]); // DEPENDENCY SWAP: Only trigger on atomic update

  // Draw chart with 60 FPS loop and interpolation
  useEffect(() => {
    if (!canvasRef.current || !dimensions.width) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // *ENHANCEMENT: Maximized screen usage (Right-side prices)*
    // Padding adjusted: Top: 50, Right: 100, Bottom: 40 to fit 6 decimals
    const padding = { top: 50, right: 100, bottom: 40, left: 0 };

    // Dynamic Price Formatter
    const formatPrice = (p) => {
      if (p == null || isNaN(p)) return "0.00";
      // User request: Always show 6 decimals to match Binomo precision
      return p.toFixed(6);
    };

    const updateAndDraw = (timestamp) => {
      const width = dimensions.width;
      const height = dimensions.height;
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      let redLineX = null; // Hoisted for shared access

      // Prevent execution if chart is not ready or data is invalid
      if (!isChartReady) {
        animationFrameRef.current = requestAnimationFrame(updateAndDraw);
        return;
      }
      if (lastTimestampRef.current == null) lastTimestampRef.current = timestamp;
      const rawDelta = timestamp - lastTimestampRef.current;
      const deltaMs = Math.min(32, rawDelta);
      lastTimestampRef.current = timestamp;

      // WAKE UP SNAP: If tab was inactive (>500ms lag), snap immediately to avoid "giant candles"
      // This prevents the chart from drawing a path from the old sleeping price to the new live price.
      if (rawDelta > 500 && currentPrice) {
        renderPriceRef.current = currentPrice;
        priceVelocityRef.current = 0;
        noiseRef.current = 0;
      }

      // Interpolate price (unchanged)
      // Interpolate price (unchanged)
      if (renderPriceRef.current == null) {
        renderPriceRef.current = currentPrice;
      } else {
        // FRAMER MOTION: Use spring value for organic smoothing
        // The spring handles the interpolation physics automatically.
        // renderPriceRef.current is updated to the current spring value for drawing.
        renderPriceRef.current = priceSpring.get();
      }

      const visiblePrice = renderPriceRef.current ?? currentPrice ?? 0;
      const finalVisiblePrice = visiblePrice; // Ensure variable exists for usage in candle sync (line 293)

      // Safety check: if price is invalid, don't attempt to draw adaptive logic that relies on it
      if (!visiblePrice || isNaN(visiblePrice)) {
        animationFrameRef.current = requestAnimationFrame(updateAndDraw);
        return;
      }

      // Micro-volatility removed as per user request. 
      // candles should strictly follow the price line.


      // Interpolate candles (unchanged)
      const renderCandles = renderCandlesRef.current;

      // --- PHANTOM CANDLE INJECTION (Zero-Latency) ---
      // If the timer has reset (Wall Clock OR Server Clock) but the Socket hasn't sent the new candle yet,
      // we inject a "Phantom" candle to ensure the graph splits INSTANTLY.
      const duration = getTimeframeDuration(timeframe);

      // LATENCY FIX: Use Max(Local, Server) for current time.
      // On Mobile, Local Clock might be slow. We trust Server Time (via Ref to avoid stale closure) if it's ahead.
      // UPDATE: We now use `clockOffsetRef` to strictly sync to Server Time (handling both Ahead and Behind clocks).
      const correctedNow = Date.now() + clockOffsetRef.current;
      const effectiveNow = correctedNow;

      const expectedTime = effectiveNow - (effectiveNow % duration); // e.g. xx:xx:00, xx:xx:05

      if (renderCandles.length > 0) {
        const lastCandle = renderCandles[renderCandles.length - 1];
        const lastTime = lastCandle.timestamp ? lastCandle.timestamp.getTime() : 0;

        // If our data lags behind wall clock (Latency Gap)
        if (lastTime < expectedTime && (expectedTime - lastTime < duration * 2)) {
          // Create Phantom Candle
          // It's a temporary visual object attached to the end of the array
          // The "Live Aggregation" logic below (Line 300+) will animate it.
          const phantom = {
            timestamp: new Date(expectedTime),
            open: currentPrice,
            close: currentPrice,
            high: currentPrice,
            low: currentPrice,
            targetOpen: currentPrice,
            targetClose: currentPrice,
            targetHigh: currentPrice,
            targetLow: currentPrice,
            isPhantom: true
          };
          // We push it to the reference array so it renders this frame
          // It will be overwritten when real data arrives via props
          renderCandles.push(phantom);
        }
      }
      // -----------------------------------------------

      // -----------------------------------------------

      const lerpFactor = 0.2;
      for (let i = 0; i < renderCandles.length; i++) {
        const c = renderCandles[i];

        // SNAP LOGIC:
        // Open/High/Low are historical (or start points). They should NOT animate if corrected by server.
        // If the server says "Actuall Open was X", we snap to X immediately to avoid "stretching" body.
        c.open = c.targetOpen;
        c.high = c.targetHigh;
        c.low = c.targetLow;

        // Close is dynamic (follows price). We can interpolate, but if it's the active candle,
        // it should ideally stick to the price line.
        // If it's a closed candle (history), it should snap too.
        if (i === renderCandles.length - 1 && !c.isPhantom) {
          c.close += (c.targetClose - c.close) * lerpFactor;
        } else {
          c.close = c.targetClose;
        }
      }

      // Layout calculations
      const futureRatio = 0.40; // Increased to 40% (User Request: Candle at ~60% width)
      const futureWidth = chartWidth * futureRatio;
      const pastWidth = chartWidth - futureWidth;

      const zoom = zoomRef.current || 1.0;

      // Dynamic candle count based on screen width and orientation
      const isPortraitMobile = width < 768 && window.matchMedia("(orientation: portrait)").matches;
      const isLandscapeMobile = width < 950 && window.matchMedia("(orientation: landscape)").matches && height < 500;

      let baseCandleCount = 40; // Desktop default (Reduced from 70 to make candles thicker)
      if (isPortraitMobile) baseCandleCount = 18; // Reduced for Mobile Portrait
      else if (isLandscapeMobile) baseCandleCount = 30; // Reduced for Mobile Landscape

      const targetCandleCount = baseCandleCount * zoom;

      const candleFullWidth = pastWidth / targetCandleCount;
      const candleWidth = candleFullWidth * 0.85; // Significantly wider (User request: Thicker candles)
      const spacing = candleFullWidth * 0.15;

      const totalCandleSpan = (candleWidth + spacing) * renderCandles.length;

      const indexToX = (index) => {
        const baseX = padding.left + pastWidth - (renderCandles.length - 1 - index) * candleFullWidth;
        return baseX + scrollOffsetRef.current;
      };

      // Store layout for cursor interaction
      layoutRef.current = {
        padding,
        pastWidth,
        candleFullWidth,
        candleWidth,
        indexToX
      };

      const visibleCandles = [];
      const viewMinX = padding.left - candleWidth;
      const viewMaxX = width - padding.right + candleWidth;

      // DEBUG: unexpected render halt?
      // console.log('Render:', { count: renderCandles.length, type: chartType });

      for (let i = 0; i < renderCandles.length; i++) {
        // ... rest of loop

        const x = indexToX(i);
        if (x + candleFullWidth > viewMinX && x < viewMaxX) {
          visibleCandles.push(renderCandles[i]);
        }
      }

      const priceArray = visibleCandles.length
        ? visibleCandles.flatMap((c) => [c.high, c.low])
        : [visiblePrice, visiblePrice];

      const maxVal = Math.max(...priceArray, visiblePrice + 0.0001); // Ensure range > 0
      const minVal = Math.min(...priceArray, visiblePrice - 0.0001);

      const range = maxVal - minVal;
      // Padding factor adjustment
      // Portrait: 0.3 (Zoom out/Short), LandscapeMobile: 0.2 (Balanced), Desktop: 0.1 (Tall)
      const paddingFactor = isPortraitMobile ? 0.3 : (isLandscapeMobile ? 0.2 : 0.1);

      let targetMax = maxVal + range * paddingFactor;
      let targetMin = minVal - range * paddingFactor;

      // Enforce minimum display height (Zoom Limit)
      const minHeight = visiblePrice * 0.00005; // 0.005% minimum range (Allows macro-zoom on flat markets)
      if (targetMax - targetMin < minHeight) {
        const center = (targetMax + targetMin) / 2;
        targetMax = center + minHeight / 2;
        targetMin = center - minHeight / 2;
      }

      // Smoothly interpolate current view to target view (Damping)
      // This prevents "Jumping" candles. 
      // We use a persistent ref for the viewport state.
      if (!window.viewState) window.viewState = { yMin: targetMin, yMax: targetMax };

      // Lerp factor: Lower = Smoother/Slower camera, Higher = Snappier
      const cameraSpeed = 0.05;
      window.viewState.yMax += (targetMax - window.viewState.yMax) * cameraSpeed;
      window.viewState.yMin += (targetMin - window.viewState.yMin) * cameraSpeed;

      const yMax = window.viewState.yMax;
      const yMin = window.viewState.yMin;
      const yRange = yMax - yMin || 1;

      const priceToY = (price) => {
        return padding.top + chartHeight - ((price - yMin) / yRange) * chartHeight;
      };

      // 1. Clear and background
      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#14171A");
      bgGradient.addColorStop(1, "#1A1D20");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // HOVER EFFECT: Background Tint
      if (hoverDirection) {
        ctx.save();
        const tintColor = hoverDirection === 'up'
          ? "rgba(16, 185, 129, 0.15)" // Emerald-500 @ 15%
          : "rgba(244, 63, 94, 0.15)"; // Rose-500 @ 15%

        // Gradient from right to left
        const tintGradient = ctx.createLinearGradient(width, 0, width - 400, 0);
        tintGradient.addColorStop(0, tintColor);
        tintGradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = tintGradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 2. Grid (Draw grid lines spanning chart area)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 0.5;

      const gridLines = 8;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width, y); // Full width grid
        ctx.stroke();
      }

      // Vertical Grid & X-Axis Labels
      const verticalLines = 8;
      ctx.fillStyle = "#6B7280"; // Gray-500
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";

      for (let i = 0; i <= verticalLines; i++) {
        const x = padding.left + (chartWidth / verticalLines) * i;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();

        const approxIndex = Math.round(
          (renderCandles.length - 1) +
          (x - scrollOffsetRef.current - (padding.left + pastWidth)) / candleFullWidth
        );

        if (renderCandles[approxIndex]) {
          const d = new Date(renderCandles[approxIndex].timestamp);
          const timeStr = (['5s', '15s', '30s'].includes(timeframe))
            ? d.toLocaleTimeString('en-GB', { hour12: false })
            : `${d.getHours().toString().padStart(2, 0)}:${d.getMinutes().toString().padStart(2, 0)}`;
          ctx.fillText(timeStr, x, height - padding.bottom + 20);
        } else if (renderCandles.length > 0 && approxIndex > renderCandles.length - 1) {
          // Future Time Labels (Projected)
          const lastCandle = renderCandles[renderCandles.length - 1];
          const lastTs = lastCandle.timestamp.getTime();
          const duration = getTimeframeDuration(timeframe || '5s');
          const diff = approxIndex - (renderCandles.length - 1);
          const futureTs = lastTs + (diff * duration);

          const d = new Date(futureTs);
          const timeStr = (['5s', '15s', '30s'].includes(timeframe))
            ? d.toLocaleTimeString('en-GB', { hour12: false })
            : `${d.getHours().toString().padStart(2, 0)}:${d.getMinutes().toString().padStart(2, 0)}`;
          ctx.fillText(timeStr, x, height - padding.bottom + 20);
        }
      }

      // 2.5 FUTURE LINES (Expiry & Next Candle - User Request)
      if (renderCandles.length > 0) {
        const lastCandle = renderCandles[renderCandles.length - 1];
        const lastTs = lastCandle.timestamp.getTime();
        const duration = getTimeframeDuration(timeframe || '5s');
        // Current candle ends at start + duration
        const currentExpiryTs = lastTs + duration;
        const nextExpiryTs = currentExpiryTs + duration; // Red line is next boundary

        // Helper to get X from TS
        // We calculate Pixels per Millisecond to project time forward accurately.
        const pixelsPerMs = candleFullWidth / duration;

        // Active Candle (Last one)
        const activeCandleX = indexToX(renderCandles.length - 1);
        // lastTs is START of active candle
        const xOfLastTs = activeCandleX - (candleFullWidth * 0.5); // Start of candle X

        const now = Date.now() + (clockOffsetRef.current || 0);

        // GREY LINE: Next Expiry Boundary
        // FIXED CYCLE: Always 30s. This ensures Red Line (Grey + 30s) always matches UserExpiry (Grey + 30s).
        // Before: Math.max(30000, duration) caused 1m chart to shift Red Line by -30s.
        const expiryCycle = 30000;


        // VISUAL GAP CHECK REMOVED: 
        // We no longer force a Minimum Pixel Gap (e.g. 80px), because on higher timeframes (1m+), 
        // 80px might represent 5+ minutes, which broke the logic.
        // We now respect the logical expiry cycle (Duration max 30s).


        let expiryTs;
        const userExpiry = userSelectedExpiryRef.current;

        // 1. ACTIVE TRADES OVERRIDE (Highest Priority)
        // If there are active trades, we MUST align the Red Line to the trade's expiry
        // to prevent the view from shifting while the trade is live.
        let activeTradeExpiryTs = null;

        if (activeTrades && activeTrades.length > 0) {
          // FORCE TYPE SAFETY & RELAXED FILTER
          // AND ISOLATION FIX: Only process trades for CURRENT ASSET
          // DEBUG: Log filtering
          // console.log("Debugging Asset Filter:", { userSelectedAsset, activeTradesCount: activeTrades.length });

          const normalize = (s) => String(s || "").trim().toUpperCase();
          const target = normalize(userSelectedAsset);

          const currentAssetTrades = activeTrades.filter(t => {
            const tSym = normalize(t.symbol || t.asset);
            const match = tSym === target;
            // if (!match) console.log(`Skipping trade ${t.id} (${tSym}) != ${target}`);
            return match;
          });

          const safeTrades = currentAssetTrades.map(t => {
            let safeExpiry;
            if (t.expiryTime instanceof Date) safeExpiry = t.expiryTime.getTime();
            else if (typeof t.expiryTime === 'string') safeExpiry = new Date(t.expiryTime).getTime();
            else if (typeof t.expiryTime === 'number') safeExpiry = t.expiryTime;
            else safeExpiry = 0;
            return { ...t, expiryTimeMs: safeExpiry };
          });

          // Filter out trades that expired > 3s ago
          const BUFFER_MS = 3000;
          const futureTrades = safeTrades.filter(t => t.expiryTimeMs > (now - BUFFER_MS));

          if (futureTrades.length > 0) {
            // Find earliest future trade
            const earliestTrade = futureTrades.sort((a, b) => a.expiryTimeMs - b.expiryTimeMs)[0];

            // We want the RED LINE to be at `earliestTrade.expiryTimeMs`.
            // Our drawing logic assumes Red = Grey + 30s.
            // So Grey (expiryTs) must be TradeExpiry - 30s.
            activeTradeExpiryTs = earliestTrade.expiryTimeMs - 30000;
          }
        }

        if (activeTradeExpiryTs !== null) {
          // Case A: Active Trade determines view
          expiryTs = activeTradeExpiryTs;
        } else if (userExpiry && userExpiry > now) {
          // Case B: User/Parent selected expiry (Fixed Mode)
          // Default logic: Grey = UserExpiry - Cycle
          expiryTs = userExpiry - expiryCycle;
        } else {
          // Case C: Auto Mode (Next 30s/60s interval)
          // We allow it to count down fully to 0 before switching
          const standardExpiryTs = Math.ceil(now / expiryCycle) * expiryCycle;
          expiryTs = standardExpiryTs;
        }

        const greyLineX = xOfLastTs + (expiryTs - lastTs) * pixelsPerMs;


        // RED LINE FIX:
        // 1. Position: STRICTLY 30 seconds after Grey Line (Purchase Deadline).
        // 2. Timer: STRICTLY (GreyTimer + 30s).
        // 3. Visibility: Timer text only shows if (activeTrades > 0).

        const FIXED_RED_GAP = 30000; // 30 seconds

        // RED LINE: Exactly 30s after Grey Line
        redLineX = greyLineX + (FIXED_RED_GAP * pixelsPerMs);

        const msRemaining = Math.max(0, expiryTs - now);
        const secondsRemaining = Math.ceil(msRemaining / 1000);

        // Draw Grey Line (Only if future)
        // User Request Update: "hide it qwhen the gery line timer gets 00 not when the trde has make"
        // So we REMOVE the !isActiveTradeView check. 
        // It stays visible until expiryTs <= now (Timer 00).

        // Define badgeY here so it's available for both Grey and Red lines
        const badgeY = padding.top + 60;

        if (expiryTs > now) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(156, 163, 175, 0.5)"; // Gray-400 with 50% opacity
          ctx.lineWidth = 1;
          ctx.moveTo(greyLineX, padding.top + 40);
          ctx.lineTo(greyLineX, height - padding.bottom);
          ctx.stroke();

          // Grey Badge (Seconds)
          ctx.save();
          ctx.fillStyle = "rgba(31, 41, 55, 0.8)"; // Dark background with opacity
          ctx.strokeStyle = "rgba(156, 163, 175, 0.8)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(greyLineX, badgeY, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`:${secondsRemaining.toString().padStart(2, '0')}`, greyLineX, badgeY);

          // "Time remaining" vertical text
          ctx.save();
          ctx.translate(greyLineX + 4, badgeY + 25);
          ctx.rotate(Math.PI / 2); // Vertical text
          ctx.font = "10px sans-serif";
          ctx.fillStyle = "rgba(156, 163, 175, 0.8)";
          ctx.textAlign = "left"; // FIX: Prevent centering overlap
          ctx.fillText("Time remaining", 0, 0);
          ctx.restore();
          ctx.restore();
        }

        // Draw Red Line (Next Boundary)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(244, 63, 94, 0.7)"; // Rose-500 with 70% opacity
        ctx.lineWidth = 1;
        ctx.moveTo(redLineX, padding.top + 40);
        ctx.lineTo(redLineX, height - padding.bottom);
        ctx.stroke();

        // Red Badge (Timer)
        // VISIBILITY FIX: Only show Badge AND Text if there are Active Trades
        // RED BADGE IS ALWAYS VISIBLE (User Request)
        ctx.save();
        ctx.fillStyle = "rgba(244, 63, 94, 0.9)"; // Red bg with slight opacity
        ctx.strokeStyle = "#FFFFFF"; // White border
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(redLineX, badgeY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Red Line Timer Text
        // VISIBILITY LOGIC: Only show if there are Active Trades
        if (activeTrades && activeTrades.length > 0) {
          // Red Line Timer Text
          // LOGIC UPDATE: Use precise Red Line Remaining time.
          // Remove "1m" cap to avoid "stuck" behavior. 
          // Count down universally.

          const redLineTs = expiryTs + FIXED_RED_GAP;
          const msToRed = Math.max(0, redLineTs - now);
          const redLineSecondsTotal = Math.ceil(msToRed / 1000);

          let displayText;

          if (redLineSecondsTotal >= 60) {
            const m = Math.floor(redLineSecondsTotal / 60);
            const s = redLineSecondsTotal % 60;
            displayText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          } else {
            displayText = `:${redLineSecondsTotal.toString().padStart(2, '0')}`;
          }

          ctx.fillStyle = "#FFFFFF";
          // Reduce font slightly if showing "MM:SS" to fit in circle
          ctx.font = redLineSecondsTotal >= 60 ? "bold 9px sans-serif" : "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(displayText, redLineX, badgeY);


        }
        ctx.restore();
        ctx.restore();

      }
      const wickWidth = (isPortraitMobile || isLandscapeMobile) ? 2.0 : 1.5;

      // HOVER DETECTION FOR TOOLTIP (Restored)
      let hoveredCandleData = null;
      if (hoverStateRef.current.x !== null) {
        const mX = hoverStateRef.current.x;
        // Invert index logic to find which candle is under the cursor
        const idx = Math.round(
          (renderCandles.length - 1) +
          (mX - scrollOffsetRef.current - (padding.left + pastWidth)) / candleFullWidth
        );
        if (renderCandles[idx]) {
          hoveredCandleData = renderCandles[idx];
        }
      }

      // --- DATA PREPARATION (Heikin Ashi) ---
      let drawCandles = renderCandles;
      if (chartType === 'heikin' && renderCandles.length > 0) {
        // Calculate Heikin Ashi values
        let haCandles = [];
        let prevHaOpen = renderCandles[0].open;
        let prevHaClose = renderCandles[0].close;

        for (let i = 0; i < renderCandles.length; i++) {
          const c = renderCandles[i];
          const haClose = (c.open + c.high + c.low + c.close) / 4;
          let haOpen = (i === 0) ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
          const haHigh = Math.max(c.high, haOpen, haClose);
          const haLow = Math.min(c.low, haOpen, haClose);

          haCandles.push({ ...c, open: haOpen, close: haClose, high: haHigh, low: haLow });
          prevHaOpen = haOpen;
          prevHaClose = haClose;
        }
        drawCandles = haCandles;
      }
      // -------------------------------------


      // --- LINE / MOUNTAIN RENDERER ---
      if (chartType === 'line' || chartType === 'mountain') {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.lineWidth = 2;
        // COLOR: Dynamic based on hoverDirection or Default Theme
        const lineColor = hoverDirection === 'up' ? '#10B981' : hoverDirection === 'down' ? '#F43F5E' : "#18D67D"; // Emerald / Rose / Greenish
        ctx.strokeStyle = lineColor;

        // GLOW EFFECT (Requested)
        if (hoverDirection) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = lineColor;
        } else {
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        }

        let firstPoint = true;
        let startX = 0;

        // Build Path
        drawCandles.forEach((candle, index) => {
          const x = indexToX(index) + candleWidth / 2;

          // Skip if way off screen
          if (x < -100 || x > width + 100) return;

          let closePrice = candle.close;

          // LIVE SYNC: Force the last point to match the current price line (Ref)
          if (index === drawCandles.length - 1) {
            // We use the same 'active visual' logic as candles to ensure consistency
            let visual = activeCandleVisualRef.current;
            const ts = candle.timestamp ? candle.timestamp.getTime() : 0;

            // Sync logic
            if (visual.timestamp === ts) {
              // Use the visual high/low logic if needed, but for Line we mostly care about Close
              closePrice = finalVisiblePrice;
            }
          }

          const y = priceToY(closePrice);
          if (firstPoint) {
            ctx.moveTo(x, y);
            startX = x;
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();

        // Mountain Fill
        if (chartType === 'mountain') {
          ctx.lineTo(width, height); // Bottom Right
          ctx.lineTo(startX, height); // Bottom Left (approx)
          ctx.fillStyle = (() => {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, "rgba(24, 214, 125, 0.4)");
            gradient.addColorStop(1, "rgba(24, 214, 125, 0.0)");
            return gradient;
          })();
          ctx.fill();
        }
      }
      // --- BAR / CANDLE / HEIKIN RENDERER ---
      else {
        drawCandles.forEach((candle, index) => {
          const x = indexToX(index);

          if (x + candleWidth < padding.left || x > width - padding.right) return;

          let { open, close, high, low, timestamp } = candle;

          // Adjust active candle visual if needed (mostly for standard candles, HA pre-calc handles it)
          if (chartType === 'candle' && index === drawCandles.length - 1) {
            const ts = candle.timestamp ? candle.timestamp.getTime() : 0;
            let visual = activeCandleVisualRef.current;
            if (visual.timestamp !== ts) {
              visual = { timestamp: ts, high: -Infinity, low: Infinity };
              activeCandleVisualRef.current = visual;
            }

            // Sync Close to Price Line
            close = finalVisiblePrice;

            // Update persistent visual limits (High/Low expansion)
            if (close > visual.high) visual.high = close;
            if (close < visual.low) visual.low = close;

            high = Math.max(high, visual.high);
            low = Math.min(low, visual.low);

            // SNAP FIX: Commit visual state to the candle object so it persists after re-renders
            // This is purely visual; backend data remains authoritative until next update
            candle.targetClose = close;
            candle.targetHigh = high;
            candle.targetLow = low;
          }

          const openY = priceToY(open);
          const closeY = priceToY(close);
          const highY = priceToY(high);
          const lowY = priceToY(low);

          // Color Logic:
          // If Open === Close (Doji), normally neutral grey. 
          // But for active/new candles, we want to show direction based on movement from PREVIOUS candle.
          let isBullish = close > open;
          let isBearish = close < open;
          let color;

          if (isBullish) {
            color = "#18D67D";
          } else if (isBearish) {
            color = "#E65252";
          } else {
            // Neutral (Open === Close)
            // Look at previous candle to decide "Gap" direction or Momentum
            const prevCandle = index > 0 ? drawCandles[index - 1] : null;
            if (prevCandle && close > prevCandle.close) {
              color = "#18D67D"; // Gap Up / Move Up
            } else if (prevCandle && close < prevCandle.close) {
              color = "#E65252"; // Gap Down / Move Down
            } else {
              color = "#A6ABB5"; // Truly neutral
            }
          }

          ctx.setLineDash([]);
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = wickWidth;

          if (chartType === 'bar') {
            // OHLC Bar
            const cx = x + candleWidth / 2;
            // Vertical Stem (High to Low)
            ctx.beginPath();
            ctx.moveTo(cx, highY);
            ctx.lineTo(cx, lowY);
            ctx.stroke();

            // Open Tick (Left)
            ctx.beginPath();
            ctx.moveTo(cx, openY);
            ctx.lineTo(cx - candleWidth / 2, openY);
            ctx.stroke();

            // Close Tick (Right)
            ctx.beginPath();
            ctx.moveTo(cx, closeY);
            ctx.lineTo(cx + candleWidth / 2, closeY);
            ctx.stroke();
          } else {
            // Candle / Heikin (Body + Wicks)

            // Wick
            ctx.beginPath();
            ctx.moveTo(x + candleWidth / 2, highY);
            ctx.lineTo(x + candleWidth / 2, lowY);
            ctx.stroke();

            // Body
            const bodyH = Math.max(1, Math.abs(closeY - openY));
            const bodyTop = Math.min(openY, closeY);

            // Allow filled/hollow style or just solid
            // User asked for "matching chart page", usually solid bodies
            ctx.fillRect(x, bodyTop, candleWidth, bodyH);
          }
        });
      }


      // DRAW OHLC TOOLTIP (Top Left)
      if (hoveredCandleData) {
        const { open, high, low, close } = hoveredCandleData;
        ctx.save();
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";

        // Move to Top-Left area (above grid)
        const startY = 30; // 30px from top (padding.top is usually 50)

        // Increase gap to accommodate 6 decimals (e.g. 90736.880517 is wide)
        const gapX = 160;

        ctx.fillStyle = "#A6ABB5"; // Label color
        ctx.fillText("Open:", padding.left + 10, startY);
        ctx.fillStyle = "#E3E5E8"; // Value color
        ctx.fillText(formatPrice(open), padding.left + 50, startY);

        ctx.fillStyle = "#A6ABB5";
        ctx.fillText("High:", padding.left + 10 + gapX, startY);
        ctx.fillStyle = "#10B981"; // Green for High
        ctx.fillText(formatPrice(high), padding.left + 45 + gapX, startY);

        ctx.fillStyle = "#A6ABB5";
        ctx.fillText("Low:", padding.left + 10 + gapX * 2, startY);
        ctx.fillStyle = "#F43F5E"; // Red for Low
        ctx.fillText(formatPrice(low), padding.left + 40 + gapX * 2, startY);

        ctx.fillStyle = "#A6ABB5";
        ctx.fillText("Close:", padding.left + 10 + gapX * 3, startY);
        ctx.fillStyle = close >= open ? "#10B981" : "#F43F5E";
        ctx.fillText(formatPrice(close), padding.left + 50 + gapX * 3, startY);

        ctx.restore();
      }

      // 4. FIX: Draw opaque background over the RIGHT padding area (where numbers are)
      // This MUST be drawn AFTER the candles to hide the part of the candle bodies that might enter this zone.
      ctx.fillStyle = bgGradient; // Use a similar dark color as chart background
      ctx.fillRect(width - padding.right, 0, padding.right, height);

      // 5. Draw RIGHT Price Labels (Y-Axis)
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        const price = yMax - (yRange / gridLines) * i;

        ctx.fillStyle = "#A6ABB5"; // Gray color
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(formatPrice(price), width - 8, y + 4);
      }

      // 6. Price line
      const priceY = priceToY(visiblePrice);
      const lineMidX = padding.left + pastWidth;
      const lineEndX = width - padding.right + 10;

      // COLOR: Dynamic based on hoverDirection or Default Gold
      const activePriceColor = hoverDirection === 'up' ? '#10B981' : hoverDirection === 'down' ? '#F43F5E' : "#FFD335";

      // --- DIRECTIONAL GLOW AREA (User Request) ---
      if (hoverDirection && !isNaN(renderPriceRef.current)) {
        const glowHeight = 250; // Extend glow area significantly
        const startY = priceY;
        const endY = hoverDirection === 'up' ? startY - glowHeight : startY + glowHeight;

        const areaGradient = ctx.createLinearGradient(0, startY, 0, endY);
        if (hoverDirection === 'up') {
          areaGradient.addColorStop(0, "rgba(16, 185, 129, 0.2)"); // Green start
          areaGradient.addColorStop(1, "rgba(16, 185, 129, 0)");   // Fade out
        } else {
          areaGradient.addColorStop(0, "rgba(244, 63, 94, 0.2)");   // Red start
          areaGradient.addColorStop(1, "rgba(244, 63, 94, 0)");     // Fade out
        }

        ctx.save();
        ctx.fillStyle = areaGradient;
        ctx.beginPath();
        // Draw rect from price line in the direction of trade
        const rectY = hoverDirection === 'up' ? startY - glowHeight : startY;
        ctx.fillRect(padding.left, rectY, width - padding.left - padding.right, glowHeight);
        ctx.restore();
      }
      // ---------------------------------------------

      ctx.save();
      ctx.strokeStyle = activePriceColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = activePriceColor;
      ctx.shadowBlur = hoverDirection ? 20 : 10; // Intense glow on hover

      // Dashed segment
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceY);
      ctx.lineTo(lineMidX, priceY);
      ctx.stroke();

      // Solid segment
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(lineMidX, priceY);
      ctx.lineTo(lineEndX, priceY);
      ctx.stroke();
      ctx.stroke();
      ctx.restore();



      // 7. Price label (Right side)
      const labelWidth = 70; // Reduced from 96 to fit
      const labelHeight = 24; // Compact
      // Calculate X to center it in the padding area
      const labelX = width - padding.right + (padding.right - labelWidth) / 2;
      const labelY = priceY - labelHeight / 2;

      const labelBgColor = hoverDirection === 'up' ? '#064E3B' : hoverDirection === 'down' ? '#881337' : "#2C2F36"; // Dark Green / Dark Red / Dark Gray

      // Draw Price Label Box
      ctx.save();
      ctx.fillStyle = labelBgColor;
      ctx.shadowColor = activePriceColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
      ctx.fill();
      ctx.restore();

      // Draw Price Text
      ctx.fillStyle = "#E3E5E8";
      ctx.font = "500 13px system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        formatPrice(visiblePrice || currentPrice),
        labelX + labelWidth / 2,
        labelY + labelHeight / 2 + 5
      );

      ctx.fillStyle = bgGradient;
      ctx.fillRect(width - padding.right - 2, 0, padding.right + 2, padding.top - 15);

      // 10. Draw Active Trades
      if (activeTrades && activeTrades.length > 0 && renderCandles.length > 0) {

        // Hoist pixelsPerMs calculation if not already available
        const duration = getTimeframeDuration(timeframe || '5s');
        const pixelsPerMs = candleFullWidth / duration;

        // Last Candle Reference
        const activeCandleX = indexToX(renderCandles.length - 1);
        const lastCandle = renderCandles[renderCandles.length - 1];
        const xOfLastTs = activeCandleX - (candleFullWidth * 0.5);
        const lastTs = lastCandle.timestamp.getTime();

        // Deduplication: track drawn expiry lines to avoid clutter
        // Start with redLineX (Main Expiry) as already drawn
        const drawnExpiries = redLineX !== null ? [redLineX] : [];

        activeTrades.forEach(trade => {
          const y = priceToY(trade.entryPrice);
          const isUp = trade.direction === 'up';
          const color = isUp ? "#10B981" : "#F43F5E"; // Emerald / Rose

          let expiryX = width - padding.right;
          let entryX = padding.left;

          if (trade.expiryTime) {
            const timeDiff = trade.expiryTime - lastTs;
            expiryX = xOfLastTs + (timeDiff * pixelsPerMs);

            // Check if we need to draw a dedicated line
            // Only draw if NO existing line is close enough (within 3px)
            const isLineAlreadyDrawn = drawnExpiries.some(x => Math.abs(x - expiryX) < 3);

            if (!isLineAlreadyDrawn && expiryX > 0 && expiryX < width) {
              // Determine Line Style for "Trade Specific" Expiry
              // Use Dashed Line to distinguish from Main Expiry
              ctx.save();
              ctx.beginPath();
              ctx.strokeStyle = "#EF4444"; // Red-500
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]); // DASHED LINE
              ctx.moveTo(expiryX, padding.top); // Full height
              ctx.lineTo(expiryX, height - padding.bottom);
              ctx.stroke();

              // Optional: Small dot or cap at the top instead of full badge?
              // Just a small circle to tidy the end
              ctx.beginPath();
              ctx.fillStyle = "#EF4444";
              ctx.arc(expiryX, padding.top, 3, 0, Math.PI * 2);
              ctx.fill();

              ctx.restore();

              // Mark this X as drawn
              drawnExpiries.push(expiryX);
            }
          }

          if (trade.entryTime) {
            // Project entry backwards relative to current time
            const timeDiff = trade.entryTime - lastTs;
            entryX = xOfLastTs + (timeDiff * pixelsPerMs);
          } else {
            entryX = xOfLastTs;
          }

          // 1. Draw Investment Tag (At Entry Point)
          // Tag Shape: Rect on Left, Triangle pointing to Entry X
          const tagW = 45;
          const tagH = 20;
          const tagX = entryX - tagW - 6; // Shift left of entry
          const tagY = y - tagH / 2;

          ctx.save();
          ctx.beginPath();
          ctx.fillStyle = "#E5E7EB"; // Light Gray tag background (like image)

          // Draw Tag Body
          ctx.roundRect(tagX, tagY, tagW, tagH, 3);
          ctx.fill();

          // Draw Triangle Tip pointing to Entry Line
          ctx.beginPath();
          ctx.moveTo(tagX + tagW, y - 4);
          ctx.lineTo(tagX + tagW + 6, y); // Tip
          ctx.lineTo(tagX + tagW, y + 4);
          ctx.closePath();
          ctx.fill();

          // Text: Investment Amount (e.g. 100 ₹)
          ctx.fillStyle = "#111827"; // Dark text
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          // Mock data: assume trade.amount or default 100
          const amountText = (trade.amount || "100") + " ₹";
          ctx.fillText(amountText, tagX + tagW / 2, y + 1);

          // Draw Dot at Entry
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(entryX, y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 2. Draw Connection Line
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.moveTo(entryX, y);
          ctx.lineTo(expiryX, y);
          ctx.stroke();

          // 3. Draw End Marker (Small Triangle at Expiry)
          const arrowSize = 4;
          ctx.fillStyle = color;
          ctx.beginPath();
          // Pointing UP
          ctx.moveTo(expiryX, y - arrowSize);
          ctx.lineTo(expiryX - arrowSize, y + arrowSize);
          ctx.lineTo(expiryX + arrowSize, y + arrowSize);
          ctx.fill();

          ctx.restore();
        });
      }



      // 11. Phantom Arrow (Hover Preview)
      if (hoverDirection && !isNaN(renderPriceRef.current)) {
        const y = priceToY(renderPriceRef.current);
        const isUp = hoverDirection === 'up';
        const color = isUp ? "#10B981" : "#F43F5E";

        // Use same drawing logic as Active Trade but possibly more distinct or pulsing
        const arrowOffset = 180;
        const arrowX = width - padding.right - arrowOffset;
        const arrowSize = 65; // Chunky size
        const verticalOffset = 45;
        const arrowY = isUp ? (y - verticalOffset) : (y + verticalOffset);

        ctx.save();
        ctx.translate(arrowX, arrowY);

        const tiltAngle = 35 * (Math.PI / 180);
        // FIX: Up points N-E (+35). Down points S-E (+145 = 180-35).
        const rotation = isUp ? tiltAngle : (Math.PI - tiltAngle);
        ctx.rotate(rotation);

        // REFERENCE STYLE: Chunky, Solid, 3D-like (Binomo Style)
        // Create 3D Gradient (Top-Down relative to arrow)
        const gradient = ctx.createLinearGradient(0, -arrowSize / 2, 0, arrowSize / 2);
        if (isUp) {
          gradient.addColorStop(0, "#34D399"); // Highlight (Top)
          gradient.addColorStop(0.5, "#10B981"); // Body
          gradient.addColorStop(1, "#047857"); // Shadow (Bottom)
        } else {
          gradient.addColorStop(0, "#FB7185"); // Highlight
          gradient.addColorStop(0.5, "#F43F5E"); // Body
          gradient.addColorStop(1, "#BE123C"); // Shadow
        }

        ctx.fillStyle = gradient;
        // Add a hard drop shadow for pop
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        // Chunky Arrow Shape (Standard wide arrow)
        const halfShaftWidth = arrowSize * 0.22;
        const headHalfWidth = arrowSize * 0.45;
        const tipY = -arrowSize * 0.55;
        const headBaseY = -arrowSize * 0.1;
        const shaftBaseY = arrowSize * 0.5;

        ctx.moveTo(0, tipY); // Tip
        ctx.lineTo(headHalfWidth, headBaseY); // Right Head Corner
        ctx.lineTo(halfShaftWidth, headBaseY); // Right Shaft Connection
        ctx.lineTo(halfShaftWidth, shaftBaseY); // Right Shaft Base
        ctx.lineTo(-halfShaftWidth, shaftBaseY); // Left Shaft Base
        ctx.lineTo(-halfShaftWidth, headBaseY); // Left Shaft Connection
        ctx.lineTo(-headHalfWidth, headBaseY); // Left Head Corner

        ctx.closePath();

        // Rounded corners effect
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        ctx.strokeStyle = isUp ? "#065F46" : "#881337"; // Dark border for definition
        ctx.stroke();
        ctx.fill();

        // Inner Highlight (Glassy Shine - Top Half)
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        const shineGrad = ctx.createLinearGradient(0, -arrowSize * 0.5, 0, 0);
        shineGrad.addColorStop(0, "rgba(255,255,255,0.4)");
        shineGrad.addColorStop(1, "rgba(255,255,255,0)");

        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.moveTo(0, tipY + 4);
        ctx.lineTo(headHalfWidth - 6, headBaseY - 3);
        ctx.lineTo(-headHalfWidth + 6, headBaseY - 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        ctx.restore();
      }

      // --- TIMER (Countdown) ---
      // Uses correctedNow (Server Time) to ensure sync with Backend.
      const nowTs = correctedNow;
      // duration is already defined above in Phantom logic
      const currentCandleStart = nowTs - (nowTs % duration);
      const nextCandleStart = currentCandleStart + duration;
      const timeLeft = Math.max(0, nextCandleStart - nowTs);

      // Only draw timer if active and chart valid
      if (renderPriceRef.current !== null && !isNaN(renderPriceRef.current)) {
        const y = priceToY(renderPriceRef.current);

        // Format MM:SS
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

        // Timer Box Logic
        const timerWidth = 46;
        const timerHeight = 20;
        // Position: "little left where previous one was" (Left of axis) and "above the line"
        const timerX = width - padding.right - timerWidth - 10;
        const timerY = y - timerHeight - 6; // Above the line

        ctx.save();
        ctx.fillStyle = "#1C1F27"; // Dark background
        ctx.strokeStyle = "#2C303A";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(timerX, timerY, timerWidth, timerHeight, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#9CA3AF"; // Gray text
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(timeText, timerX + timerWidth / 2, timerY + 14);
        ctx.restore();
      }

      // Crosshair / hover (unchanged logic)
      const hover = hoverStateRef.current;
      if (hover && hover.x != null && hover.y != null && hover.index != null) {
        const hoverIndex = hover.index;
        if (hoverIndex >= 0 && hoverIndex < renderCandles.length) {
          const cx = indexToX(hoverIndex) + candleWidth / 2;
          const cy = priceToY(hover.price ?? visiblePrice);

          ctx.save();
          ctx.strokeStyle = "rgba(200, 210, 240, 0.6)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.moveTo(cx, padding.top);
          ctx.lineTo(cx, height - padding.bottom);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(padding.left, cy);
          ctx.lineTo(width, cy); // Draw grid line to the VERY EDGE of screen (was width - padding.right)
          ctx.stroke();
          ctx.restore();

          // Price box
          const pbWidth = 70;
          const pbHeight = 22;
          const pbX = padding.left - pbWidth - 6;
          const pbY = cy - pbHeight / 2;

          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.beginPath();
          ctx.roundRect(pbX, pbY, pbWidth, pbHeight, 4);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = "#e5e7eb";
          ctx.font = "11px monospace";
          ctx.textAlign = "center";
          ctx.textAlign = "center";
          ctx.fillText(
            formatPrice(hover.price ?? visiblePrice),
            pbX + pbWidth / 2,
            pbY + pbHeight / 2 + 3
          );
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentPrice, dimensions, timeframe, direction, activeTrades]);

  const handlePointerMove = (event) => {
    if (!containerRef.current || !canvasRef.current || !layoutRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const { padding, pastWidth, candleFullWidth, candleWidth, indexToX } = layoutRef.current;

    const renderCandles = renderCandlesRef.current;
    if (!renderCandles.length) {
      hoverStateRef.current = { x: null, y: null, price: null, index: null, time: null };
      return;
    }

    // Inverse calculation using exact shared layout
    const calculatedIndex = Math.round(
      renderCandles.length - 1 + (x - padding.left - pastWidth - scrollOffsetRef.current) / candleFullWidth
    );

    let nearestIndex = null;
    let nearestDist = Infinity;

    if (calculatedIndex >= 0 && calculatedIndex < renderCandles.length) {
      nearestIndex = calculatedIndex;
      const cx = indexToX(nearestIndex) + candleWidth / 2;
      nearestDist = Math.abs(cx - x);
    }

    // Relaxed distance check (within full slot width) to capture gaps
    if (nearestIndex == null || nearestDist > candleFullWidth) {
      hoverStateRef.current = { x: null, y: null, price: null, index: null, time: null };
      return;
    }

    const candle = renderCandles[nearestIndex];
    const price = candle.close;
    let timeLabel = "";
    if (candle.timestamp) {
      const d = new Date(candle.timestamp);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      timeLabel = `${hh}:${mm}:${ss}`;
    }

    hoverStateRef.current = {
      x,
      y,
      price,
      index: nearestIndex,
      time: timeLabel,
    };
  };

  const handlePointerLeave = () => {
    hoverStateRef.current = { x: null, y: null, price: null, index: null, time: null };
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = -event.deltaY;
    const zoomStep = 0.1;
    const current = zoomRef.current;
    const next = delta > 0 ? current + zoomStep : current - zoomStep;
    zoomRef.current = Math.min(3, Math.max(0.5, next));
  };

  const handlePointerDown = (event) => {
    isPanningRef.current = true;
    lastPanXRef.current = event.clientX;
  };

  const handlePointerUp = () => {
    isPanningRef.current = false;
  };

  const handlePointerMovePan = (event) => {
    if (!isPanningRef.current) return;
    const dx = event.clientX - lastPanXRef.current;
    lastPanXRef.current = event.clientX;
    scrollOffsetRef.current += dx;
  };

  const handleMouseMove = (event) => {
    handlePointerMove(event);
    handlePointerMovePan(event);
  };

  // --- TOUCH HANDLING (Mobile) ---
  const handleTouchStart = (event) => {
    // Prevent default to avoid some browser gestures, though specific prevention is in move
    const touch = event.touches[0];
    isPanningRef.current = true;
    lastPanXRef.current = touch.clientX;
    // Also update hover crosshair if needed, or clear it
    handlePointerLeave();
  };

  const handleTouchMove = (event) => {
    // Critical: Prevent page scroll while panning chart
    // event.preventDefault(); // React synthetic events might need passive: false in config, but usually works here if not passive.
    // simpler: handled by touch-action: none CSS usually, but let's try direct logic.

    if (!isPanningRef.current) return;
    const touch = event.touches[0];
    const dx = touch.clientX - lastPanXRef.current;
    lastPanXRef.current = touch.clientX;
    scrollOffsetRef.current += dx;

    // Optional: Update crosshair for touch? 
    // Usually touch-drag implies panning, so we skip crosshair updates to avoid confusion or lag.
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    handlePointerLeave();
  };


  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-lg overflow-hidden touch-none" // Added touch-none for CSS-level scroll prevention
      onMouseMove={handleMouseMove}
      onMouseLeave={handlePointerLeave}
      onWheel={handleWheel}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      // Touch Events
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Loading state */}
      <AnimatePresence>
        {!isChartReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading chart data...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}