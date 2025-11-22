'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Product', href: '#features' },
    { name: 'Integration', href: '#integration' },
    { name: 'Demo', href: '#demo' },
    { name: 'Pricing', href: '#pricing' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-dark-900/80 backdrop-blur-xl border-b border-white/5 shadow-lg'
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-orange/20 blur-xl rounded-full group-hover:bg-brand-orange/30 transition-all" />
              <div className="relative p-2 bg-gradient-to-br from-brand-orange/20 to-brand-gold/20 rounded-xl border border-brand-orange/30">
                <TrendingUp className="w-6 h-6 text-brand-orange" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white">Finexa</span>
              <span className="text-xs text-gray-400">Global Trading Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative text-gray-300 hover:text-white transition-colors group py-2"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-brand-orange to-brand-gold group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/demo"
              className="px-5 py-2.5 text-gray-300 hover:text-white border border-gray-700 hover:border-brand-orange/50 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-brand-orange/20"
            >
              Live Demo
            </Link>
            <Link
              href="/admin"
              className="btn-premium !px-5 !py-2.5 !rounded-lg !text-sm"
            >
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-dark-800/95 backdrop-blur-xl border-t border-white/5"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 space-y-3 border-t border-white/5">
                <Link
                  href="/demo"
                  className="block w-full px-4 py-3 text-center text-gray-300 border border-gray-700 rounded-lg hover:border-brand-orange/50 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Live Demo
                </Link>
                <Link
                  href="/admin"
                  className="block w-full px-4 py-3 text-center bg-gradient-to-r from-brand-orange to-brand-gold text-white font-semibold rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
