'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { BarChart3, Zap, Users, Activity, TrendingUp, Shield, Layers, Globe } from 'lucide-react';

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const features = [
    {
      icon: BarChart3,
      title: 'Simple Analytics',
      description: 'Intuitive dashboards with real-time insights and powerful data visualization tools.',
      gradient: 'from-brand-orange/20 to-brand-gold/20',
      iconColor: 'text-brand-orange',
      sparkline: [40, 45, 42, 48, 52, 49, 55, 58, 54, 60],
    },
    {
      icon: TrendingUp,
      title: 'Boosting Business',
      description: 'Advanced trading algorithms and market analysis to maximize your returns.',
      gradient: 'from-blue-500/20 to-purple-500/20',
      iconColor: 'text-blue-400',
      sparkline: [30, 35, 38, 42, 45, 48, 52, 55, 58, 62],
    },
    {
      icon: Users,
      title: 'Easy Collaboration',
      description: 'Share strategies, insights, and trade signals with your team seamlessly.',
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      sparkline: [50, 48, 52, 49, 55, 53, 58, 56, 60, 58],
    },
    {
      icon: Activity,
      title: 'Realtime Monitoring',
      description: 'Track market movements and execute trades with millisecond precision.',
      gradient: 'from-brand-gold/20 to-red-500/20',
      iconColor: 'text-brand-gold',
      sparkline: [45, 50, 48, 52, 55, 58, 56, 60, 58, 65],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />

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
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-brand-orange to-brand-gold bg-clip-text text-transparent">
              Trade Better
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Powerful tools and features designed for professional traders and beginners alike.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -5 }}
              className="group relative"
            >
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

              {/* Card */}
              <div className="relative h-full bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-brand-orange/30 transition-all duration-300">
                {/* Icon */}
                <div className={`inline-flex p-3 bg-gradient-to-br ${feature.gradient} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-orange transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Mini sparkline */}
                <div className="flex items-end gap-1 h-12 mt-auto">
                  {feature.sparkline.map((value, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${value}%` }}
                      transition={{ delay: index * 0.1 + i * 0.05, duration: 0.3 }}
                      className={`flex-1 bg-gradient-to-t ${feature.gradient} rounded-t opacity-50 group-hover:opacity-100 transition-opacity`}
                    />
                  ))}
                </div>

                {/* Decorative line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional features list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid md:grid-cols-3 gap-8"
        >
          {[
            { icon: Shield, text: 'Bank-grade security with 256-bit encryption' },
            { icon: Layers, text: 'Multi-layer architecture for maximum reliability' },
            { icon: Globe, text: 'Global market access with 50+ exchanges' },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-dark-700/30 backdrop-blur-sm border border-white/5 rounded-xl hover:border-brand-orange/30 transition-all group"
            >
              <div className="p-2 bg-brand-orange/10 rounded-lg group-hover:bg-brand-orange/20 transition-colors">
                <item.icon className="w-5 h-5 text-brand-orange" />
              </div>
              <p className="text-sm text-gray-300">{item.text}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
