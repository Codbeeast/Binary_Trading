'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PriceDisplay({ price, direction, change }) {
  const isPositive = parseFloat(change) >= 0;
  
  const getDirectionIcon = () => {
    if (direction === 'up') return <TrendingUp className="w-6 h-6" />;
    if (direction === 'down') return <TrendingDown className="w-6 h-6" />;
    return <Minus className="w-6 h-6" />;
  };

  const getDirectionColor = () => {
    if (direction === 'up') return 'text-green-400';
    if (direction === 'down') return 'text-red-400';
    return 'text-gray-400';
  };

  const getGlowClass = () => {
    if (direction === 'up') return 'glow-green';
    if (direction === 'down') return 'glow-red';
    return 'glow-blue';
  };

  return (
    <div className={`chart-container p-6 ${getGlowClass()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: direction === 'up' ? [0, 5, 0] : direction === 'down' ? [0, -5, 0] : 0
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className={`p-3 rounded-xl ${
              direction === 'up' ? 'bg-green-500/20' : 
              direction === 'down' ? 'bg-red-500/20' : 
              'bg-gray-500/20'
            }`}
          >
            <span className={getDirectionColor()}>
              {getDirectionIcon()}
            </span>
          </motion.div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Current Price</p>
            <motion.div
              key={price}
              initial={{ scale: 1.1, color: direction === 'up' ? '#22c55e' : direction === 'down' ? '#ef4444' : '#6b7280' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold font-mono"
            >
              ${price.toFixed(2)}
            </motion.div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-400 mb-1">24h Change</p>
          <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change}%
          </div>
        </div>
      </div>
    </div>
  );
}
