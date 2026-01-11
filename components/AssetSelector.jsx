"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Star, Globe, TrendingUp, BarChart3, Coins, Factory } from "lucide-react";
import { ALL_ASSETS, ASSET_CATEGORIES } from "../lib/assets";

export default function AssetSelector({ selectedAsset, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const categories = ["All", ...Object.values(ASSET_CATEGORIES)];

    const filteredAssets = ALL_ASSETS.filter(asset => {
        const matchesSearch = asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
            asset.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === "All" || asset.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const currentAsset = ALL_ASSETS.find(a => a.symbol === selectedAsset) || ALL_ASSETS[0];

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case ASSET_CATEGORIES.CRYPTO: return <Coins className="w-3 h-3" />;
            case ASSET_CATEGORIES.FOREX: return <Globe className="w-3 h-3" />;
            case ASSET_CATEGORIES.STOCKS: return <TrendingUp className="w-3 h-3" />;
            case ASSET_CATEGORIES.INDICES: return <BarChart3 className="w-3 h-3" />;
            case ASSET_CATEGORIES.COMMODITIES: return <Factory className="w-3 h-3" />;
            default: return <Star className="w-3 h-3" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 lg:gap-2 rounded-lg bg-gradient-to-br from-[#20232B] to-[#1B1E24] border border-white/5 px-2 lg:px-3 py-1.5 lg:py-2 text-xs hover:border-white/10 transition-colors"
            >
                <div className="flex flex-col leading-tight items-start">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[12px] lg:text-[13px] font-semibold text-[#F9FAFB]">{currentAsset.name}</span>
                        <span className="hidden lg:inline text-[10px] text-gray-500">{currentAsset.symbol}</span>
                    </div>
                </div>
                <div className="ml-1 lg:ml-2 px-1.5 lg:px-2 py-0.5 rounded-md bg-[#111827] text-[10px] lg:text-[11px] font-semibold text-emerald-400">
                    {currentAsset.payout}%
                </div>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[280px] lg:w-[320px] bg-[#1C1F27] border border-[#2C303A] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Search */}
                    <div className="p-3 border-b border-[#2C303A]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                                className="w-full bg-[#16181F] text-white text-[11px] pl-9 pr-3 py-2 rounded-lg border border-[#262932] focus:border-blue-500/50 outline-none placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex items-center gap-1 p-2 overflow-x-auto custom-scrollbar border-b border-[#2C303A]">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${activeCategory === cat
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#2C303A]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="flex-1 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {filteredAssets.map(asset => (
                            <button
                                key={asset.symbol}
                                onClick={() => {
                                    onSelect(asset.symbol);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${selectedAsset === asset.symbol ? 'bg-[#2563EB]/10' : 'hover:bg-[#2C303A]'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {getCategoryIcon(asset.category)}
                                    <div className="flex flex-col items-start">
                                        <span className={`text-[12px] font-medium ${selectedAsset === asset.symbol ? 'text-blue-400' : 'text-gray-200'}`}>
                                            {asset.name}
                                        </span>
                                        <span className="text-[10px] text-gray-500">{asset.symbol}</span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                    {asset.payout}%
                                </span>
                            </button>
                        ))}

                        {filteredAssets.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-[11px]">
                                No assets found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
