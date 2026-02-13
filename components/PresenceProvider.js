"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

/**
 * Lightweight global presence tracker — ONLY for logged-in users.
 *
 * - Creates a socket ONLY when user is authenticated
 * - Destroys the socket when user logs out
 * - Persists across route changes (lives in root layout)
 * - Uses userId, falling back to email if id is missing
 */
export default function PresenceProvider({ children }) {
    const socketRef = useRef(null);
    const { data: session, status } = useSession();

    // Derive a stable user identifier — prefer id, fallback to email
    const userId = session?.user?.id || session?.user?.email || null;
    const isAuthenticated = status === "authenticated" && !!userId;

    useEffect(() => {
        // Debug log to trace what we're getting from session
        console.log('🔍 PresenceProvider:', { status, userId, isAuthenticated, sessionUser: session?.user });

        // Only create presence socket when user is AUTHENTICATED
        if (!isAuthenticated) {
            // If user logged out but socket exists, clean it up
            if (socketRef.current) {
                console.log('🔴 Presence: user logged out, closing socket');
                socketRef.current.emit('leave_presence');
                socketRef.current.close();
                socketRef.current = null;
            }
            return;
        }

        // Prevent double-connection if socket already exists for this user
        if (socketRef.current) {
            // If connected, re-emit join_presence in case userId changed
            if (socketRef.current.connected) {
                socketRef.current.emit('join_presence', { userId });
            }
            return;
        }

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        console.log('🟢 Presence: creating socket for userId:', userId, 'url:', socketUrl);

        const presenceSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            query: { presence: true },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
        });

        presenceSocket.on('connect', () => {
            console.log('🟢 Presence connected:', presenceSocket.id, 'userId:', userId);
            presenceSocket.emit('join_presence', { userId });
        });

        presenceSocket.on('reconnect', () => {
            console.log('🟢 Presence reconnected:', presenceSocket.id, 'userId:', userId);
            presenceSocket.emit('join_presence', { userId });
        });

        presenceSocket.on('disconnect', (reason) => {
            console.log('🔴 Presence disconnected:', reason);
        });

        socketRef.current = presenceSocket;

        // Cleanup on unmount or when userId changes
        return () => {
            console.log('🔴 Presence: cleanup, closing socket');
            presenceSocket.emit('leave_presence');
            presenceSocket.close();
            socketRef.current = null;
        };
    }, [isAuthenticated, userId]); // Re-run when auth state or userId changes

    return children;
}
