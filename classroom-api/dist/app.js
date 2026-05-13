import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logger } from "./common/logger.js";
import { errorHandler } from "./common/errors/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { liveClassRoutes } from "./modules/live-class/live-class.routes.js";
import { chatRoutes } from "./modules/chat/chat.routes.js";
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { recordingRoutes } from "./modules/recording/recording.routes.js";
import { notificationRoutes } from "./modules/notifications/notification.routes.js";
import { hmsWebhookHandler } from "./webhooks/hms.webhook.js";
import { registerClassroomSockets } from "./infrastructure/socket/classroom.socket.js";
import { attachRedisAdapter } from "./infrastructure/redis-io.adapter.js";
const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
const socketOrigins = (env.SOCKET_CORS_ORIGIN ?? env.CORS_ORIGIN)
    .split(",")
    .map((o) => o.trim());
export async function createApp() {
    const app = express();
    app.set("trust proxy", 1);
    app.use(helmet({
        contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    }));
    app.use(cors({
        origin: corsOrigins,
        credentials: true,
    }));
    app.use(rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
    }));
    app.use(pinoHttp({
        logger,
        autoLogging: {
            ignore: (req) => req.url === "/health",
        },
    }));
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", service: "classroom-api" });
    });
    app.post("/webhooks/hms", express.raw({ type: "application/json" }), hmsWebhookHandler);
    app.use(express.json({ limit: "1mb" }));
    app.use("/api/v1/auth", authRoutes);
    app.use("/api/v1/live-classes", liveClassRoutes);
    app.use("/api/v1", chatRoutes);
    app.use("/api/v1", attendanceRoutes);
    app.use("/api/v1/recordings", recordingRoutes);
    app.use("/api/v1/notifications", notificationRoutes);
    app.use(errorHandler);
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: socketOrigins,
            credentials: true,
        },
        transports: ["websocket", "polling"],
        pingTimeout: 60_000,
        pingInterval: 25_000,
    });
    if (env.REDIS_URL) {
        attachRedisAdapter(io, env.REDIS_URL);
    }
    registerClassroomSockets(io);
    return { app, httpServer, io };
}
//# sourceMappingURL=app.js.map