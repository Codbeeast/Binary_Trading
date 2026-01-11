"use client";

import { useState } from "react";
import { Clock, TrendingUp, TrendingDown, History } from "lucide-react";

export default function RecentTrades({ trades = [], asset }) {
    const [activeTab, setActiveTab] = useState('trades'); // 'trades' | 'orders'

    // Sort trades by completion time (newest first)
    // Trades are already sorted by backend (newest first)
    const sortedTrades = [...trades];

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
    };

    // Group trades by date
    const groupedTrades = sortedTrades.reduce((groups, trade) => {
        // Use expiryTime, fallback to timestamp, fallback to now
        const effectiveDate = trade.expiryTime || trade.timestamp || new Date();
        const date = formatDate(effectiveDate);
        if (date === 'Invalid Date') return groups; // Skip truly broken records

        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(trade);
        return groups;
    }, {});

    return (
        <div className="flex flex-col h-full bg-[#16181F] text-[#E3E5E8] text-[11px] font-medium w-full">
            {/* Header Tabs */}
            <div className="flex items-center bg-[#1C1F27] border-b border-[#262932]">
                <button
                    onClick={() => setActiveTab('trades')}
                    className={`flex-1 py-3 transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'trades'
                        ? 'border-blue-500 text-blue-500 bg-[#1F2933]'
                        : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <span>Trades</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'trades' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#2C303A] text-gray-300'
                        }`}>
                        {trades.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 py-3 transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'orders'
                        ? 'border-blue-500 text-blue-500 bg-[#1F2933]'
                        : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <span>Orders</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'orders' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#2C303A] text-gray-300'
                        }`}>
                        0
                    </span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'trades' ? (
                    <div className="px-2 py-2 space-y-4">
                        {Object.keys(groupedTrades).map((date) => (
                            <div key={date} className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 justify-center mb-1">
                                    <div className="h-[1px] bg-[#262932] flex-1"></div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{date}</span>
                                    <div className="h-[1px] bg-[#262932] flex-1"></div>
                                </div>

                                {groupedTrades[date].map((trade) => (
                                    <div key={trade.id} className="flex flex-col gap-1 py-2 border-b border-[#262932]/50 last:border-0 hover:bg-[#1C1F27]/50 transition-colors rounded-lg px-2">

                                        {/* Row 1: Asset & Time */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button className="p-0.5 hover:bg-[#2C303A] rounded">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="m6 9 6 6 6-6" /></svg>
                                                </button>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div className="flex -space-x-1">
                                                        <div className="w-4 h-4 rounded-full bg-[#FACC15] flex items-center justify-center text-[8px] text-black font-bold z-10 border border-[#16181F]">
                                                            {(trade.symbol || asset || "C").charAt(0)}
                                                        </div>
                                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold border border-[#16181F]">
                                                            {(trade.symbol || asset) ? 'U' : 'I'}
                                                        </div>
                                                    </div>
                                                    <span className="text-gray-200 font-bold">{trade.symbol || asset || "Crypto IDX"}</span>
                                                </div>
                                            </div>
                                            <span className="text-gray-400 font-mono text-[10px]">
                                                {trade.duration}s
                                            </span>
                                        </div>

                                        {/* Row 2: Direction, Stake, Payout */}
                                        <div className="flex items-center justify-between pl-6">
                                            <div className="flex items-center gap-2">
                                                {trade.direction === 'up' ? (
                                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                                                )}
                                                <span className="text-emerald-500 font-bold font-mono">
                                                    {trade.amount} ₹
                                                </span>
                                            </div>
                                            <span className={`font-bold font-mono ${(trade.result === 'PROFIT' || trade.result === 'win') ? 'text-[#FACC15]' : 'text-rose-500'}`}>
                                                {(trade.result === 'PROFIT' || trade.result === 'win') ? `+${(trade.payout || 0).toFixed(2)} ₹` : `-${(trade.amount || 0).toFixed(2)} ₹`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {trades.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                                <History className="w-8 h-8 opacity-20" />
                                <span>No data available</span>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Orders Tab Content */
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 pb-20">
                        <div className="w-16 h-16 rounded-full bg-[#1C1F27] flex items-center justify-center">
                            <Clock className="w-8 h-8 opacity-20" />
                        </div>
                        <span className="text-[12px]">No data available</span>
                    </div>
                )}
            </div>
        </div>
    );
}
