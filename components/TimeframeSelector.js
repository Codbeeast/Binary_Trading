'use client';

import { motion } from 'framer-motion';

const timeframes = [
  { value: '5s', label: '5s' },
  { value: '15s', label: '15s' },
  { value: '30s', label: '30s' },
  { value: '1m', label: '1m' },
];

export default function TimeframeSelector({ selected, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-[#1C1F27] p-1 rounded-lg border border-[#2C303A]">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`
          relative px-2 lg:px-3 h-6 lg:h-7 rounded-md text-[10px] lg:text-[11px] font-bold transition-all
            ${selected === tf.value
              ? 'bg-[#2A2E39] text-white shadow-md shadow-black/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#2A2E39]/50'
            }
          `}
        >
          {tf.label}
          {selected === tf.value && (
            <motion.div
              layoutId="activeTimeframe"
              className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-blue-500 rounded-full"
            />
          )}
        </button>
      ))}
    </div>
  );
}
