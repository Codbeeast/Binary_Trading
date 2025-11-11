'use client';

import { motion } from 'framer-motion';

const timeframes = [
  { value: '1s', label: '1s' },
  { value: '5s', label: '5s' },
  { value: '15s', label: '15s' },
  { value: '30s', label: '30s' },
  { value: '1m', label: '1m' },
];

export default function TimeframeSelector({ selected, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {timeframes.map((tf) => (
        <motion.button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            selected === tf.value
              ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
          }`}
        >
          {tf.label}
        </motion.button>
      ))}
    </div>
  );
}
