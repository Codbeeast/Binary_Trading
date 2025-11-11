'use client';

import { motion } from 'framer-motion';
import { Play, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';
import AnimatedChartPreview from './AnimatedChartPreview';

export default function Hero() {
  const valueProps = [
    { icon: Zap, text: 'Lightning Fast', color: 'text-yellow-400' },
    { icon: Shield, text: 'Secure Trading', color: 'text-blue-400' },
    { icon: TrendingUp, text: 'Real-time Data', color: 'text-brand-green' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-green/10 via-transparent to-transparent" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Headline */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block"
              >
                <span className="px-4 py-2 bg-brand-green/10 border border-brand-green/30 rounded-full text-brand-green text-sm font-semibold">
                  🚀 Next-Gen Trading Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
              >
                <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Trade Smarter.
                </span>
                <br />
                <span className="bg-gradient-to-r from-brand-green via-brand-green-glow to-brand-cyan bg-clip-text text-transparent">
                  Visualize Faster.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-400 max-w-xl"
              >
                High-performance binary charting with instant visualization. Experience the future of trading with real-time analytics and beautiful insights.
              </motion.p>
            </div>

            {/* Value props chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              {valueProps.map((prop, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-lg hover:border-brand-green/30 transition-all group"
                >
                  <prop.icon className={`w-4 h-4 ${prop.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm text-gray-300">{prop.text}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a
                href="#demo"
                className="group relative px-8 py-4 bg-gradient-to-r from-brand-green to-brand-green-glow rounded-xl font-semibold text-dark-900 hover:shadow-2xl hover:shadow-brand-green/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-green-glow to-brand-cyan opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10" />
              </a>

              <a
                href="#demo"
                className="group px-8 py-4 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-xl font-semibold text-white hover:border-brand-green/50 hover:bg-dark-700 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Watch Demo</span>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-8 pt-4 border-t border-white/5"
            >
              <div>
                <p className="text-3xl font-bold text-white">99.9%</p>
                <p className="text-sm text-gray-400">Uptime</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">50ms</p>
                <p className="text-sm text-gray-400">Latency</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">24/7</p>
                <p className="text-sm text-gray-400">Support</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right column - Chart preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <AnimatedChartPreview />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <span className="text-xs">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-gray-600 rounded-full flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-1.5 bg-brand-green rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
