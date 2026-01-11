'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Code, Smartphone, Globe, Lock, Zap, BarChart3, Bell, Settings } from 'lucide-react';

export default function Integration() {
  const [activeTimeframe, setActiveTimeframe] = useState('5m');

  const timeframes = ['1m', '5m', '15m', '1h'];

  const integrationFeatures = [
    {
      icon: Code,
      title: 'RESTful API',
      description: 'Complete API access for custom integrations and automated trading strategies.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Apps',
      description: 'Native iOS and Android apps for trading on the go with full feature parity.',
    },
    {
      icon: Globe,
      title: 'Web Platform',
      description: 'Access from any browser with our responsive web application.',
    },
    {
      icon: Lock,
      title: 'Secure Webhooks',
      description: 'Real-time event notifications with enterprise-grade security.',
    },
    {
      icon: Zap,
      title: 'WebSocket Feeds',
      description: 'Ultra-low latency market data streams for real-time trading.',
    },
    {
      icon: BarChart3,
      title: 'Data Export',
      description: 'Export your trading history and analytics in multiple formats.',
    },
  ];

  const highlights = [
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Custom price alerts and notifications',
      color: 'text-brand-orange',
    },
    {
      icon: Settings,
      title: 'Automation',
      description: 'Automated trading strategies',
      color: 'text-brand-gold',
    },
    {
      icon: Lock,
      title: 'Security',
      description: '2FA and biometric authentication',
      color: 'text-brand-glow',
    },
  ];

  return (
    <section id="integration" className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-orange/5 via-transparent to-transparent" />

      <div className="relative w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-brand-orange/10 border border-brand-orange/30 rounded-full text-brand-orange text-sm font-semibold mb-4">
              Integration
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why It{' '}
              <span className="bg-gradient-to-r from-brand-orange to-brand-gold bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Seamlessly integrate with your existing tools and workflows. Built for developers, designed for traders.
            </p>

            {/* Timeframe toggles */}
            <div className="mb-8">
              <p className="text-sm text-gray-400 mb-3">Interactive Demo Controls</p>
              <div className="flex gap-2">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTimeframe === tf
                      ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                      : 'bg-dark-700/50 text-gray-400 hover:text-white border border-white/10 hover:border-brand-orange/30'
                      }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-4">
              {highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-dark-700/30 backdrop-blur-sm border border-white/5 rounded-xl hover:border-brand-orange/30 transition-all group"
                >
                  <div className="p-2 bg-dark-800/50 rounded-lg group-hover:bg-brand-orange/10 transition-colors">
                    <highlight.icon className={`w-5 h-5 ${highlight.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{highlight.title}</p>
                    <p className="text-sm text-gray-400">{highlight.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <a
                href="#docs"
                className="btn-secondary group"
              >
                <Code className="w-5 h-5 mr-2 group-hover:text-brand-orange transition-colors" />
                <span>View Documentation</span>
              </a>
            </motion.div>
          </motion.div>

          {/* Right column - Integration features */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            {integrationFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/10 to-brand-gold/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                {/* Card */}
                <div className="relative bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-brand-orange/30 transition-all h-full">
                  <div className="p-3 bg-gradient-to-br from-brand-orange/10 to-brand-gold/10 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-brand-orange" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-dark-700/30 backdrop-blur-sm border border-white/5 rounded-2xl"
        >
          {[
            { value: '99.99%', label: 'API Uptime' },
            { value: '<50ms', label: 'Response Time' },
            { value: '50+', label: 'Integrations' },
            { value: '24/7', label: 'Support' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
