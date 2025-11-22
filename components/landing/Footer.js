'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Twitter, Github, Linkedin, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setEmail('');
      setIsSubmitted(false);
    }, 3000);
  };

  const footerLinks = {
    Product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Demo', href: '#demo' },
      { name: 'Integrations', href: '#integration' },
    ],
    Company: [
      { name: 'About', href: '#about' },
      { name: 'Blog', href: '#blog' },
      { name: 'Careers', href: '#careers' },
      { name: 'Contact', href: '#contact' },
    ],
    Resources: [
      { name: 'Documentation', href: '#docs' },
      { name: 'API Reference', href: '#api' },
      { name: 'Support', href: '#support' },
      { name: 'Status', href: '#status' },
    ],
    Legal: [
      { name: 'Privacy', href: '#privacy' },
      { name: 'Terms', href: '#terms' },
      { name: 'Security', href: '#security' },
      { name: 'Cookies', href: '#cookies' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Mail, href: '#', label: 'Email' },
  ];

  return (
    <footer className="relative bg-dark-900 border-t border-white/5 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-800 to-transparent opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Newsletter section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 pb-16 border-b border-white/5"
        >
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              Stay Updated
            </h3>
            <p className="text-gray-400 mb-8">
              Get the latest trading insights, platform updates, and exclusive tips delivered to your inbox.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                suppressHydrationWarning
                className="flex-1 px-4 py-3 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
              <button
                type="submit"
                disabled={isSubmitted}
                className="btn-premium !px-6 !py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isSubmitted ? (
                  'Subscribed! ✓'
                ) : (
                  <>
                    <span>Subscribe</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-brand-orange/20 to-brand-gold/20 rounded-xl border border-brand-orange/30">
                <TrendingUp className="w-6 h-6 text-brand-orange" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">Finexa</span>
                <p className="text-xs text-gray-400">Pro Platform</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Next-generation binary trading platform with real-time analytics and beautiful insights.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-lg hover:border-brand-orange/50 hover:bg-dark-700 transition-all group"
                >
                  <social.icon className="w-5 h-5 text-gray-400 group-hover:text-brand-orange transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-brand-orange transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Finexa Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <a href="#privacy" className="text-gray-400 hover:text-brand-orange transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="text-gray-400 hover:text-brand-orange transition-colors">
              Terms of Service
            </a>
            <a href="#cookies" className="text-gray-400 hover:text-brand-orange transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
