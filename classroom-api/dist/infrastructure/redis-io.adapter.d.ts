import type { Server } from "socket.io";
/** Wire Redis pub/sub so Socket.IO rooms work across multiple API processes. */
export declare function attachRedisAdapter(io: Server, redisUrl: string): void;
//# sourceMappingURL=redis-io.adapter.d.ts.map