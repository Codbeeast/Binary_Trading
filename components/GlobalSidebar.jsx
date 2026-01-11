"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    LayoutDashboard,
    Trophy,
    Menu,
    X,
    ChevronLeft,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function GlobalSidebar({
    isCollapsed,
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen
}) {
    const pathname = usePathname();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname, setIsMobileOpen]);

    // Don't render sidebar on home page
    if (pathname === '/') return null;

    const navItems = [
        { name: "Market", href: "/chart", icon: BarChart3 },
        { name: "Analytics", href: "/analytics", icon: LayoutDashboard },
        { name: "Tournaments", href: "#", icon: Trophy, isComingSoon: true },
    ];

    const handleComingSoon = (e, name) => {
        if (name === "Tournaments") {
            e.preventDefault();
            // Simple custom toast or alert for now
            alert("Tournaments feature is coming soon!");
        }
    };

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed left-4 top-3 z-[60] p-2 rounded-lg bg-[#262932] text-gray-400 lg:hidden hover:bg-[#2E323E] hover:text-white transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Overlay for Mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-[100] h-screen transition-all duration-300 ease-in-out flex flex-col",
                    "bg-[#111318] border-r border-[#262932]", // Deep dark background with subtle border
                    isMobileOpen ? "translate-x-0 w-[280px]" : "-translate-x-full lg:translate-x-0",
                    isCollapsed ? "lg:w-[80px]" : "lg:w-[280px]" // Slightly wider collapsed/expanded states for "bigger" feel
                )}
            >
                {/* Brand / Logo Section */}
                <div className={cn(
                    "h-20 flex items-center border-b border-[#262932] transition-all duration-300 relative overflow-hidden", // Taller header (h-20)
                    isCollapsed ? "justify-center px-0" : "px-6 gap-4"
                )}>
                    {/* Background glow for logo area */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />

                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 font-bold text-white shadow-lg shadow-orange-500/30 shrink-0">
                        <span className="text-xl">F</span>
                    </div>
                    <span className={cn(
                        "font-bold tracking-tight text-2xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap relative z-10",
                        isCollapsed ? "hidden" : "block"
                    )}>
                        Finexa
                    </span>
                </div>

                {/* Mobile Header (Close Button) */}
                {isMobileOpen &&
                    <div className="flex items-center justify-between p-4 lg:hidden border-b border-[#262932] absolute top-0 right-0 left-0 bg-[#16181F] z-20">
                        <span className="font-bold text-white text-lg">Menu</span>
                        <button onClick={() => setIsMobileOpen(false)} className="text-gray-400 p-2">
                            <X className="w-6 h-6" />
                        </button>
                    </div>}

                {/* Navigation Items */}
                <div className="flex-1 py-8 flex flex-col gap-3 px-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={(e) => item.isComingSoon && handleComingSoon(e, item.name)}
                                className={cn(
                                    "flex items-center gap-4 px-3 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent text-white"
                                        : "text-gray-400 hover:bg-[#1A1D24] hover:text-white"
                                )}
                            >
                                {/* Active Indicator Strip */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
                                )}

                                <div className={cn(
                                    "relative z-10 flex items-center justify-center transition-all duration-300",
                                    isActive ? "text-orange-500" : "group-hover:text-orange-400",
                                    isCollapsed ? "mx-auto" : ""
                                )}>
                                    <item.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]")} />
                                </div>

                                <span className={cn(
                                    "font-medium whitespace-nowrap transition-all duration-300 z-10 text-[15px] tracking-wide",
                                    !isMobileOpen && isCollapsed ? "opacity-0 w-0 overflow-hidden absolute" : "opacity-100 w-auto"
                                )}>
                                    {item.name}
                                </span>

                                {/* Tooltip for collapsed state */}
                                {!isMobileOpen && isCollapsed && (
                                    <div className="absolute left-full ml-6 px-3 py-2 bg-[#1E2129] text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 border border-white/10 shadow-2xl shadow-black/50">
                                        {item.name}
                                        {/* Little triangular arrow */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#1E2129] rotate-45 border-l border-b border-white/10" />
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#262932] flex flex-col gap-3 bg-[#111318]/50">
                    {/* Settings */}
                    <button className={cn(
                        "flex items-center gap-4 px-3 py-3 rounded-2xl text-gray-400 hover:bg-[#1A1D24] hover:text-white transition-all duration-300 group",
                        !isMobileOpen && isCollapsed && "justify-center"
                    )}>
                        <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform duration-500" />
                        <span className={cn(
                            "font-medium whitespace-nowrap transition-all duration-300 text-[15px]",
                            !isMobileOpen && isCollapsed ? "hidden" : "block"
                        )}>Settings</span>
                    </button>

                    {/* Collapse Toggle (Desktop Only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex items-center justify-center w-full py-3 mt-2 rounded-xl bg-[#1A1D24] hover:bg-[#20232B] text-gray-400 hover:text-white transition-all duration-300 border border-[#262932] hover:border-gray-600"
                    >
                        <ChevronLeft className={cn(
                            "w-5 h-5 transition-transform duration-300",
                            isCollapsed && "rotate-180"
                        )} />
                    </button>
                </div>
            </aside>
        </>
    );
}
