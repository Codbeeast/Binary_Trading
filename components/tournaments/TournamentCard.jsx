import React from 'react';
import { Trophy, Users, Clock, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

import { useRouter } from 'next/navigation';

export default function TournamentCard({ tournament, onJoinClick }) {
    const router = useRouter(); // Initialize router
    const isLive = tournament.status === 'ACTIVE';
    const isUpcoming = tournament.status === 'UPCOMING';
    const isCompleted = tournament.status === 'COMPLETED';

    // Calculate time remaining or start time
    const getTimeLabel = () => {
        const now = new Date();
        const start = new Date(tournament.startTime);
        const end = new Date(tournament.endTime);

        if (isUpcoming) {
            const diff = start - now;
            if (diff < 0) return 'Starting Soon...';
            const hours = Math.floor(diff / (1000 * 60 * 60));
            return `Starts in ${hours}h`;
        } else if (isLive) {
            const diff = end - now;
            if (diff < 0) return 'Ended';
            const hours = Math.floor(diff / (1000 * 60 * 60));
            return `Ends in ${hours}h`;
        }
        return 'Ended';
    };

    return (
        <div className="group relative bg-[#1A1D24] border border-[#2C303A] rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10">
            {/* Status Batch */}
            <div className={cn(
                "absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border",
                isLive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    isUpcoming ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        "bg-gray-500/10 text-gray-500 border-gray-500/20"
            )}>
                {isLive ? 'Live Now' : isUpcoming ? 'Upcoming' : 'Completed'}
            </div>

            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 text-orange-500 group-hover:scale-110 transition-transform duration-300">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">{tournament.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{tournament.description || 'Compete with the best traders and win big prizes.'}</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#111318] p-3 rounded-xl border border-[#262932]">
                        <div className="text-xs text-gray-500 mb-1">Prize Pool</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(tournament.prizePool)}</div>
                    </div>
                    <div className="bg-[#111318] p-3 rounded-xl border border-[#262932]">
                        <div className="text-xs text-gray-500 mb-1">Entry Fee</div>
                        <div className="text-lg font-bold text-white">
                            {tournament.entryFee === 0 ? 'Free' : formatCurrency(tournament.entryFee)}
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-sm text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{tournament.participantCount} / {tournament.maxParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeLabel()}</span>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => {
                        if (tournament.isJoined) {
                            // Navigate to tournament chart with client-side routing
                            localStorage.setItem('activeTournamentId', tournament._id);
                            router.push(`/tournaments/${tournament._id}/play`);
                        } else {
                            onJoinClick(tournament);
                        }
                    }}
                    className={cn(
                        "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                        isCompleted
                            ? "bg-[#262932] text-gray-500 cursor-not-allowed"
                            : tournament.isJoined
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
                                : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25"
                    )}
                    disabled={isCompleted}
                >
                    {isCompleted ? 'View Results' : tournament.isJoined ? 'Enter Tournament' : 'Join Tournament'}
                    {!isCompleted && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
            </div>
        </div>
    );
}
