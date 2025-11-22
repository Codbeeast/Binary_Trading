'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, TrendingUp, PlayCircle, Rocket } from 'lucide-react';
import Link from 'next/link';
import AnimatedChartPreview from './AnimatedChartPreview';

export default function Hero() {
  const valueProps = [
    { icon: Zap, text: 'Lightning Fast', color: 'text-brand-gold' },
    { icon: Shield, text: 'Secure Trading', color: 'text-blue-400' },
    { icon: TrendingUp, text: 'Real-time Data', color: 'text-brand-orange' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 bg-dark-900" />
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: 'url(/finexa_hero_bg.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900/80 via-dark-800/80 to-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-orange/20 via-transparent to-transparent" />

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
                <span className="px-4 py-2 bg-brand-orange/10 border border-brand-orange/30 rounded-full text-brand-orange text-sm font-semibold shadow-[0_0_15px_rgba(255,87,34,0.3)] flex items-center gap-2">
                  <Rocket className="w-4 h-4" /> Elite Trading Platform
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
                <span className="bg-gradient-to-r from-brand-orange via-brand-gold to-brand-glow bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,87,34,0.5)]">
                  Visualize Faster.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-400 max-w-xl"
              >
                Experience the pinnacle of binary charting. Real-time analytics, premium insights, and a Phoenix-inspired interface for the elite trader.
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
                  className="flex items-center gap-2 px-4 py-2 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-lg hover:border-brand-orange/30 transition-all group hover:shadow-[0_0_10px_rgba(255,87,34,0.2)]"
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
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/chart" className="btn-premium group">
                <span>Start Trading Now</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/demo" className="btn-secondary group">
                <PlayCircle className="w-5 h-5 mr-2 group-hover:text-brand-orange transition-colors" />
                <span>Watch Demo</span>
              </Link>
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
            <div className="absolute -inset-4 bg-brand-orange/20 blur-3xl rounded-full opacity-20 animate-pulse-slow" />
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
            <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
