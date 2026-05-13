/**
 * Socket.io Client Configuration
 *
 * Manages the connection to the signaling server.
 * Used for WebRTC signaling (room join, transport creation, etc.)
 */

import { io } from "socket.io-client";

/** Inlined at build time — must match your SFU HTTPS URL in production. */
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

/**
 * `polling` only — use if nginx/WebSocket upgrade is broken but HTTPS GET works.
 * Rebuild Next after changing. Default: websocket then polling (Socket.io fallback).
 */
function socketTransports(): ("websocket" | "polling")[] {
  const mode = process.env.NEXT_PUBLIC_SOCKET_TRANSPORTS?.trim().toLowerCase();
  if (mode === "polling") return ["polling"];
  if (mode === "websocket") return ["websocket"];
  return ["websocket", "polling"];
}

/**
 * Create a Socket.io connection to the signaling server.
 */
export function createSocket() {
  return io(SOCKET_URL, {
    transports: socketTransports(),
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });
}

export type SocketClient = ReturnType<typeof createSocket>;
