"use client";
import React, { useState } from "react";
import GlobalSidebar from "@/components/GlobalSidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Shell({ children }) {
    const pathname = usePathname();
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
                    "min-h-screen transition-all duration-300 ease-in-out",
                    pathname !== '/' && "lg:pl-[80px]" // Only add padding if not on home page
                )}
            >
                {children}
            </div>
        </>
    );
}
