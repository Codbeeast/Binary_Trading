"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

/**
 * Lightweight global presence tracker.
 * Maintains a SINGLE persistent socket connection across ALL pages
 * so that "Active Users" count on admin dashboard stays accurate
 * regardless of which route the user is on.
 *
 * IMPORTANT: Empty dependency array — this socket connects ONCE
 * on app load and stays alive until the browser tab is closed.
 * Route changes do NOT affect it.
 */
export default function PresenceProvider({ children }) {
    const socketRef = useRef(null);

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
            presenceSocket.emit('join_presence', {});
        });

        presenceSocket.on('reconnect', () => {
            console.log('🟢 Presence reconnected:', presenceSocket.id);
            presenceSocket.emit('join_presence', {});
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

    return children;
}
