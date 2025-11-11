'use client';

import { Activity, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarketStats({ stats, marketState }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="chart-container p-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Ticks/Min</p>
            <p className="text-xl font-bold">{stats.ticksPerMinute}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="chart-container p-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">24h High</p>
            <p className="text-xl font-bold">${stats.high24h}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="chart-container p-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">24h Low</p>
            <p className="text-xl font-bold">${stats.low24h}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="chart-container p-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Volatility</p>
            <p className="text-xl font-bold">{marketState.volatility.toFixed(1)}x</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
