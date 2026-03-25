# Video Meet - WebRTC Video Conferencing

A professional video conferencing application similar to Google Meet or Zoom, built with **WebRTC**, **MediaSoup** (SFU), and **Socket.io**. Designed to scale to **1000+ concurrent users** using a multi-worker architecture.

## Features

- **Real-time video/audio** via WebRTC
- **SFU architecture** (Selective Forwarding Unit) for efficient scaling
- **Room-based** conferencing - create or join rooms by ID
- **Mute/unmute** camera and microphone
- **Responsive UI** with dark theme
- **Scalable** - MediaSoup workers distribute load across CPU cores

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   Next.js       │     │  Node.js SFU Server (port 3001)       │
│   Frontend      │────▶│  ┌────────────┐  ┌─────────────────┐   │
│   (port 3000)   │     │  │ Socket.io  │  │ MediaSoup      │   │
│                 │     │  │ Signaling  │  │ Worker Pool    │   │
└─────────────────┘     │  └────────────┘  │ (N workers)     │   │
                         │        │         └────────┬────────┘   │
                         │        │                  │            │
                         │  ┌─────▼──────┐    ┌──────▼──────┐     │
                         │  │ Room       │    │ Router      │     │
                         │  │ Manager    │    │ (per room)  │     │
                         │  └────────────┘    └─────────────┘     │
                         └──────────────────────────────────────┘
```

- **Frontend**: Next.js 16 + React 19 + mediasoup-client
- **Signaling**: Socket.io (room join/leave, WebRTC SDP/ICE exchange)
- **Media**: MediaSoup SFU (forwards RTP without transcoding)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Install Dependencies

```bash
# Root (frontend)
npm install

# Server
cd server && npm install && cd ..
```

### 2. Start Development

**Option A: Run both frontend and server**

```bash
npm run dev:all
```

**Option B: Run separately (two terminals)**

```bash
# Terminal 1 - SFU server
npm run dev:server

# Terminal 2 - Next.js frontend
npm run dev
```

### 3. Open the App

1. Go to [http://localhost:3000](http://localhost:3000)
2. Enter your name and optionally a room ID
3. Click **Join Meeting**
4. Allow camera/microphone when prompted

To test with multiple participants, open another browser tab or incognito window and join the same room ID.

## Project Structure

```
video-app/
├── src/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx         # Landing (join form)
│   │   └── room/page.tsx    # Video room UI
│   ├── hooks/
│   │   └── useVideoRoom.ts  # Room lifecycle hook
│   └── lib/
│       ├── socket.ts        # Socket.io client
│       └── mediasoup-client.ts  # WebRTC/MediaSoup client
├── server/                  # SFU backend
│   └── src/
│       ├── index.ts         # Entry point
│       ├── config.ts        # Server config
│       ├── WorkerPool.ts    # MediaSoup workers
│       ├── Room.ts          # Room + participants
│       ├── RoomManager.ts   # Room lifecycle
│       └── signaling.ts     # Socket.io handlers
├── docs/
│   └── ARCHITECTURE.md      # Architecture guide
└── .env.example             # Environment template
```

## Configuration

Copy `.env.example` to `.env.local` (frontend) and configure `server/.env` for the backend.

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL | `http://localhost:3001` |
| `PORT` | SFU server HTTP port | `3001` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `NUM_WORKERS` | MediaSoup workers | CPU count |
| `ANNOUNCED_IP` | Public IP (production/NAT) | - |
| `WEBRTC_PORT_MIN/MAX` | WebRTC UDP port range | 40000-40100 |

## Production Deployment

1. **Set `ANNOUNCED_IP`** to your server's public IP or domain (required for WebRTC across NAT).
2. **Open firewall** for UDP ports in `WEBRTC_PORT_MIN`–`WEBRTC_PORT_MAX`.
3. **Use HTTPS** for the frontend (required for `getUserMedia` in production).
4. **Scale horizontally**: Run multiple SFU servers behind a load balancer; use sticky sessions for Socket.io.

## Scaling to 1000 Users

- Each MediaSoup worker handles ~500 consumers. Use `NUM_WORKERS` = CPU cores.
- For 1000+ users in one room, consider **router piping** or **multiple hosts** (see [MediaSoup Scalability](https://mediasoup.org/documentation/v3/scalability)).
- For many small rooms, the default setup scales well.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run dev:server` | SFU server (dev) |
| `npm run dev:all` | Both (concurrently) |
| `npm run build` | Build Next.js |
| `npm run build:server` | Build server |
| `npm run start` | Next.js production |
| `npm run start:server` | SFU production |

## License

MIT
