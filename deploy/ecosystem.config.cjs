/**
 * PM2 ecosystem — copy to the server and fix paths + domains + ANNOUNCED_IP.
 *
 *   npm run build && cd server && npm run build
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * CRITICAL (production):
 * - video-app-sfu MUST use instances: 1, fork. Cluster mode runs separate Node
 *   processes with separate Socket.io + RoomManager state — joins break or
 *   clients never see each other / get random failures.
 * - NEXT_PUBLIC_SOCKET_URL must be set when you run `npm run build` for the
 *   Next app (values in PM2 env at `next start` do NOT change inlined URLs).
 * - ANNOUNCED_IP: prefer the SFU host’s public IPv4 (same as firewall opens
 *   WEBRTC_PORT_*). A hostname can fail ICE if DNS/proxy is wrong.
 */
module.exports = {
  apps: [
    {
      name: "video-app-web",
      cwd: "/var/www/video-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        // Must match the URL users open in the browser (nginx HTTPS host)
        NEXT_PUBLIC_SOCKET_URL: "https://meet.example.com",
        NEXT_PUBLIC_CLASSROOM_API_URL: "https://api.classroom.example.com",
      },
    },
    {
      name: "video-app-classroom-api",
      cwd: "/var/www/video-app/classroom-api",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "4000",
        MONGODB_URI: "mongodb://127.0.0.1:27017/classroom",
        JWT_SECRET: "replace-with-32+-char-secret",
        CORS_ORIGIN: "https://meet.example.com",
        HMS_ACCESS_KEY: "",
        HMS_SECRET: "",
        HMS_TEMPLATE_ID: "",
        // REDIS_URL: "redis://127.0.0.1:6379",
      },
    },
    {
      name: "video-app-sfu",
      // Match your server path (e.g. /var/www/video-meet/server)
      cwd: "/var/www/video-app/server",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1500M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        // Same origin(s) as the Next.js site — comma-separated if multiple
        CORS_ORIGIN: "https://meet.example.com",
        LISTEN_IP: "0.0.0.0",
        // Public IPv4 (or resolvable hostname) clients use for WebRTC — NOT 127.0.0.1
        ANNOUNCED_IP: "203.0.113.50",
        WEBRTC_PORT_MIN: "40000",
        WEBRTC_PORT_MAX: "49999",
        // NUM_WORKERS: "4",
      },
    },
  ],
};
