"use client";

import { useState, useRef, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_TIMES = [
    { label: '01:00', value: 60 },
    { label: '02:00', value: 120 },
    { label: '03:00', value: 180 },
    { label: '04:00', value: 240 },
    { label: '05:00', value: 300 },
    { label: '10:00', value: 600 },
    { label: '15:00', value: 900 },
    { label: '30:00', value: 1800 },
    { label: '45:00', value: 2700 },
    { label: '01:00:00', value: 3600 },
    { label: '02:00:00', value: 7200 },
    { label: '03:00:00', value: 10800 },
    { label: '04:00:00', value: 14400 },
];

export default function TimeSelector({ duration, onDurationChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const isBigTime = (label) => label.length > 5;


    useEffect(() => {
        // Sync input value when duration changes externally (and not editing)
        if (!isEditing) {
            setInputValue(formatTime(duration));
        }
    }, [duration, isEditing]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsEditing(false); // Stop editing on blur/outside click
                // Reset input to formatted valid duration
                setInputValue(formatTime(duration));
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [duration]);

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    const parseTimeInput = (value) => {
        // Remove non-numeric characters except colons
        const cleanValue = value.replace(/[^0-9:]/g, '');
        const parts = cleanValue.split(':').reverse();

        let totalSeconds = 0;
        if (parts[0]) totalSeconds += parseInt(parts[0], 10) || 0; // Seconds
        if (parts[1]) totalSeconds += (parseInt(parts[1], 10) || 0) * 60; // Minutes
        if (parts[2]) totalSeconds += (parseInt(parts[2], 10) || 0) * 3600; // Hours

        return totalSeconds;
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        const newDuration = parseTimeInput(e.target.value);
        if (newDuration > 0) {
            onDurationChange(newDuration);
        }
    };

    const handleInputFocus = () => {
        setIsEditing(true);
        setIsOpen(true);
        // Optional: Select all text for easier replacement
        // e.target.select(); 
    };

    const handleIncrement = () => {
        onDurationChange(duration + 1); // 1 second step
        setIsOpen(false);
        setIsEditing(false);
    };

    const handleDecrement = () => {
        if (duration > 1) {
            onDurationChange(duration - 1); // 1 second step
            setIsOpen(false);
            setIsEditing(false);
        }
    };

    const handleSelectTime = (value) => {
        onDurationChange(value);
        setIsOpen(false);
        setIsEditing(false);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Container */}
            <div
                className="flex flex-col gap-1 p-3 border border-[#2C303A] rounded-xl bg-[#1C1F27] hover:bg-[#20232B] transition-colors"
            >
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-medium">Time</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wide"
                    >
                        Switch Time
                    </button>
                </div>

                <div className="flex items-center justify-between mt-1 gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDecrement();
                        }}
                        className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#2A2E39] text-gray-300 hover:bg-[#323642] hover:text-white transition-colors"
                    >
                        <Minus className="h-4 w-4" />
                    </button>

                    {/* Editable Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onClick={() => setIsOpen(true)}
                        className="flex-1 min-w-0 bg-transparent text-center text-lg font-bold text-white tracking-wide font-mono border-none outline-none focus:ring-0 p-0 hover:bg-[#262A34] rounded cursor-text"
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleIncrement();
                        }}
                        className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#2A2E39] text-gray-300 hover:bg-[#323642] hover:text-white transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Dropdown Grid - Positioned Below (top-full) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 p-2 rounded-xl bg-[#1C1F27] border border-[#2C303A] shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                    >
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_TIMES.map((time) => {
                                const big = time.label.length > 5;

                                return (
                                    <button
                                        key={time.value}
                                        onClick={() => handleSelectTime(time.value)}
                                        className={`
                                            ${big ? 'col-span-3 h-14 text-base' : 'col-span-2 h-12 text-sm'}
                                            flex items-center justify-center
                                            font-mono whitespace-nowrap
                                            rounded-lg font-semibold transition-all
                                            ${duration === time.value
                                                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-[#262A34] text-gray-300 hover:bg-[#2F3440] hover:text-white'
                                            }
                                        `}
                                    >
                                        {time.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
