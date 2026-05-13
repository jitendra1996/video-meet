import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { logger } from "../common/logger.js";
/** Wire Redis pub/sub so Socket.IO rooms work across multiple API processes. */
export function attachRedisAdapter(io, redisUrl) {
    const pub = new Redis(redisUrl);
    const sub = pub.duplicate();
    io.adapter(createAdapter(pub, sub));
    logger.info("Socket.IO Redis adapter enabled");
}
//# sourceMappingURL=redis-io.adapter.js.map