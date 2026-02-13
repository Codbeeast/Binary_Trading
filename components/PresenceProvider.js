"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";

/**
 * Lightweight global presence tracker.
 * Maintains a persistent socket connection across ALL pages
 * so that "Active Users" count on admin dashboard stays accurate
 * regardless of which route the user is on.
 * 
 * This socket does NOT handle market data, trades, or candles —
 * those are handled by page-level sockets.
 */
export default function PresenceProvider({ children }) {
    const { data: session } = useSession();
    const socketRef = useRef(null);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

        const presenceSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            query: { presence: true }, // Tag this as a presence-only connection
        });

        presenceSocket.on('connect', () => {
            console.log('🟢 Presence connected');
            presenceSocket.emit('join_presence', {
                userId: session?.user?.id || null,
            });
        });

        presenceSocket.on('disconnect', () => {
            console.log('🔴 Presence disconnected');
        });

        socketRef.current = presenceSocket;

        return () => {
            presenceSocket.close();
            socketRef.current = null;
        };
    }, [session?.user?.id]);

    return children;
}
