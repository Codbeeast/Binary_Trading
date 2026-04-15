"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Copy, Gift, Share2, Users, DollarSign, Activity, ChevronDown, CheckCheck, Loader2 } from "lucide-react";

export default function ReferralPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (session?.user) {
            Promise.all([
                fetch('/api/referral/stats').then(res => res.json()),
                fetch('/api/referral/rewards').then(res => res.json())
            ]).then(([statsData, rewardsData]) => {
                setStats(statsData);
                setRewards(rewardsData.rewards || []);
                setLoading(false);
            }).catch(console.error);
        }
    }, [session]);

    if (!session) return <div className="text-white text-center mt-20">Please log in to view the Partner Program.</div>;

    if (loading || !stats) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0B0C10]">
                <Loader2 className="w-12 h-12 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    const host = typeof window !== 'undefined' ? window.location.origin : '';
    const referralLink = `${host}/register?ref=${stats.referralCode}`;

    const handleCopy = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = (platform) => {
        let url = '';
        const text = `Join me on the best trading platform! Sign up here: `;
        switch(platform) {
            case 'whatsapp': url = `https://wa.me/?text=${encodeURIComponent(text + referralLink)}`; break;
            case 'telegram': url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`; break;
            case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`; break;
        }
        if (url) window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#0B0C10] text-gray-200 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Profile Section */}
                <div className="bg-[#1C1F26] rounded-2xl p-6 border border-[#2A2E35] flex flex-col md:flex-row items-start md:items-center justify-between shadow-xl">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {session.user.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Partner Program</h1>
                            <p className="text-gray-400">Earn up to 80% revenue share • Weekly payouts</p>
                        </div>
                    </div>

                    <div className="w-full md:w-auto">
                        <div className="flex bg-[#12141A] rounded-xl border border-[#2A2E35] overflow-hidden">
                            <input 
                                type="text" 
                                readOnly 
                                value={referralLink}
                                className="bg-transparent px-4 py-3 text-sm text-gray-300 w-full md:w-64 outline-none"
                            />
                            <button onClick={handleCopy} className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 font-semibold transition-colors flex items-center gap-2">
                                {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                                {copied ? "Copied" : "Copy link"}
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 justify-end">
                            <button onClick={()=>handleShare('whatsapp')} className="text-xs px-3 py-1.5 rounded-full border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">WhatsApp</button>
                            <button onClick={()=>handleShare('telegram')} className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors">Telegram</button>
                            <button onClick={()=>handleShare('twitter')} className="text-xs px-3 py-1.5 rounded-full border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors">Twitter</button>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#1C1F26] p-6 rounded-2xl border border-[#2A2E35] shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                        <p className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2"><Users size={16}/> Total referrals</p>
                        <h2 className="text-4xl font-bold text-blue-500">{stats.totalReferrals}</h2>
                    </div>

                    <div className="bg-[#1C1F26] p-6 rounded-2xl border border-[#2A2E35] shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
                        <p className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2"><Activity size={16}/> Active traders</p>
                        <h2 className="text-4xl font-bold text-emerald-500">{stats.monthlyRefereeDeposits}</h2>
                        <p className="text-xs text-gray-500 mt-1">deposited this month</p>
                    </div>

                    <div className="bg-[#1C1F26] p-6 rounded-2xl border border-[#2A2E35] shadow-lg relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5722]/5 rounded-full blur-2xl group-hover:bg-[#FF5722]/10 transition-all"></div>
                        <p className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2"><DollarSign size={16}/> Total Earnings</p>
                        <h2 className="text-4xl font-bold text-[#FF5722]">₹{stats.totalEarnings?.toFixed(2)}</h2>
                        <p className="text-xs text-gray-500 mt-1">Available to withdraw: ₹{stats.referralBalance?.toFixed(2)}</p>
                    </div>
                </div>

                {/* Tiers List */}
                <div className="bg-[#1C1F26] rounded-2xl border border-[#2A2E35] shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-[#2A2E35]">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Gift size={20} className="text-[#FF5722]"/> Partner Levels</h2>
                        <p className="text-sm text-gray-400 mt-1">Levels are recalculated monthly based on the number of deposits from your referrals.</p>
                    </div>
                    <div className="divide-y divide-[#2A2E35]">
                        {stats.configTiers?.map((tier, index) => {
                            const isCurrent = stats.currentTier === tier.level;
                            
                            // Color mapping logic for visual flair
                            const tierColors = ['bg-gray-600', 'bg-[#CD7F32]', 'bg-gray-400', 'bg-[#FFD700]', 'bg-indigo-400', 'bg-blue-500', 'bg-teal-500'];
                            const badgeColor = tierColors[index % tierColors.length];

                            return (
                                <div key={tier.level} className={`p-4 md:p-6 flex flex-col md:flex-row items-center justify-between transition-colors ${isCurrent ? 'bg-[#FF5722]/5' : 'hover:bg-[#20242D]'}`}>
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold text-white shadow-md ${badgeColor}`}>
                                            <span className="text-xs opacity-80">L{tier.level}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                                                {isCurrent && <span className="bg-[#FF5722]/20 text-[#FF5722] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#FF5722]/30">Your Level</span>}
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                {tier.minDeposits}{tier.maxDeposits ? `–${tier.maxDeposits}` : '+'} deposits/month
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto flex md:flex-col justify-between items-end mt-4 md:mt-0">
                                        <div className="text-xl font-extrabold text-white">{tier.revSharePercent}% RevShare</div>
                                        <div className="text-xs text-gray-500 font-medium">{tier.turnoverPercent}% Turnover</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Reward History */}
                <div className="bg-[#1C1F26] p-6 rounded-2xl border border-[#2A2E35] shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6">Recent Rewards</h2>
                    {rewards.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 flex flex-col items-center justify-center">
                            <Gift className="w-12 h-12 mb-3 opacity-20" />
                            <p>No rewards yet. Share your link to start earning!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#2A2E35] text-sm text-gray-400 uppercase tracking-wider">
                                        <th className="pb-3 font-medium">Date</th>
                                        <th className="pb-3 font-medium">Trader</th>
                                        <th className="pb-3 font-medium text-right">Trigger Amt</th>
                                        <th className="pb-3 font-medium text-right">Reward</th>
                                        <th className="pb-3 font-medium text-right">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rewards.map(r => (
                                        <tr key={r.id} className="border-b border-[#2A2E35]/50 hover:bg-[#20242D] transition-colors">
                                            <td className="py-4 text-sm text-gray-300">{new Date(r.date).toLocaleString()}</td>
                                            <td className="py-4 text-sm font-medium text-gray-200">{r.from}</td>
                                            <td className="py-4 text-sm text-right text-gray-400">₹{r.tradeAmount.toFixed(2)}</td>
                                            <td className="py-4 text-sm font-bold text-[#FF5722] text-right">+₹{r.amount.toFixed(2)}</td>
                                            <td className="py-4 text-xs text-right text-gray-500">L{r.tier} ({r.percentage}%)</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
