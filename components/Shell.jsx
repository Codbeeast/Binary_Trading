"use client";
import React, { useState } from "react";
import GlobalSidebar from "@/components/GlobalSidebar";
import { cn } from "@/lib/utils";

export default function Shell({ children }) {
    const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed as requested
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            <GlobalSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />
            <div
                className={cn(
                    "min-h-screen transition-all duration-300 ease-in-out md:pl-[80px]" // Static padding matches new sidebar collapsed width (80px)
                )}
            >
                {children}
            </div>
        </>
    );
}
