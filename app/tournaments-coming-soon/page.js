"use client";

import { useState, useEffect } from "react";
import { Trophy, Swords, Users, Clock, Star, Zap, Crown, Target, ArrowRight, Bell } from "lucide-react";

export default function TournamentsComingSoon() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isNotified, setIsNotified] = useState(false);

    // Mouse tracking for gradient effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const features = [
        {
            icon: Swords,
            title: "Head-to-Head Battles",
            description: "Compete against real traders in intense 1v1 and group matches",
            gradient: "from-orange-500 to-red-500"
        },
        {
            icon: Crown,
            title: "Leaderboard Rankings",
            description: "Climb the global rankings and earn exclusive trader titles",
            gradient: "from-yellow-500 to-orange-500"
        },
        {
            icon: Target,
            title: "Prize Pools",
            description: "Win massive prize pools with guaranteed payouts for top performers",
            gradient: "from-emerald-500 to-teal-500"
        },
        {
            icon: Zap,
            title: "Flash Tournaments",
            description: "Quick 5-minute tournaments for instant action and rewards",
            gradient: "from-violet-500 to-purple-500"
        },
    ];

    const handleNotify = () => {
        setIsNotified(true);
        setTimeout(() => setIsNotified(false), 3000);
    };

    return (
        <div className="min-h-screen bg-[#0A0C10] text-white overflow-hidden relative">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Dynamic gradient following mouse */}
                <div
                    className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] transition-all duration-[2000ms] ease-out"
                    style={{
                        left: mousePos.x - 300,
                        top: mousePos.y - 300,
                        background: "radial-gradient(circle, #f97316, #ef4444, transparent)"
                    }}
                />
                {/* Static ambient glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[100px] bg-orange-500" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px] bg-purple-500" />

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: "60px 60px"
                    }}
                />

                {/* Floating particles */}
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-orange-500/30 rounded-full"
                        style={{
                            left: `${(i * 17 + 5) % 100}%`,
                            top: `${(i * 23 + 10) % 100}%`,
                            animation: `float ${3 + (i % 4)}s ease-in-out ${i * 0.3}s infinite alternate`,
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">

                {/* Trophy Icon with Glow */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl scale-150 animate-pulse" />
                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                        <Trophy className="w-12 h-12 md:w-16 md:h-16 text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]" />
                    </div>
                    {/* Orbiting stars */}
                    <div className="absolute -top-2 -right-2 animate-spin" style={{ animationDuration: "8s" }}>
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="absolute -bottom-1 -left-3 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }}>
                        <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                    </div>
                </div>

                {/* Badge */}
                <div className="mb-6 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 backdrop-blur-sm">
                    <span className="text-xs md:text-sm font-semibold text-orange-400 tracking-widest uppercase flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        Coming Soon
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-center mb-4 leading-tight">
                    <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                        Tournament
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                        Arena
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-gray-400 text-center max-w-xl mb-10 text-base md:text-lg leading-relaxed">
                    Compete with the best traders worldwide. Enter tournaments, climb leaderboards,
                    and win <span className="text-orange-400 font-semibold">massive rewards</span>.
                </p>

                {/* Notify Button */}
                <button
                    
                    disabled={isNotified}
                    className={`
                        relative group px-8 py-4 rounded-2xl font-bold text-base md:text-lg transition-all duration-500
                        ${isNotified
                            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default"
                            : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95"
                        }
                    `}
                >
                    {isNotified ? (
                        <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            You&apos;ll be notified!
                        </span>
                    ) : (
                        <span className="flex items-center gap-3">
                            <Bell className="w-5 h-5" />
                            {/* Notify Me When It&apos;s Live */}
                            Get Ready For This
                        </span>
                    )}
                    {/* Glow ring */}
                    {!isNotified && (
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-500" />
                    )}
                </button>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-3xl w-full mt-16 md:mt-20">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className="group relative p-5 md:p-6 rounded-2xl bg-[#111318]/80 border border-[#1E2128] hover:border-orange-500/20 transition-all duration-500 backdrop-blur-sm hover:bg-[#13161C]/90"
                        >
                            {/* Hover glow */}
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                            <div className="relative z-10">
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                                    style={{ background: `linear-gradient(135deg, ${feature.gradient.includes('orange') ? 'rgba(249,115,22,0.15)' : feature.gradient.includes('emerald') ? 'rgba(16,185,129,0.15)' : feature.gradient.includes('violet') ? 'rgba(139,92,246,0.15)' : 'rgba(234,179,8,0.15)'}, transparent)` }}
                                >
                                    <feature.icon className="w-5 h-5" style={{ color: feature.gradient.includes('orange') && feature.gradient.includes('red') ? '#f97316' : feature.gradient.includes('yellow') ? '#eab308' : feature.gradient.includes('emerald') ? '#10b981' : '#8b5cf6' }} />
                                </div>
                                <h3 className="text-white font-bold text-base mb-1.5">{feature.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom stats teaser */}
                <div className="flex items-center gap-8 md:gap-12 mt-16 text-center">
                    <div>
                        <div className="text-2xl md:text-3xl font-black text-white">10K+</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Traders Ready</div>
                    </div>
                    <div className="w-px h-10 bg-[#262932]" />
                    <div>
                        <div className="text-2xl md:text-3xl font-black text-orange-500">₹50L+</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Prize Pool</div>
                    </div>
                    <div className="w-px h-10 bg-[#262932]" />
                    <div>
                        <div className="text-2xl md:text-3xl font-black text-white">24/7</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Tournaments</div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes float {
                    from { transform: translateY(0px) scale(1); opacity: 0.3; }
                    to { transform: translateY(-20px) scale(1.5); opacity: 0.1; }
                }
            `}</style>
        </div>
    );
}
