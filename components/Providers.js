"use client";

import { SessionProvider } from "next-auth/react";
import PresenceProvider from "@/components/PresenceProvider";

export function Providers({ children }) {
    return (
        <SessionProvider>
            <PresenceProvider>
                {children}
            </PresenceProvider>
        </SessionProvider>
    );
}
