"use client";

import { io, type Socket } from "socket.io-client";

const BASE =
  process.env.NEXT_PUBLIC_CLASSROOM_API_URL ?? "http://localhost:4000";

export function createClassroomSocket(token: string): Socket {
  return io(BASE, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
  });
}
