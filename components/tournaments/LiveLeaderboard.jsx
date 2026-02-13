import React from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { cn } from "@/lib/utils";
import Image from 'next/image';

export default function LiveLeaderboard({ leaderboard, currentUserId, isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="absolute top-20 right-4 z-50 w-80 bg-[#1A1D24]/95 backdrop-blur-md border border-[#2C303A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#2C303A] flex items-center justify-between bg-[#111318]/50">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-white">Live Standings</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No participants yet
                    </div>
                ) : (
                    <div className="space-y-1">
                        {leaderboard.map((user, index) => {
                            const isMe = user.userId === currentUserId;
                            const isTop3 = index < 3;

                            let RankIcon = null;
                            if (index === 0) RankIcon = <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />;
                            else if (index === 1) RankIcon = <Medal className="w-4 h-4 text-gray-300 fill-gray-300" />;
                            else if (index === 2) RankIcon = <Medal className="w-4 h-4 text-amber-600 fill-amber-600" />;

                            return (
                                <div
                                    key={user.userId}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-xl text-sm transition-colors",
                                        isMe ? "bg-orange-500/20 border border-orange-500/30" : "hover:bg-white/5",
                                        index === 0 && !isMe ? "bg-yellow-500/10 border border-yellow-500/10" : ""
                                    )}
                                >
                                    {/* Rank */}
                                    <div className="w-6 flex justify-center font-bold text-gray-400">
                                        {RankIcon || <span className="text-xs">#{index + 1}</span>}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden shrink-0 border border-white/10">
                                        {user.avatar ? (
                                            <Image src={user.avatar} alt={user.name} width={32} height={32} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-gray-700 to-gray-800">
                                                {user.name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <div className={cn("font-medium truncate", isMe ? "text-orange-400" : "text-white")}>
                                            {isMe ? "You" : user.name}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate">
                                            {user.trades} trades
                                        </div>
                                    </div>

                                    {/* Balance */}
                                    <div className="text-right font-mono font-bold text-emerald-400">
                                        ₹{user.balance?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[#2C303A] bg-[#111318]/50 text-center">
                <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Updates
                </div>
            </div>
        </div>
    );
}
