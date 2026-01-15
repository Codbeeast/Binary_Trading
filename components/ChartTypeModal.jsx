import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CandlestickChart, Activity, TrendingUp, BarChart2, GitCommit } from 'lucide-react';

const CHART_TYPES = [
    { id: 'candle', label: 'Candle', icon: CandlestickChart },
    { id: 'line', label: 'Line', icon: TrendingUp },
    { id: 'mountain', label: 'Mountain', icon: Activity },
    { id: 'bar', label: 'Bar', icon: BarChart2 },
    { id: 'heikin', label: 'Heikin Ashi', icon: GitCommit }, // Using GitCommit as proxy for HA style or similar
];

export default function ChartTypeModal({ isOpen, onClose, selectedType, onSelect }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-[#1A1D24] border border-[#2C303A] rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[#2C303A]">
                        <h2 className="text-lg font-semibold text-white">Chart type</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Options Grid */}
                    <div className="p-4 space-y-2">
                        {CHART_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isSelected = selectedType === type.id;

                            return (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        onSelect(type.id);
                                        onClose();
                                    }}
                                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all border ${isSelected
                                        ? 'bg-[#262932] border-brand-orange/50 text-white'
                                        : 'bg-[#16181D] border-[#2C303A] text-gray-400 hover:bg-[#1E2128] hover:text-gray-200'
                                        }`}
                                >
                                    {/* Visual Preview Box */}
                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-orange/10 text-brand-orange' : 'bg-[#252830] text-gray-500'}`}>
                                        <Icon size={24} />
                                    </div>

                                    {/* Text */}
                                    <span className="font-medium">{type.label}</span>

                                    {/* Active Dot */}
                                    {isSelected && (
                                        <div className="ml-auto w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
