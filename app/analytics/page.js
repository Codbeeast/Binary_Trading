"use client";
import { useEffect, useState } from 'react';
import {
    BarChart3, Wallet, History, User, Trophy, LayoutDashboard,
    ArrowUpRight, ArrowDownRight, TrendingUp, Activity, DollarSign
} from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';
import StatCard from './components/StatCard';
import ProfitChart from './components/ProfitChart';
import WinRateChart from './components/WinRateChart';
import InstrumentChart from './components/InstrumentChart';
import TradeDistribution from './components/TradeDistribution';
import Link from 'next/link';

export default function AnalyticsPage() {
    const [period, setPeriod] = useState('today');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        // Get distinct user ID
        if (typeof window !== 'undefined') {
            const storedId = localStorage.getItem('binary_user_id');
            setUserId(storedId);
        }
    }, []);

    const fetchData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?period=${period}&userId=${userId}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, userId]);

    if (!userId) return <div className="min-h-screen bg-[#111318] text-white flex items-center justify-center">Loading User Context...</div>;

    return (
        <div className="min-h-screen bg-[#111318] text-[#E3E5E8] font-sans selection:bg-orange-500/30">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 border-b border-[#262932] bg-[#16181F]/80 backdrop-blur-md">
                <div className="mx-auto max-w-[1600px] px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">



                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col text-right leading-tight">
                            <span className="text-xs text-gray-500">ID: {userId?.substring(5)}...</span>
                            <span className="text-xs font-semibold text-gray-300">India 🇮🇳</span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#262932]">
                            {userId?.charAt(5)?.toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8 space-y-6">
                {/* User Identity & Balance Section */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Profile Card */}
                    <div className="rounded-2xl bg-[#1C1F26] border border-[#262932] p-6 flex items-center gap-4 bg-[url('/grid-pattern.svg')]">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 p-[2px]">
                            <div className="h-full w-full rounded-full bg-[#1C1F26] flex items-center justify-center">
                                <User className="h-8 w-8 text-emerald-500" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Demo User</h2>
                            <p className="text-sm text-gray-400">{userId}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">VERIFIED</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">PRO TRADER</span>
                            </div>
                        </div>
                    </div>

                    {/* Real Balance */}
                    <div className="rounded-2xl bg-gradient-to-br from-[#1C1F26] to-[#16181F] border border-[#262932] p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-24 h-24 text-emerald-500" />
                        </div>
                        <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Real Account</span>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">₹0.00</span>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors">Deposit</button>
                            <button className="flex-1 bg-[#2E323E] hover:bg-[#373B48] text-gray-200 text-xs font-bold py-2 rounded-lg transition-colors">Withdraw</button>
                        </div>
                    </div>

                    {/* Demo Balance */}
                    <div className="rounded-2xl bg-gradient-to-br from-[#1C1F26] to-[#16181F] border border-[#262932] p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet className="w-24 h-24 text-orange-500" />
                        </div>
                        <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Demo Account</span>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-orange-400">₹799,900.00</span>
                        </div>
                        <div className="mt-4">
                            <button className="w-full bg-[#2E323E] hover:bg-[#373B48] text-orange-400 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                <History className="w-3 h-3" /> Reset Balance
                            </button>
                        </div>
                    </div>
                </section>

                {/* Dashboard Controls */}
                <DashboardHeader period={period} setPeriod={setPeriod} />

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : (
                    <>
                        {/* General Stats Grid */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="Total Profit"
                                value={`₹${data?.summary?.totalProfit}`}
                                trend={parseFloat(data?.summary?.totalProfit) >= 0 ? 'up' : 'down'}
                                icon={TrendingUp}
                                color={parseFloat(data?.summary?.totalProfit) >= 0 ? 'green' : 'red'}
                            />
                            <StatCard
                                title="Net Turnover"
                                value={`₹${data?.summary?.netTurnover}`}
                                icon={Activity}
                                color="blue"
                            />
                            <StatCard
                                title="Win Rate"
                                value={`${data?.summary?.winRate}%`}
                                subValue={`${data?.summary?.profitableTrades} Wins / ${data?.summary?.losingTrades} Losses`}
                                icon={Trophy}
                                color="yellow"
                            />
                            <StatCard
                                title="Total Trades"
                                value={data?.summary?.totalTrades}
                                subValue={`Avg Profit: ₹${data?.summary?.averageProfit}`}
                                icon={BarChart3}
                                color="blue"
                            />
                        </section>

                        {/* Charts Grid - Full Width Utilization */}
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">

                            {/* Main Profit Chart - Spans 2 columns */}
                            <div className="lg:col-span-2 rounded-2xl bg-[#1C1F26] border border-[#262932] p-6">
                                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full bg-emerald-500"></span>
                                    Profit Over Time
                                </h3>
                                <ProfitChart data={data?.charts?.profitOverTime} />
                            </div>

                            {/* Win Rate Chart */}
                            <div className="lg:col-span-1 rounded-2xl bg-[#1C1F26] border border-[#262932] p-6">
                                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full bg-yellow-500"></span>
                                    Win Rate %
                                </h3>
                                <WinRateChart data={data?.charts?.winRateOverTime} />
                            </div>

                            {/* Asset Performance */}
                            <div className="lg:col-span-1 rounded-2xl bg-[#1C1F26] border border-[#262932] p-6">
                                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full bg-blue-500"></span>
                                    P&L by Instrument
                                </h3>
                                <InstrumentChart data={data?.charts?.plByInstrument} />
                            </div>

                            {/* Distribution */}
                            <div className="lg:col-span-1 rounded-2xl bg-[#1C1F26] border border-[#262932] p-6">
                                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full bg-purple-500"></span>
                                    Trade Distribution
                                </h3>
                                <TradeDistribution data={data?.charts?.distribution} />
                            </div>

                            {/* Top Instruments Table */}
                            <div className="lg:col-span-1 rounded-2xl bg-[#1C1F26] border border-[#262932] p-6 overflow-hidden">
                                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full bg-orange-500"></span>
                                    Top Assets
                                </h3>
                                <div className="overflow-auto max-h-[300px]">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="text-xs uppercase bg-[#16181F] text-gray-500 font-bold sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2">Asset</th>
                                                <th className="px-3 py-2 text-right">Profit</th>
                                                <th className="px-3 py-2 text-right">Trades</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#262932]">
                                            {data?.charts?.plByInstrument.slice(0, 5).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-3 py-3 font-medium text-white">{item.name}</td>
                                                    <td className={`px-3 py-3 text-right font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {item.profit >= 0 ? '+' : ''}₹{item.profit.toFixed(0)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        {/* Need to find count from distribution if needed, simplified here */}
                                                        -
                                                    </td>
                                                </tr>
                                            ))}
                                            {data?.charts?.plByInstrument.length === 0 && (
                                                <tr><td colSpan="3" className="text-center py-4">No data</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
