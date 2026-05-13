"use strict";
/**
 * Video Conferencing SFU Server
 *
 * Main entry point for the MediaSoup + Socket.io server.
 * Supports 1000+ concurrent users with multi-worker architecture.
 *
 * Usage:
 *   npm run dev   - Development with hot reload
 *   npm run start - Production (after build)
 *
 * Environment variables:
 *   PORT              - HTTP port (default: 3001)
 *   NUM_WORKERS       - MediaSoup workers (default: CPU count)
 *   LISTEN_IP         - Bind address (default: 0.0.0.0)
 *   ANNOUNCED_IP      - Public IP for ICE (required for production/NAT)
 *   WEBRTC_PORT_MIN   - WebRTC port range start (default: 40000)
 *   WEBRTC_PORT_MAX   - WebRTC port range end (default: 49999; keep range wide)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const config_js_1 = require("./config.js");
const WorkerPool_js_1 = require("./WorkerPool.js");
const RoomManager_js_1 = require("./RoomManager.js");
const signaling_js_1 = require("./signaling.js");
async function main() {
    const { min: rtcMin, max: rtcMax } = config_js_1.config.webRtcPortRange;
    const rtcSpan = rtcMax - rtcMin + 1;
    console.log(`[SFU] WebRTC ports (UDP+TCP): ${rtcMin}-${rtcMax} (${rtcSpan} ports) — set WEBRTC_PORT_MIN/WEBRTC_PORT_MAX in PM2 if wrong`);
    if (rtcSpan < 1000) {
        console.error(`[SFU] ERROR: Port range is only ${rtcSpan}. "no more available ports" will happen after a few users. Set e.g. WEBRTC_PORT_MAX=49999, open that range in the firewall, rebuild, pm2 restart.`);
    }
    // Initialize MediaSoup worker pool
    const workerPool = new WorkerPool_js_1.WorkerPool();
    await workerPool.initialize();
    // Room management
    const roomManager = new RoomManager_js_1.RoomManager(workerPool);
    // Express app for health checks and static serving
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        const { min, max } = config_js_1.config.webRtcPortRange;
        res.json({
            status: "ok",
            workers: config_js_1.config.numWorkers,
            webrtcPorts: { min, max, count: max - min + 1 },
            timestamp: new Date().toISOString(),
        });
    });
    app.get("/stats", (_req, res) => {
        res.json({
            rooms: roomManager.roomCount,
            workers: config_js_1.config.numWorkers,
        });
    });
    // HTTP server
    const httpServer = (0, node_http_1.createServer)(app);
    // Socket.io with CORS - allow localhost and 127.0.0.1 (browser may use either)
    const corsOrigin = process.env.CORS_ORIGIN;
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: corsOrigin
                ? corsOrigin.split(",").map((o) => o.trim())
                : ["http://localhost:3000", "http://127.0.0.1:3000"],
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    (0, signaling_js_1.registerSignalingHandlers)(io, roomManager);
    httpServer.listen(config_js_1.config.httpPort, () => {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║  Video Conferencing SFU Server                           ║
║  HTTP: ${config_js_1.config.httpPort} | Workers: ${config_js_1.config.numWorkers} | RTC: ${config_js_1.config.webRtcPortRange.min}-${config_js_1.config.webRtcPortRange.max} ║
╚══════════════════════════════════════════════════════════╝
    `);
    });
    // Graceful shutdown
    const shutdown = async () => {
        console.log("\n[Server] Shutting down...");
        httpServer.close();
        await workerPool.close();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
