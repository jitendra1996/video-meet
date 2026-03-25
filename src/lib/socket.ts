/**
 * Socket.io Client Configuration
 *
 * Manages the connection to the signaling server.
 * Used for WebRTC signaling (room join, transport creation, etc.)
 */

import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

/**
 * Create a Socket.io connection to the signaling server.
 */
export function createSocket() {
  return io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });
}

export type SocketClient = ReturnType<typeof createSocket>;
