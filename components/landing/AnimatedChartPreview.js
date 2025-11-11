'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, DollarSign } from 'lucide-react';

export default function AnimatedChartPreview() {
  const canvasRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);
  const dataPointsRef = useRef([]);

  // KPI data
  const kpis = [
    { label: 'Total Trades', value: '$350,240', icon: DollarSign, color: 'text-brand-green' },
    { label: 'Active Users', value: '12.3k', icon: Activity, color: 'text-brand-cyan' },
    { label: 'Avg. Payout', value: '82%', icon: TrendingUp, color: 'text-green-400' },
  ];

  // Mouse parallax effect
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 25;
    const y = (e.clientY - rect.top - rect.height / 2) / 25;
    setMousePosition({ x, y });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize data points
    const numPoints = 60;
    let basePrice = 100;
    
    for (let i = 0; i < numPoints; i++) {
      const change = (Math.random() - 0.48) * 3;
      basePrice += change;
      dataPointsRef.current.push({
        price: basePrice,
        volume: Math.random() * 50 + 10,
      });
    }

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 5; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update data (simulate live ticks)
      if (Math.random() > 0.7) {
        const lastPrice = dataPointsRef.current[dataPointsRef.current.length - 1].price;
        const change = (Math.random() - 0.48) * 2;
        dataPointsRef.current.push({
          price: lastPrice + change,
          volume: Math.random() * 50 + 10,
        });
        
        if (dataPointsRef.current.length > numPoints) {
          dataPointsRef.current.shift();
        }
      }

      // Find price range
      const prices = dataPointsRef.current.map(d => d.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice || 1;

      // Draw candlesticks
      const candleWidth = width / numPoints;
      
      dataPointsRef.current.forEach((point, i) => {
        const x = (i / numPoints) * width;
        const open = i > 0 ? dataPointsRef.current[i - 1].price : point.price;
        const close = point.price;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        
        const isGreen = close >= open;
        const color = isGreen ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        
        // Normalize to canvas height
        const yOpen = height - ((open - minPrice) / priceRange) * height * 0.8 - height * 0.1;
        const yClose = height - ((close - minPrice) / priceRange) * height * 0.8 - height * 0.1;
        const yHigh = height - ((high - minPrice) / priceRange) * height * 0.8 - height * 0.1;
        const yLow = height - ((low - minPrice) / priceRange) * height * 0.8 - height * 0.1;
        
        // Draw wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, yHigh);
        ctx.lineTo(x + candleWidth / 2, yLow);
        ctx.stroke();
        
        // Draw body
        ctx.fillStyle = color;
        const bodyHeight = Math.abs(yClose - yOpen) || 1;
        ctx.fillRect(
          x + candleWidth * 0.2,
          Math.min(yOpen, yClose),
          candleWidth * 0.6,
          bodyHeight
        );
      });

      // Draw glow line on top
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(154, 227, 78, 0)');
      gradient.addColorStop(0.5, 'rgba(154, 227, 78, 0.6)');
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0.6)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      dataPointsRef.current.forEach((point, i) => {
        const x = (i / numPoints) * width;
        const y = height - ((point.price - minPrice) / priceRange) * height * 0.8 - height * 0.1;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      style={{
        transform: `perspective(1000px) rotateX(${mousePosition.y}deg) rotateY(${mousePosition.x}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-transparent to-brand-cyan/20 blur-3xl animate-glow-pulse" />
      
      {/* Main chart card */}
      <div className="relative bg-dark-700/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Live Market</h3>
            <p className="text-sm text-gray-400">Real-time visualization</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
            <span className="text-xs text-gray-400 font-mono">LIVE</span>
          </div>
        </div>

        {/* Chart canvas */}
        <div className="relative h-80 p-6">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>

        {/* KPI chips */}
        <div className="px-6 pb-6 grid grid-cols-3 gap-3">
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.5 }}
              className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-3 border border-white/5 hover:border-brand-green/30 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-gray-400">{kpi.label}</span>
              </div>
              <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Control panel overlay */}
        <div className="absolute top-20 right-6 bg-dark-800/90 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded bg-white/5 hover:bg-brand-green/20 transition-colors flex items-center justify-center text-xs text-gray-400 hover:text-brand-green">
              1m
            </button>
            <button className="w-8 h-8 rounded bg-brand-green/20 text-brand-green transition-colors flex items-center justify-center text-xs font-semibold">
              5m
            </button>
            <button className="w-8 h-8 rounded bg-white/5 hover:bg-brand-green/20 transition-colors flex items-center justify-center text-xs text-gray-400 hover:text-brand-green">
              15m
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
