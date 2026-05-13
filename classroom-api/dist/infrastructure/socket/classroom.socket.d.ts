import { Server } from "socket.io";
/**
 * Real-time classroom channel: chat, typing, lightweight presence, raise-hand, moderation hints.
 * Horizontal scaling: enable REDIS_URL so all nodes share room membership via @socket.io/redis-adapter.
 */
export declare function registerClassroomSockets(io: Server): void;
//# sourceMappingURL=classroom.socket.d.ts.map