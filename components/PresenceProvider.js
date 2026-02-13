"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

/**
 * Lightweight global presence tracker.
 * Maintains a SINGLE persistent socket connection across ALL pages
 * so that "Active Users" count on admin dashboard stays accurate
 * regardless of which route the user is on.
 *
 * IMPORTANT: This socket connects ONCE on app load and stays alive
 * until the browser tab is closed. Route changes do NOT affect it.
 * The userId from the session is sent so the server can uniquely
 * identify users even behind reverse proxies.
 */
export default function PresenceProvider({ children }) {
    const socketRef = useRef(null);
    const { data: session } = useSession();
    const userId = session?.user?.id;

    useEffect(() => {
        // Prevent double-connection in React Strict Mode
        if (socketRef.current) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

        const presenceSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            query: { presence: true },
            reconnection: true,        // Auto-reconnect if connection drops
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
        });

        presenceSocket.on('connect', () => {
            console.log('🟢 Presence connected:', presenceSocket.id);
            presenceSocket.emit('join_presence', { userId: userId || null });
        });

        presenceSocket.on('reconnect', () => {
            console.log('🟢 Presence reconnected:', presenceSocket.id);
            presenceSocket.emit('join_presence', { userId: userId || null });
        });

        presenceSocket.on('disconnect', (reason) => {
            console.log('🔴 Presence disconnected:', reason);
        });

        socketRef.current = presenceSocket;

        // Cleanup only on full app unmount (tab close)
        return () => {
            presenceSocket.close();
            socketRef.current = null;
        };
    }, []); // EMPTY — mount once, persist forever

    // If userId becomes available after initial mount (session loads async),
    // re-emit join_presence with the real userId so server can re-key us.
    useEffect(() => {
        if (userId && socketRef.current?.connected) {
            console.log('🟢 Presence re-joining with userId:', userId);
            socketRef.current.emit('join_presence', { userId });
        }
    }, [userId]);

    return children;
}
