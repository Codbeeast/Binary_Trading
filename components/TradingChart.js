'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TradingChart({ candles, currentPrice, timeframe, direction }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef(null);
  const scrollOffsetRef = useRef(0);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: height || 500 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || !dimensions.width || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = dimensions.width * window.devicePixelRatio;
    canvas.height = dimensions.height * window.devicePixelRatio;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const padding = { top: 40, right: 80, bottom: 40, left: 60 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const maxPrice = Math.max(...prices, currentPrice);
    const minPrice = Math.min(...prices, currentPrice);
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.1;

    const yMax = maxPrice + priceBuffer;
    const yMin = minPrice - priceBuffer;
    const yRange = yMax - yMin;

    // Helper functions
    const priceToY = (price) => {
      return padding.top + chartHeight - ((price - yMin) / yRange) * chartHeight;
    };

    const indexToX = (index, total) => {
      const candleWidth = Math.min(chartWidth / Math.max(total, 50), 20);
      const spacing = 2;
      const totalWidth = (candleWidth + spacing) * total;
      
      // Auto-scroll effect
      scrollOffsetRef.current = Math.max(0, totalWidth - chartWidth);
      
      return padding.left + index * (candleWidth + spacing) - scrollOffsetRef.current;
    };

    // Animation loop
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      bgGradient.addColorStop(0, 'rgba(20, 20, 30, 0.95)');
      bgGradient.addColorStop(1, 'rgba(30, 30, 45, 0.95)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(100, 100, 120, 0.1)';
      ctx.lineWidth = 1;

      // Horizontal grid lines (price levels)
      const gridLines = 8;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(dimensions.width - padding.right, y);
        ctx.stroke();

        // Price labels
        const price = yMax - (yRange / gridLines) * i;
        ctx.fillStyle = 'rgba(150, 150, 170, 0.7)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(price.toFixed(2), padding.left - 10, y + 4);
      }

      // Vertical grid lines (time)
      const verticalLines = 10;
      for (let i = 0; i <= verticalLines; i++) {
        const x = padding.left + (chartWidth / verticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, dimensions.height - padding.bottom);
        ctx.stroke();
      }

      // Draw candles
      const candleWidth = Math.min(chartWidth / Math.max(candles.length, 50), 20);
      const wickWidth = 2;

      candles.forEach((candle, index) => {
        const x = indexToX(index, candles.length);
        
        // Skip if outside visible area
        if (x + candleWidth < padding.left || x > dimensions.width - padding.right) {
          return;
        }

        const openY = priceToY(candle.open);
        const closeY = priceToY(candle.close);
        const highY = priceToY(candle.high);
        const lowY = priceToY(candle.low);

        const isBullish = candle.close >= candle.open;
        const color = isBullish ? '#22c55e' : '#ef4444';
        const bodyHeight = Math.abs(closeY - openY);

        // Draw wick
        ctx.strokeStyle = color;
        ctx.lineWidth = wickWidth;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, highY);
        ctx.lineTo(x + candleWidth / 2, lowY);
        ctx.stroke();

        // Draw body
        ctx.fillStyle = color;
        const bodyY = Math.min(openY, closeY);
        ctx.fillRect(x, bodyY, candleWidth - 2, Math.max(bodyHeight, 1));

        // Add glow for recent candles
        if (index >= candles.length - 3) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillRect(x, bodyY, candleWidth - 2, Math.max(bodyHeight, 1));
          ctx.shadowBlur = 0;
        }
      });

      // Draw current price line
      const currentY = priceToY(currentPrice);
      ctx.strokeStyle = direction === 'up' ? '#22c55e' : direction === 'down' ? '#ef4444' : '#6b7280';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, currentY);
      ctx.lineTo(dimensions.width - padding.right, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw current price label
      const labelWidth = 80;
      const labelHeight = 30;
      const labelX = dimensions.width - padding.right + 5;
      const labelY = currentY - labelHeight / 2;

      ctx.fillStyle = direction === 'up' ? '#22c55e' : direction === 'down' ? '#ef4444' : '#6b7280';
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentPrice.toFixed(2), labelX + labelWidth / 2, labelY + labelHeight / 2 + 5);

      // Draw timeframe label
      ctx.fillStyle = 'rgba(100, 100, 120, 0.8)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(timeframe.toUpperCase(), padding.left + 10, padding.top - 15);

      // Draw candle count
      ctx.fillStyle = 'rgba(150, 150, 170, 0.6)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${candles.length} candles`, dimensions.width - padding.right - 10, padding.top - 15);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [candles, currentPrice, dimensions, timeframe, direction]);

  return (
    <div ref={containerRef} className="relative w-full h-[500px] rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      
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
