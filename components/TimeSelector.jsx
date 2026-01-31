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

export default function TimeSelector({ duration, onDurationChange, expiryTimestamp, onExpiryChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const isBigTime = (label) => label.length > 5;

    // determine mode
    const isAbsolute = !!expiryTimestamp;

    useEffect(() => {
        if (!isEditing) {
            if (isAbsolute) {
                // Format absolute time HH:MM
                const date = new Date(expiryTimestamp);
                const h = date.getHours().toString().padStart(2, '0');
                const m = date.getMinutes().toString().padStart(2, '0');
                setInputValue(`${h}:${m}`);
            } else {
                setInputValue(formatTime(duration));
            }
        }
    }, [duration, expiryTimestamp, isEditing, isAbsolute]);

    // Close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsEditing(false);
                if (isAbsolute) {
                    const date = new Date(expiryTimestamp);
                    setInputValue(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
                } else {
                    setInputValue(formatTime(duration));
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [duration, expiryTimestamp, isAbsolute]);

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    const handleIncrement = () => {
        if (isAbsolute) {
            // Add 1 minute
            onExpiryChange(expiryTimestamp + 60000);
        } else {
            onDurationChange(duration + 1);
        }
    };

    const handleDecrement = () => {
        if (isAbsolute) {
            // Subtract 1 minute
            const newExpiry = expiryTimestamp - 60000;
            const now = Date.now();
            // Minimum valid expiry: Now + 30s buffer (or 45s for safety)
            // If new time is closer than 45s from now, block it.
            if (newExpiry > now + 45000) {
                onExpiryChange(newExpiry);
            }
        } else {
            if (duration > 1) {
                onDurationChange(duration - 1);
            }
        }
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
                            // Toggle mode? For now just helper text
                        }}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wide"
                    >
                        {isAbsolute ? "Fixed Time" : "Timer"}
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

                    {/* Display Only for now (Editing absolute time manually is complex with masking, keep buttons for v1) */}
                    <div className="flex-1 min-w-0 bg-transparent text-center text-lg font-bold text-white tracking-wide font-mono p-0">
                        {inputValue}
                    </div>

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
        </div>
    );
}
