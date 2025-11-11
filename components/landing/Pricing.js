'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, Zap, Crown, Building2 } from 'lucide-react';

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const plans = [
    {
      name: 'Basic',
      icon: Zap,
      description: 'Perfect for beginners',
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        'Real-time market data',
        'Basic charting tools',
        'Up to 10 trades/day',
        'Email support',
        'Mobile app access',
        'Basic analytics',
      ],
      gradient: 'from-gray-600 to-gray-700',
      popular: false,
    },
    {
      name: 'Pro',
      icon: Crown,
      description: 'Best for active traders',
      monthlyPrice: 99,
      annualPrice: 990,
      features: [
        'Everything in Basic',
        'Advanced charting suite',
        'Unlimited trades',
        'Priority support 24/7',
        'API access',
        'Advanced analytics',
        'Custom indicators',
        'Portfolio management',
      ],
      gradient: 'from-brand-green to-brand-green-glow',
      popular: true,
    },
    {
      name: 'Enterprise',
      icon: Building2,
      description: 'For professional teams',
      monthlyPrice: 299,
      annualPrice: 2990,
      features: [
        'Everything in Pro',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options',
        'Team collaboration tools',
        'Advanced security features',
        'Custom training sessions',
        'SLA guarantee',
      ],
      gradient: 'from-purple-600 to-blue-600',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-brand-cyan/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm font-semibold mb-4">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-brand-green to-brand-cyan bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Start free, scale as you grow. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-xl">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-brand-green text-dark-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all relative ${
                billingPeriod === 'annual'
                  ? 'bg-brand-green text-dark-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-brand-cyan text-dark-900 text-xs font-bold rounded-full">
                -20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`relative ${plan.popular ? 'md:-mt-4' : ''}`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-1 bg-gradient-to-r from-brand-green to-brand-cyan rounded-full text-dark-900 text-sm font-bold">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Glow effect */}
              {plan.popular && (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 to-brand-cyan/20 blur-2xl rounded-3xl" />
              )}

              {/* Card */}
              <div
                className={`relative h-full bg-dark-700/50 backdrop-blur-xl border rounded-3xl p-8 transition-all ${
                  plan.popular
                    ? 'border-brand-green/50 shadow-2xl shadow-brand-green/20'
                    : 'border-white/10 hover:border-brand-green/30'
                }`}
              >
                {/* Icon */}
                <div className={`inline-flex p-3 bg-gradient-to-br ${plan.gradient} rounded-xl mb-4`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">
                      ${billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                    </span>
                    <span className="text-gray-400">
                      /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-brand-green mt-2">
                      Save ${plan.monthlyPrice * 12 - plan.annualPrice}/year
                    </p>
                  )}
                </div>

                {/* CTA button */}
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-green to-brand-green-glow text-dark-900 hover:shadow-lg hover:shadow-brand-green/50 hover:scale-105'
                      : 'bg-dark-600 text-white hover:bg-dark-500 border border-white/10'
                  }`}
                >
                  Get Started
                </button>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 p-0.5 bg-brand-green/20 rounded-full">
                        <Check className="w-4 h-4 text-brand-green" />
                      </div>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-xl">
            <span className="text-gray-300">Need a custom solution?</span>
            <a href="#contact" className="text-brand-green hover:text-brand-green-glow font-semibold transition-colors">
              Contact Sales →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
