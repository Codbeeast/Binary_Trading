'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Users, BarChart3 } from 'lucide-react';

export default function LiveDemo() {
  const [stats, setStats] = useState({
    totalTrades: 350240,
    volume: 12.3,
    avgPayout: 82,
    activeUsers: 1847,
  });

  const [sparklineData, setSparklineData] = useState(
    Array.from({ length: 20 }, () => 50) // Static initial value to prevent hydration mismatch
  );

  // Animate stats
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        totalTrades: prev.totalTrades + Math.floor(Math.random() * 10),
        volume: prev.volume + (Math.random() - 0.5) * 0.1,
        avgPayout: Math.max(70, Math.min(95, prev.avgPayout + (Math.random() - 0.5) * 2)),
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5 - 2),
      }));

      setSparklineData((prev) => {
        const newData = [...prev.slice(1), Math.random() * 40 + 30];
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const kpiCards = [
    {
      icon: DollarSign,
      label: 'Total Volume',
      value: `$${stats.totalTrades.toLocaleString('en-US')}`,
      change: '+12.5%',
      positive: true,
      color: 'text-brand-orange',
    },
    {
      icon: Activity,
      label: 'Active Trades',
      value: `${stats.volume.toFixed(1)}k`,
      change: '+8.2%',
      positive: true,
      color: 'text-brand-gold',
    },
    {
      icon: TrendingUp,
      label: 'Avg. Payout',
      value: `${stats.avgPayout.toFixed(0)}%`,
      change: '+3.1%',
      positive: true,
      color: 'text-green-400',
    },
    {
      icon: Users,
      label: 'Active Users',
      value: stats.activeUsers.toLocaleString('en-US'),
      change: '+15.7%',
      positive: true,
      color: 'text-purple-400',
    },
  ];

  return (
    <section id="demo" className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-orange/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-brand-orange/10 border border-brand-orange/30 rounded-full text-brand-orange text-sm font-semibold mb-4">
            Live Demo
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See It in{' '}
            <span className="bg-gradient-to-r from-brand-orange to-brand-gold bg-clip-text text-transparent">
              Action
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Real-time market data streaming live. Watch the platform in action.
          </p>
        </motion.div>

        {/* Live stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div className="relative bg-dark-700/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
              <span className="text-xs text-gray-400 font-mono">LIVE</span>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {kpiCards.map((kpi, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-brand-orange/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    <div className={`flex items-center gap-1 text-xs font-semibold ${kpi.positive ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {kpi.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {kpi.change}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white font-mono mb-1">{kpi.value}</p>
                  <p className="text-xs text-gray-400">{kpi.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Sparkline */}
            <div className="flex items-end gap-1 h-24">
              {sparklineData.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 bg-gradient-to-t from-green-500/50 to-green-400/50 rounded-t hover:from-green-500 hover:to-green-400 transition-all"
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <a
            href="/chart"
            className="btn-premium group"
          >
            <BarChart3 className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            <span>View Full Demo</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
