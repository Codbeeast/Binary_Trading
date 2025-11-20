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
  const pixelsPerMsRef = useRef(0.04); // tuned for smooth flow
  const lastTimestampRef = useRef(null);

  // Interaction refs
  const isPanningRef = useRef(false);
  const lastPanXRef = useRef(0);
  const zoomRef = useRef(1); // 1 = default zoom
  const hoverStateRef = useRef({ x: null, y: null, price: null, index: null, time: null });

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
    const updated = candles.map((c, idx) => {
      const prev = existing[idx];
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
          timestamp: c.timestamp,
        };
      }
      return {
        ...prev,
        targetOpen: c.open,
        targetHigh: c.high,
        targetLow: c.low,
        targetClose: c.close,
        timestamp: c.timestamp,
      };
    });

    renderCandlesRef.current = updated;
  }, [candles]);

  // Draw chart with 60 FPS loop and interpolation
  useEffect(() => {
    if (!canvasRef.current || !dimensions.width) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size with devicePixelRatio scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = { top: 40, right: 100, bottom: 40, left: 60 };

    const updateAndDraw = (timestamp) => {
      const width = dimensions.width;
      const height = dimensions.height;
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Time-based delta for smooth scrolling
      if (lastTimestampRef.current == null) lastTimestampRef.current = timestamp;
      const deltaMs = Math.min(32, timestamp - lastTimestampRef.current);
      lastTimestampRef.current = timestamp;

      // Interpolate price
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

      // Interpolate candles (especially last / hot candle)
      const renderCandles = renderCandlesRef.current;
      const lerpFactor = 0.2;
      for (let i = 0; i < renderCandles.length; i++) {
        const c = renderCandles[i];
        c.open += (c.targetOpen - c.open) * lerpFactor;
        c.high += (c.targetHigh - c.high) * lerpFactor;
        c.low += (c.targetLow - c.low) * lerpFactor;
        c.close += (c.targetClose - c.close) * lerpFactor;
      }

      // Price range based on candles + visible price
      const priceArray = renderCandles.length
        ? renderCandles.flatMap((c) => [c.high, c.low])
        : [visiblePrice, visiblePrice];
      const maxPrice = Math.max(...priceArray, visiblePrice);
      const minPrice = Math.min(...priceArray, visiblePrice);
      const rawRange = maxPrice - minPrice || 1;
      const priceBuffer = rawRange * 0.15;
      const yMax = maxPrice + priceBuffer;
      const yMin = minPrice - priceBuffer;
      const yRange = yMax - yMin || 1;

      const priceToY = (price) => {
        return padding.top + chartHeight - ((price - yMin) / yRange) * chartHeight;
      };

      // Horizontal layout: reserve future area on the right
      const futureRatio = 0.22;
      const futureWidth = chartWidth * futureRatio;
      const pastWidth = chartWidth - futureWidth;

        const baseCandleWidth = Math.min(pastWidth / Math.max(renderCandles.length, 35), 16);
      const candleWidth = baseCandleWidth * zoomRef.current;
      const spacing = 3 * zoomRef.current;
      const totalCandleSpan = (candleWidth + spacing) * renderCandles.length;

      // Auto-scroll with time-based movement when not panning
      if (!isPanningRef.current) {
        const pxPerMs = pixelsPerMsRef.current;
        scrollOffsetRef.current -= pxPerMs * deltaMs;
      }

      // Clamp scroll so latest candles stay near left edge of future area
      const maxOffset = Math.max(0, totalCandleSpan - pastWidth);
      if (scrollOffsetRef.current < -maxOffset) scrollOffsetRef.current = -maxOffset;
      if (scrollOffsetRef.current > 0) scrollOffsetRef.current = 0;

      const indexToX = (index) => {
        const baseX = padding.left + pastWidth - (renderCandles.length - 1 - index) * (candleWidth + spacing);
        return baseX + scrollOffsetRef.current;
      };

      // Clear and background (uniform across entire chart like broker)
      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#14171A");
      bgGradient.addColorStop(1, "#1A1D20");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Grid (very thin, subtle, like broker screenshot)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 0.5;

      const gridLines = 8;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const price = yMax - (yRange / gridLines) * i;
        ctx.fillStyle = "#A6ABB5";
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(price.toFixed(2), padding.left - 10, y + 4);
      }

      const verticalLines = 10;
      for (let i = 0; i <= verticalLines; i++) {
        const x = padding.left + (pastWidth / verticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }

      // Draw candles
      const wickWidth = 2;
      renderCandles.forEach((candle, index) => {
        const x = indexToX(index);

        if (x + candleWidth < padding.left || x > padding.left + pastWidth) {
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

        // Body with subtle rounded corners approximation
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

        // Glow for last few candles
        if (index >= renderCandles.length - 3) {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.restore();
        }
      });

      // Price line across entire chart:
      //  - dashed over candle area (left)
      //  - solid over future area (right)
      const priceY = priceToY(visiblePrice);
      const lineMidX = padding.left + pastWidth; // boundary between candles and future zone
      const lineEndX = width - padding.right + 10;

      const priceColor =
        direction === "up" ? "#18D67D" : direction === "down" ? "#E65252" : "#6B7280";

      ctx.save();
      ctx.strokeStyle = priceColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = priceColor;
      ctx.shadowBlur = 15;

      // Dashed segment over left candle area
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceY);
      ctx.lineTo(lineMidX, priceY);
      ctx.stroke();

      // Solid segment over future area on the right
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(lineMidX, priceY);
      ctx.lineTo(lineEndX, priceY);
      ctx.stroke();
      ctx.restore();

      // Price label
      const labelWidth = 96;
      const labelHeight = 30;
      const labelX = width - padding.right + 5;
      const labelY = priceY - labelHeight / 2;

      ctx.save();
      ctx.fillStyle = "#2C2F36";
      ctx.shadowColor = priceColor;
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

      // Timeframe label and meta info
      ctx.fillStyle = "rgba(160, 170, 200, 0.9)";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(timeframe.toUpperCase(), padding.left + 10, padding.top - 12);

      ctx.fillStyle = "rgba(160, 170, 200, 0.7)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `${renderCandles.length} candles`,
        width - padding.right - 10,
        padding.top - 12
      );

      // Crosshair / hover
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

          // Price box on Y axis
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

          // Time box on X axis
          const tbWidth = 80;
          const tbHeight = 22;
          const tbX = cx - tbWidth / 2;
          const tbY = height - padding.bottom + 6;

          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.beginPath();
          ctx.roundRect(tbX, tbY, tbWidth, tbHeight, 4);
          ctx.fill();
          ctx.restore();

          const timeLabel = hover.time || "";
          ctx.fillStyle = "#e5e7eb";
          ctx.font = "11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(timeLabel, tbX + tbWidth / 2, tbY + tbHeight / 2 + 3);
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

  const handlePointerMove = (event) => {
    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const padding = { top: 40, right: 100, bottom: 40, left: 60 };
    const width = rect.width;
    const chartWidth = width - padding.left - padding.right;
    const pastWidth = chartWidth * (1 - 0.22);

    const renderCandles = renderCandlesRef.current;
    if (!renderCandles.length) {
      hoverStateRef.current = { x: null, y: null, price: null, index: null, time: null };
      return;
    }

    const baseCandleWidth = Math.min(pastWidth / Math.max(renderCandles.length, 50), 18);
    const candleWidth = baseCandleWidth * zoomRef.current;
    const spacing = 2 * zoomRef.current;

    const totalCandleSpan = (candleWidth + spacing) * renderCandles.length;
    const maxOffset = Math.max(0, totalCandleSpan - pastWidth);
    const clampedOffset = Math.max(-maxOffset, Math.min(0, scrollOffsetRef.current));

    const indexToX = (index) => {
      const baseX = padding.left + pastWidth - (renderCandles.length - 1 - index) * (candleWidth + spacing);
      return baseX + clampedOffset;
    };

    let nearestIndex = null;
    let nearestDist = Infinity;
    for (let i = 0; i < renderCandles.length; i++) {
      const cx = indexToX(i) + candleWidth / 2;
      const dist = Math.abs(cx - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex == null) {
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
      className="relative w-full h-[500px] rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handlePointerLeave}
      onWheel={handleWheel}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Loading state */}
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
