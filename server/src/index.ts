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
 *   WEBRTC_PORT_MAX   - WebRTC port range end (default: 40100)
 */

import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { config } from "./config.js";
import { WorkerPool } from "./WorkerPool.js";
import { RoomManager } from "./RoomManager.js";
import { registerSignalingHandlers } from "./signaling.js";

async function main(): Promise<void> {
  // Initialize MediaSoup worker pool
  const workerPool = new WorkerPool();
  await workerPool.initialize();

  // Room management
  const roomManager = new RoomManager(workerPool);

  // Express app for health checks and static serving
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      workers: config.numWorkers,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/stats", (_req, res) => {
    res.json({
      rooms: roomManager.roomCount,
      workers: config.numWorkers,
    });
  });

  // HTTP server
  const httpServer = createServer(app);

  // Socket.io with CORS - allow localhost and 127.0.0.1 (browser may use either)
  const corsOrigin = process.env.CORS_ORIGIN;
  const io = new Server(httpServer, {
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

  registerSignalingHandlers(io, roomManager);

  httpServer.listen(config.httpPort, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  Video Conferencing SFU Server                           ║
║  Port: ${config.httpPort} | Workers: ${config.numWorkers}  ║
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
