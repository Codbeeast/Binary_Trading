"use client";

import { useState, useEffect } from "react";
import { Copy, Gift, SwitchCamera, Save, AlertCircle, Info } from "lucide-react";

export default function AdminReferralSettings() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/admin/referral/config")
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch("/api/admin/referral/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });
            alert("Referral settings saved!");
        } catch (e) {
            alert("Failed to save.");
        }
        setSaving(false);
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...config.tiers];
        newTiers[index][field] = value;
        setConfig({ ...config, tiers: newTiers });
    };

    if (loading) return <div className="p-6 text-gray-400">Loading Configuration...</div>;

    return (
        <section className="bg-[#16181D] border border-[#272A32] rounded-xl mt-8 p-6 transition-all">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Gift size={20} className="text-[#FF5722]" />
                    Referral System Management
                </h2>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#1C1F27] p-4 rounded-xl border border-[#2C303A] flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-white">Master Switch</h3>
                        <p className="text-sm text-gray-400">Enable or disable entire referral payouts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={config.isEnabled}
                            onChange={(e) => setConfig({...config, isEnabled: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF5722]"></div>
                    </label>
                </div>

                <div className="bg-[#1C1F27] p-4 rounded-xl border border-[#2C303A]">
                    <h3 className="font-semibold text-white mb-2">Minimum Trade Amount (Trigger)</h3>
                    <div className="flex bg-[#12141A] rounded-lg border border-[#2A2E35] overflow-hidden">
                        <span className="px-3 py-2 text-gray-400 bg-[#16181D]">₹</span>
                        <input 
                            type="number" 
                            className="bg-transparent px-3 py-2 w-full text-white outline-none"
                            value={config.minTradeAmountForReward || 100}
                            onChange={(e) => setConfig({...config, minTradeAmountForReward: parseFloat(e.target.value)})}
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-[#1C1F27] rounded-xl border border-[#2C303A]">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-[#21242D] border-b border-[#2C303A] text-gray-400 uppercase">
                        <tr>
                            <th className="px-4 py-3 font-medium">Level</th>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium text-center" colSpan="2">Deposits Req (Min - Max)</th>
                            <th className="px-4 py-3 font-medium">RevShare %</th>
                            <th className="px-4 py-3 font-medium">Turnover %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C303A]/50">
                        {config.tiers?.map((tier, idx) => (
                            <tr key={idx} className="hover:bg-[#20242D] transition-colors">
                                <td className="px-4 py-3 font-bold text-white text-center">L{tier.level}</td>
                                <td className="px-4 py-3">
                                    <input type="text" value={tier.name} onChange={e => handleTierChange(idx, 'name', e.target.value)} className="bg-[#16181D] px-2 py-1 rounded border border-[#2C303A] text-white w-24 outline-none focus:border-[#FF5722]" />
                                </td>
                                <td className="px-2 py-3">
                                    <input type="number" value={tier.minDeposits} onChange={e => handleTierChange(idx, 'minDeposits', parseInt(e.target.value))} className="bg-[#16181D] px-2 py-1 rounded border border-[#2C303A] text-white w-16 outline-none focus:border-[#FF5722]" />
                                </td>
                                <td className="px-2 py-3">
                                    <input type="number" value={tier.maxDeposits || ''} placeholder="+" onChange={e => handleTierChange(idx, 'maxDeposits', e.target.value ? parseInt(e.target.value) : null)} className="bg-[#16181D] px-2 py-1 rounded border border-[#2C303A] text-white w-16 outline-none focus:border-[#FF5722]" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <input type="number" value={tier.revSharePercent} onChange={e => handleTierChange(idx, 'revSharePercent', parseFloat(e.target.value))} className="bg-[#16181D] px-2 py-1 rounded border border-[#2C303A] text-[#FF5722] font-bold w-16 outline-none focus:border-[#FF5722]" />
                                        <span>%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <input type="number" value={tier.turnoverPercent} onChange={e => handleTierChange(idx, 'turnoverPercent', parseFloat(e.target.value))} className="bg-[#16181D] px-2 py-1 rounded border border-[#2C303A] text-indigo-400 w-16 outline-none focus:border-indigo-500" />
                                        <span>%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1"><Info size={12}/> Leave Max Deposits empty for the final tier (Elite level). Rewards are based on RevShare % from referred user's trades that resolve as a loss.</p>
        </section>
    );
}
