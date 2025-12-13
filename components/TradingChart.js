"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TradingChart({ candles, currentPrice, timeframe, direction }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
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
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: height || 500 });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Keep renderCandlesRef in sync with incoming candles (target state for interpolation)
  useEffect(() => {
    if (!candles || candles.length === 0) {
      renderCandlesRef.current = [];
      return;
    }

    const existing = renderCandlesRef.current;

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

    // *ENHANCEMENT: Increased padding for left price labels to hide candles*
    const padding = { top: 40, right: 100, bottom: 40, left: 80 }; // Increased left padding
    
    const updateAndDraw = (timestamp) => {
      const width = dimensions.width;
      const height = dimensions.height;
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Time-based delta for smooth scrolling
      if (lastTimestampRef.current == null) lastTimestampRef.current = timestamp;
      const deltaMs = Math.min(32, timestamp - lastTimestampRef.current);
      lastTimestampRef.current = timestamp;

      // Interpolate price (unchanged)
      if (renderPriceRef.current == null) {
        renderPriceRef.current = currentPrice;
      } else {
        const target = currentPrice;
        const visible = renderPriceRef.current;
        let velocity = priceVelocityRef.current;

        const stiffness = 0.05;
        const damping = 0.9;
        const accel = (target - visible) * stiffness;
        velocity += accel;
        velocity *= damping;
        priceVelocityRef.current = velocity;
        renderPriceRef.current = visible + velocity;
      }

      const visiblePrice = renderPriceRef.current ?? currentPrice;

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

      // Layout calculations (unchanged)
      const futureRatio = 0.2; 
      const futureWidth = chartWidth * futureRatio;
      const pastWidth = chartWidth - futureWidth;

      const targetCandleCount = 25; 
      const candleFullWidth = pastWidth / targetCandleCount; 
      const candleWidth = candleFullWidth * 0.7; 
      const spacing = candleFullWidth * 0.3; 
      
      const totalCandleSpan = (candleWidth + spacing) * renderCandles.length;
      
      const indexToX = (index) => {
        const baseX = padding.left + pastWidth - (renderCandles.length - 1 - index) * candleFullWidth;
        return baseX + scrollOffsetRef.current;
      };

      // Price range calculation (unchanged)
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

      const maxVal = Math.max(...priceArray, visiblePrice);
      const minVal = Math.min(...priceArray, visiblePrice);

      const maxDiff = Math.max(Math.abs(maxVal - visiblePrice), Math.abs(minVal - visiblePrice));

      const buffer = maxDiff * 0.2 || 0.0001;

      const halfRange = maxDiff + buffer;
      const yMax = visiblePrice + halfRange;
      const yMin = visiblePrice - halfRange;
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
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      const verticalLines = 10;
      for (let i = 0; i <= verticalLines; i++) {
        const x = padding.left + (pastWidth / verticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }

      // 3. Draw candles (The main content)
      const wickWidth = 2;
      renderCandles.forEach((candle, index) => {
        const x = indexToX(index);

        // Optimization: only draw if visible and inside the chart box
        if (x + candleWidth < padding.left || x > width - padding.right) {
          return;
        }

        const openY = priceToY(candle.open);
        const closeY = priceToY(candle.close);
        const highY = priceToY(candle.high);
        const lowY = priceToY(candle.low);

        const isBullish = candle.close >= candle.open;
        const color = isBullish ? "#18D67D" : "#E65252";
        const bodyHeight = Math.abs(closeY - openY);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = wickWidth;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, highY);
        ctx.lineTo(x + candleWidth / 2, lowY);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(bodyHeight, 1.5);
        const radius = Math.min(3, candleWidth / 2);
        const bw = candleWidth - 2;
        const bx = x + 1;

        ctx.beginPath();
        ctx.moveTo(bx, bodyY + radius);
        ctx.lineTo(bx, bodyY + bodyH - radius);
        ctx.quadraticCurveTo(bx, bodyY + bodyH, bx + radius, bodyY + bodyH);
        ctx.lineTo(bx + bw - radius, bodyY + bodyH);
        ctx.quadraticCurveTo(bx + bw, bodyY + bodyH, bx + bw, bodyY + bodyH - radius);
        ctx.lineTo(bx + bw, bodyY + radius);
        ctx.quadraticCurveTo(bx + bw, bodyY, bx + bw - radius, bodyY);
        ctx.lineTo(bx + radius, bodyY);
        ctx.quadraticCurveTo(bx, bodyY, bx, bodyY + radius);
        ctx.closePath();
        ctx.fill();

        // Glow for last candle
        if (index === renderCandles.length - 1) {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.restore();
        }
      });
      
      // 4. FIX: Draw opaque background over the left padding area (where numbers are)
      // This MUST be drawn AFTER the candles to hide the part of the candle bodies that might enter this zone.
      ctx.fillStyle = bgGradient; // Use a similar dark color as chart background
      ctx.fillRect(0, 0, padding.left, height); 

      // 5. Draw Left Price Labels (Y-Axis)
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        const price = yMax - (yRange / gridLines) * i;
        
        ctx.fillStyle = "#A6ABB5"; // Gray color
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(price.toFixed(2), padding.left - 15, y + 4); 
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
      ctx.restore();

      // 7. Price label (Right side)
      const labelWidth = 96;
      const labelHeight = 30;
      const labelX = width - padding.right + 5;
      const labelY = priceY - labelHeight / 2;

      const labelBgColor = "#2C2F36";

      ctx.save();
      ctx.fillStyle = labelBgColor; 
      ctx.shadowColor = neutralPriceColor; 
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#E3E5E8";
      ctx.font = "500 13px system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        (visiblePrice || currentPrice).toFixed(2),
        labelX + labelWidth / 2,
        labelY + labelHeight / 2 + 5
      );

      // 8. Timeframe label
      ctx.fillStyle = "rgba(160, 170, 200, 0.9)";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(timeframe.toUpperCase(), padding.left + 10, padding.top - 12);
      
      // 9. Aesthetic Clean-up: Clear the right-top area (Removes the small red line artifact)
      ctx.fillStyle = bgGradient; 
      ctx.fillRect(width - padding.right - 2, 0, padding.right + 2, padding.top);

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
          ctx.lineTo(width - padding.right, cy);
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
          ctx.fillText(
            (hover.price ?? visiblePrice).toFixed(2),
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

    // *UPDATE: Use the increased left padding from the draw loop logic*
    const padding = { top: 40, right: 100, bottom: 40, left: 80 }; 

    const width = rect.width;
    const chartWidth = width - padding.left - padding.right;

    const futureRatio = 0.2;
    const futureWidth = chartWidth * futureRatio;
    const pastWidth = chartWidth - futureWidth;

    const renderCandles = renderCandlesRef.current;
    if (!renderCandles.length) {
      hoverStateRef.current = { x: null, y: null, price: null, index: null, time: null };
      return;
    }

    const targetCandleCount = 25; 
    const candleFullWidth = pastWidth / targetCandleCount; 
    const candleWidth = candleFullWidth * 0.7;
    const spacing = candleFullWidth * 0.3;

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

      {/* Loading state (unchanged) */}
      <AnimatePresence>
        {candles.length === 0 && (
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