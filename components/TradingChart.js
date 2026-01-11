"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TradingChart({ candles, currentPrice, timeframe, direction, activeTrades = [], onCandlePersist }) {
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

  // Interaction refs
  const isPanningRef = useRef(false);
  const lastPanXRef = useRef(0);
  const zoomRef = useRef(1.0); // 1.0 = default zoom (shows ~45 candles)
  const hoverStateRef = useRef({ x: null, y: null, price: null, index: null, time: null });

  // Visual Noise Refs
  const noiseRef = useRef(0);
  const noiseTargetRef = useRef(0);

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

    const updated = candles.map((c) => {
      const ts = new Date(c.timestamp).getTime();
      const prev = existingMap.get(ts);

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

      if (prev.isClientModified) {
        // SNAP FIX: Trust local visual history over server updates for this candle
        return prev;
      }

      return {
        ...prev,
        targetOpen: c.open,
        targetHigh: c.high,
        targetLow: c.low,
        targetClose: c.close,
        timestamp: new Date(c.timestamp),
        isNew: false
      };
    });

    renderCandlesRef.current = updated;
  }, [candles]);

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
    // Padding adjusted: Top: 50, Right: 75, Bottom: 40
    const padding = { top: 50, right: 75, bottom: 40, left: 0 };

    // Dynamic Price Formatter
    const formatPrice = (p) => {
      if (p == null || isNaN(p)) return "0.00";
      const abs = Math.abs(p);
      if (abs < 2.0) return p.toFixed(5); // e.g. 0.00012
      if (abs < 50.0) return p.toFixed(4); // e.g. 23.1234
      return p.toFixed(2); // e.g. 100.00
    };

    const updateAndDraw = (timestamp) => {
      const width = dimensions.width;
      const height = dimensions.height;
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

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
      if (renderPriceRef.current == null) {
        renderPriceRef.current = currentPrice;
      } else {
        // Micro-Jitter Logic (Binomo-like "Flexibility")
        // 1. Update random target occasionally (SLOWER: 2% chance per frame)
        if (Math.random() < 0.02) {
          const scale = (currentPrice || 100) * 0.00015; // Moderate amplitude
          noiseTargetRef.current = (Math.random() - 0.5) * scale;
        }
        // 2. Interpolate noise (smoothed random walk - MUCH SLOWER)
        const NOISE_SMOOTHING = 0.005;
        noiseRef.current += (noiseTargetRef.current - noiseRef.current) * NOISE_SMOOTHING;

        const target = currentPrice + noiseRef.current; // Target includes noise
        const visible = renderPriceRef.current;
        let velocity = priceVelocityRef.current;

        // Physics: Slower, more stable
        const stiffness = 0.01;
        const damping = 0.95;
        const accel = (target - visible) * stiffness;
        velocity += accel;
        velocity *= damping;
        priceVelocityRef.current = velocity;
        renderPriceRef.current = visible + velocity;
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
      const lerpFactor = 0.2;
      for (let i = 0; i < renderCandles.length; i++) {
        const c = renderCandles[i];
        c.open += (c.targetOpen - c.open) * lerpFactor;
        c.high += (c.targetHigh - c.high) * lerpFactor;
        c.low += (c.targetLow - c.low) * lerpFactor;
        c.close += (c.targetClose - c.close) * lerpFactor;
      }

      // Layout calculations
      // Layout calculations
      const futureRatio = 0.12; // Reduced future space (was 0.2) to fill more screen with candles
      const futureWidth = chartWidth * futureRatio;
      const pastWidth = chartWidth - futureWidth;

      const zoom = zoomRef.current || 1.0;

      // Dynamic candle count based on screen width
      const isMobile = width < 768;
      const baseCandleCount = isMobile ? 28 : 70; // Even fewer candles on mobile = Wider candles
      const targetCandleCount = baseCandleCount * zoom;

      const candleFullWidth = pastWidth / targetCandleCount;
      const candleWidth = candleFullWidth * 0.70; // Slightly wider (User request)
      const spacing = candleFullWidth * 0.30;

      const totalCandleSpan = (candleWidth + spacing) * renderCandles.length;

      const indexToX = (index) => {
        const baseX = padding.left + pastWidth - (renderCandles.length - 1 - index) * candleFullWidth;
        return baseX + scrollOffsetRef.current;
      };

      // Price range calculation
      const visibleCandles = [];
      const viewMinX = padding.left - candleWidth;
      const viewMaxX = width - padding.right + candleWidth;

      for (let i = 0; i < renderCandles.length; i++) {
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

      // Lazy Camera Logic (Stable Range)
      // Instead of centering the price, we center the "Active Zone" (Highs/Lows of visible candles)
      // This allows the price line to move up/down naturally within the screen.

      const range = maxVal - minVal;
      // Increased padding factor to 0.3 (User request: "decrease length", i.e., zoom out vertically)
      const paddingFactor = 0.3;
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

        // Draw Time Label
        // Calculate which candle index is at this X
        // x = padding.left + pastWidth - (renderCandles.length - 1 - index) * candleFullWidth + scrollOffset
        // Reversing the indexToX formula approx:
        // distance from right = width - padding.right - x
        // offset from right edge in pixels = distance + scrollOffset
        // We can approximate by finding the closest candle to this X

        // Simpler approach: Map 'i' 0..N directly to timestamp range visible
        // But since we scroll, we need actual timestamps.
        // Let's use the candle nearest to this X.

        // Invert indexToX logic:
        // x = padding.left + pastWidth - (count - 1 - index) * candleWidth + scroll
        // x - scroll - padding.left - pastWidth = - (count - 1 - index) * candleWidth
        // (x - scroll - padding.left - pastWidth) / -candleWidth = count - 1 - index
        // index = (count - 1) + (x - scroll - padding.left - pastWidth) / candleWidth

        const approxIndex = Math.round(
          (renderCandles.length - 1) +
          (x - scrollOffsetRef.current - (padding.left + pastWidth)) / candleFullWidth
        );

        if (renderCandles[approxIndex]) {
          const d = new Date(renderCandles[approxIndex].timestamp);
          const timeStr = `${d.getHours().toString().padStart(2, 0)}:${d.getMinutes().toString().padStart(2, 0)}`;
          ctx.fillText(timeStr, x, height - padding.bottom + 20);
        }
      }

      // 3. Draw candles (The main content)
      const wickWidth = 2.0;
      const MIN_BODY_HEIGHT = 2; // Minimum visible body height in pixels

      // Helper for deterministic noise (seeded by timestamp)
      const getPseudoRandom = (seed) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x); // 0..1
      };

      // HOVER DETECTION FOR TOOLTIP
      let hoveredCandleData = null;
      if (hoverStateRef.current.x !== null) {
        const mX = hoverStateRef.current.x;
        // Invert index logic again
        const idx = Math.round(
          (renderCandles.length - 1) +
          (mX - scrollOffsetRef.current - (padding.left + pastWidth)) / candleFullWidth
        );
        if (renderCandles[idx]) {
          hoveredCandleData = renderCandles[idx];
        }
      }


      renderCandles.forEach((candle, index) => {
        const x = indexToX(index);

        // Optimization: only draw if visible and inside the chart box
        if (x + candleWidth < padding.left || x > width - padding.right) {
          return;
        }

        let { open, close, high, low, timestamp } = candle;
        const ts = timestamp ? timestamp.getTime() : 0;

        // "Artificial Life" REMOVED: Since we now persist the exact client-side visual state to the DB,
        // we no longer need to fake it on load. The data from the server is now "organic" enough.

        // SYNC LATEST CANDLE WITH VISIBLE PRICE LINE
        if (index === renderCandles.length - 1) {
          const ts = candle.timestamp ? candle.timestamp.getTime() : 0;
          let visual = activeCandleVisualRef.current;
          if (visual.timestamp !== ts) {
            visual = { timestamp: ts, high: -Infinity, low: Infinity };
            activeCandleVisualRef.current = visual;
          }

          close = finalVisiblePrice;

          // Update persistent visual limits
          if (close > visual.high) visual.high = close;
          if (close < visual.low) visual.low = close;

          high = Math.max(high, visual.high);
          low = Math.min(low, visual.low);

          // SNAP FIX: Commit visual state to the candle object so it persists after close
          candle.close = close;
          candle.high = high;
          candle.low = low;
          candle.targetClose = close;
          candle.targetHigh = high;
          candle.targetLow = low;
          candle.isClientModified = true;
        }

        const openY = priceToY(open);
        const closeY = priceToY(close);
        const highY = priceToY(high);
        const lowY = priceToY(low);

        const isBullish = close >= open;
        const color = isBullish ? "#18D67D" : "#E65252";

        // Body Height Logic
        let bodyTop = Math.min(openY, closeY);
        let bodyH = Math.abs(closeY - openY);

        // Enforce Minimum Visual Body Size (3px)
        const MIN_VIS_BODY = 3;
        if (bodyH < MIN_VIS_BODY) {
          const diff = MIN_VIS_BODY - bodyH;
          bodyH = MIN_VIS_BODY;
          bodyTop -= diff / 2;
        }

        // Wick Logic - Force visibility with explicit extension
        let wTop = highY;
        let wBottom = lowY;

        // 1. Top Wick (High > max(open, close))
        if (high > Math.max(open, close)) {
          // Ensure wTop is visually above bodyTop (smaller Y)
          if (wTop >= bodyTop) {
            wTop = bodyTop - 3.0; // Force 3px wick
          }
        } else {
          wTop = bodyTop;
        }

        // 2. Bottom Wick (Low < min(open, close))
        const bodyBottom = bodyTop + bodyH;
        if (low < Math.min(open, close)) {
          // Ensure wBottom is visually below bodyBottom (larger Y)
          if (wBottom <= bodyBottom) {
            wBottom = bodyBottom + 3.0; // Force 3px wick
          }
        } else {
          wBottom = bodyBottom;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = wickWidth;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, wTop);
        ctx.lineTo(x + candleWidth / 2, wBottom);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const radius = bodyH < 4 ? 0 : Math.min(3, candleWidth / 2);
        const bw = candleWidth - 1;
        const bx = x + 0.5;

        if (radius > 0) {
          ctx.beginPath();
          ctx.moveTo(bx, bodyTop + radius);
          ctx.lineTo(bx, bodyTop + bodyH - radius);
          ctx.quadraticCurveTo(bx, bodyTop + bodyH, bx + radius, bodyTop + bodyH);
          ctx.lineTo(bx + bw - radius, bodyTop + bodyH);
          ctx.quadraticCurveTo(bx + bw, bodyTop + bodyH, bx + bw, bodyTop + bodyH - radius);
          ctx.lineTo(bx + bw, bodyTop + radius);
          ctx.quadraticCurveTo(bx + bw, bodyTop, bx + bw - radius, bodyTop);
          ctx.lineTo(bx + radius, bodyTop);
          ctx.quadraticCurveTo(bx, bodyTop, bx, bodyTop + radius);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(bx, bodyTop, bw, bodyH);
        }

        // Glow for last candle
        if (index === renderCandles.length - 1) {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.fill();
          ctx.restore();
        }
      });

      // DRAW OHLC TOOLTIP (Top Left)
      if (hoveredCandleData) {
        const { open, high, low, close } = hoveredCandleData;
        ctx.save();
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";

        // Move to Top-Left area (above grid)
        const startY = 30; // 30px from top (padding.top is usually 50)
        const gapX = 100;

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

      const neutralPriceColor = "#FFD335";

      ctx.save();
      ctx.strokeStyle = neutralPriceColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = neutralPriceColor;
      ctx.shadowBlur = 15;

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

      // COUNTDOWN TIMER ON PRICE LINE
      const activeCandle = renderCandles[renderCandles.length - 1];
      if (activeCandle) {
        // Calculate remaining duration
        let duration = 0;
        // Updated map to support all timeframes (5s, 15s, 30s, 1m)
        const map = { '5s': 5000, '15s': 15000, '30s': 30000, '1m': 60000 };
        if (timeframe in map) duration = map[timeframe];

        const startTime = activeCandle.timestamp ? activeCandle.timestamp.getTime() : Date.now();
        const elapsed = Date.now() - startTime;
        const remain = Math.max(0, duration - elapsed);

        // Format MM:SS
        const totalSeconds = Math.ceil(remain / 1000);
        const mm = Math.floor(totalSeconds / 60);
        const ss = totalSeconds % 60;
        const text = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;

        // Draw Text
        ctx.save();
        ctx.fillStyle = "#E3E5E8"; // Light/White text
        ctx.font = "500 12px monospace"; // Monospace for stable jitter
        ctx.textAlign = "right";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 4;
        // Position: slightly left of the solid line end, just above the line
        ctx.fillText(text, width - padding.right - 15, priceY - 6);
        ctx.restore();
      }

      // 7. Price label (Right side)
      const labelWidth = 70; // Reduced from 96 to fit
      const labelHeight = 24; // Compact
      // Calculate X to center it in the padding area
      const labelX = width - padding.right + (padding.right - labelWidth) / 2;
      const labelY = priceY - labelHeight / 2;

      const labelBgColor = "#2C2F36";

      // Draw Price Label Box
      ctx.save();
      ctx.fillStyle = labelBgColor;
      ctx.shadowColor = neutralPriceColor;
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

      // 8. Timeframe label REMOVED as per user request (logic kept for structure)
      // ctx.fillStyle = "rgba(160, 170, 200, 0.9)";
      // ctx.font = "bold 14px sans-serif";
      // ctx.fillText(...)

      // 9. Aesthetic Clean-up: Clear the right-top area
      // Reduced height (padding.top - 15) to avoid covering the top-most price label at y=50
      ctx.fillStyle = bgGradient;
      ctx.fillRect(width - padding.right - 2, 0, padding.right + 2, padding.top - 15);

      // 10. Draw Active Trades
      if (activeTrades && activeTrades.length > 0) {
        activeTrades.forEach(trade => {
          const y = priceToY(trade.entryPrice);
          const isUp = trade.direction === 'up';
          const color = isUp ? "#10B981" : "#F43F5E"; // Emerald / Rose

          // Draw horizontal line
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);

          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();

          // Draw Direction Marker
          const markerX = width - padding.right + 10;
          const markerSize = 14;

          ctx.fillStyle = color;
          ctx.beginPath();
          if (isUp) {
            ctx.moveTo(markerX, y + markerSize / 2);
            ctx.lineTo(markerX + markerSize, y + markerSize / 2);
            ctx.lineTo(markerX + markerSize / 2, y - markerSize / 2);
          } else {
            ctx.moveTo(markerX, y - markerSize / 2);
            ctx.lineTo(markerX + markerSize, y - markerSize / 2);
            ctx.lineTo(markerX + markerSize / 2, y + markerSize / 2);
          }
          ctx.closePath();
          ctx.fill();

          // Entry point dot
          const dotX = width - padding.right;
          ctx.beginPath();
          ctx.arc(dotX, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          ctx.restore();
        });
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
  }, [currentPrice, dimensions, timeframe, direction]);

  // The rest of the component logic (pointer handlers, return JSX) remains unchanged
  const handlePointerMove = (event) => {
    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // *UPDATE: Sync with updateAndDraw padding*
    const padding = { top: 50, right: 100, bottom: 40, left: 0 };

    const width = rect.width;
    const chartWidth = width - padding.left - padding.right;

    const futureRatio = 0.12; // Sync with updateAndDraw
    const futureWidth = chartWidth * futureRatio;
    const pastWidth = chartWidth - futureWidth;

    const renderCandles = renderCandlesRef.current;
    if (!renderCandles.length) {
      hoverStateRef.current = { x: null, y: null, price: null, index: null, time: null };
      return;
    }

    // Match the zoom logic from updateAndDraw
    const zoom = zoomRef.current || 1.0;
    const targetCandleCount = 70 * zoom; // Sync with updateAndDraw
    const candleFullWidth = pastWidth / targetCandleCount;
    const candleWidth = candleFullWidth * 0.70;

    // indexToX must match EXACTLY
    const indexToX = (index) => {
      const baseX = padding.left + pastWidth - (renderCandles.length - 1 - index) * candleFullWidth;
      return baseX + scrollOffsetRef.current;
    };

    let nearestIndex = null;
    let nearestDist = Infinity;

    const calculatedIndex = Math.round(
      renderCandles.length - 1 + (x - padding.left - pastWidth - scrollOffsetRef.current) / candleFullWidth
    );

    if (calculatedIndex >= 0 && calculatedIndex < renderCandles.length) {
      nearestIndex = calculatedIndex;
      const cx = indexToX(nearestIndex) + candleWidth / 2;
      nearestDist = Math.abs(cx - x);
    }

    if (nearestIndex == null || nearestDist > candleWidth) {
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handlePointerLeave}
      onWheel={handleWheel}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
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