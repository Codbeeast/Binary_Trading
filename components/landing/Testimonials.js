'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Professional Trader',
      avatar: 'SC',
      rating: 5,
      quote: 'The real-time visualization and lightning-fast execution have completely transformed my trading strategy. Best platform I\'ve used in 10 years.',
      company: 'Chen Capital',
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Hedge Fund Manager',
      avatar: 'MR',
      rating: 5,
      quote: 'Incredible analytics and intuitive interface. Our team\'s productivity increased by 40% after switching to BinaryTrade Pro.',
      company: 'Quantum Investments',
    },
    {
      name: 'Emily Watson',
      role: 'Day Trader',
      avatar: 'EW',
      rating: 5,
      quote: 'The millisecond precision and advanced charting tools give me the edge I need. Support team is also phenomenal - always there when needed.',
      company: 'Independent',
    },
  ];

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = testimonials.length - 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;
      return nextIndex;
    });
  };

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      paginate(1);
    }, 5000);

    return () => clearInterval(timer);
  }, [currentIndex, paginate]);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-green/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-brand-cyan/10 border border-brand-cyan/30 rounded-full text-brand-cyan text-sm font-semibold mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-brand-green to-brand-cyan bg-clip-text text-transparent">
              Thousands
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See what professional traders are saying about our platform.
          </p>
        </motion.div>

        {/* Testimonial carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div className="relative h-96 flex items-center justify-center">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute w-full"
              >
                <div className="relative bg-dark-700/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 hover:border-brand-green/30 transition-all">
                  {/* Quote icon */}
                  <div className="absolute -top-6 left-8 p-4 bg-gradient-to-br from-brand-green/20 to-brand-cyan/20 rounded-2xl border border-white/10">
                    <Quote className="w-8 h-8 text-brand-green" />
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-6 mt-4">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8 font-light">
                    &ldquo;{testimonials[currentIndex].quote}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center text-dark-900 font-bold text-lg">
                      {testimonials[currentIndex].avatar}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {testimonials[currentIndex].name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {testimonials[currentIndex].role} • {testimonials[currentIndex].company}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => paginate(-1)}
              className="p-3 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-full hover:border-brand-green/50 hover:bg-dark-700 transition-all group"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-brand-green transition-colors" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1);
                    setCurrentIndex(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-brand-green'
                      : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => paginate(1)}
              className="p-3 bg-dark-700/50 backdrop-blur-sm border border-white/10 rounded-full hover:border-brand-green/50 hover:bg-dark-700 transition-all group"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-green transition-colors" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '50K+', label: 'Active Traders' },
            { value: '98%', label: 'Satisfaction Rate' },
            { value: '$2.5B+', label: 'Trading Volume' },
            { value: '4.9/5', label: 'Average Rating' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
