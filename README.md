# Video App — MediaSoup meetings + Live classes (100ms)

This repository contains **two independent real-time stacks** that share the same Next.js frontend:

| Stack | Purpose | Backend | When to use |
|--------|---------|---------|-------------|
| **Video Meet (SFU)** | Self-hosted WebRTC rooms | `server/` — MediaSoup + Socket.IO | Quick meetings, full control, no third-party media |
| **Live classes** | Structured classes with roles, chat, attendance, recordings | `classroom-api/` — Express + MongoDB + 100ms | Teacher/student flows, 100ms cloud media, persistence |

You can run either stack alone or both.

---

## 1. How the project fits together

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js (port 3000)                              │
│  /, /room          → MediaSoup client (NEXT_PUBLIC_SOCKET_URL)         │
│  /login, /dashboard, /classroom/* → classroom-api + 100ms SDK          │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐     ┌──────────────────────────────────────────┐
│  server/ (port 3001)      │     │  classroom-api/ (port 4000)               │
│  MediaSoup SFU + Socket │     │  Express REST + Socket.IO + Mongoose      │
└───────────────────────────┘     │  100ms server SDK (rooms, tokens)         │
                                  │  Optional: Redis (Socket.IO scale-out)   │
                                  │  Optional: S3 (signed recording URLs)    │
                                  └──────────────────┬─────────────────────┘
                                                     ▼
                                            MongoDB (classes, chat, …)
```

- **Environment files are separate**: Next.js reads **`.env.local`** (root). The SFU reads **`server/` process env**. **Live classes** read **`classroom-api/.env`**.

---

## 2. Repository layout

```
video-app/
├── src/                          # Next.js app
│   ├── app/
│   │   ├── page.tsx              # Landing → legacy MediaSoup /room
│   │   ├── room/                 # MediaSoup video room
│   │   ├── login, register       # Classroom auth
│   │   ├── dashboard/teacher|student
│   │   └── classroom/…          # Live class UI, attendance, recordings
│   ├── store/                    # Redux (classroom auth + class list)
│   └── lib/
│       ├── socket.ts             # SFU Socket.IO client
│       ├── mediasoup-client.ts
│       ├── classroom-api.ts      # REST client for classroom-api
│       └── classroom-socket.ts   # Socket.IO for classroom
├── server/                       # MediaSoup SFU
├── classroom-api/                # Live classes backend (see classroom-api/docs/ARCHITECTURE.md)
├── deploy/                       # PM2, nginx examples
├── docker-compose.classroom.yml  # Mongo + Redis for local dev
├── .env.example                  # Frontend + SFU variable names (reference)
├── .env.production.example       # Production hints for SFU + Next
└── classroom-api/.env.example    # Full classroom-api template
```

---

## 3. Environment variables (step by step)

### Step A — Frontend (Next.js), file: **`.env.local`** (create at repo root)

Copy from [`.env.example`](.env.example) and set:

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Public **HTTPS** URL of the SFU (e.g. `https://sfu.yourdomain.com`). **Must be set before `npm run build`** — values are inlined into the client bundle. |
| `NEXT_PUBLIC_CLASSROOM_API_URL` | `http://localhost:4000` | Public **HTTPS** URL of classroom-api (e.g. `https://api.classroom.yourdomain.com`). **Set before `npm run build`.** |

Optional (see [`.env.production.example`](.env.production.example)):

- `NEXT_PUBLIC_SOCKET_TRANSPORTS` — e.g. `polling` if WebSocket upgrade fails behind nginx until you fix upgrade headers.
- `NEXT_PUBLIC_ICE_SERVERS` — JSON array of STUN/TURN (rebuild after change; credentials are visible in the browser).

### Step B — MediaSoup SFU (`server/`), file: **`server/.env`** or shell/PM2 env

| Variable | Development | Production |
|----------|-------------|------------|
| `PORT` | `3001` | Same or your mapped port |
| `CORS_ORIGIN` | `http://localhost:3000` | Your Next.js origin(s), comma-separated, e.g. `https://meet.yourdomain.com` |
| `LISTEN_IP` | (default) | `0.0.0.0` |
| `ANNOUNCED_IP` | Often omit on LAN | **Required**: public IPv4 or DNS name of the SFU host for ICE |
| `WEBRTC_PORT_MIN` / `WEBRTC_PORT_MAX` | Defaults in app | Wide range (e.g. `40000`–`49999`) + **open in firewall** |
| `NUM_WORKERS` | Optional | MediaSoup workers (defaults to CPU count, capped) |

### Step C — Live classes API (`classroom-api/`), file: **`classroom-api/.env`**

Copy from [`classroom-api/.env.example`](classroom-api/.env.example).

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` / `production` |
| `PORT` | Yes | API port (default `4000`) |
| `MONGODB_URI` | Yes | e.g. `mongodb://127.0.0.1:27017/classroom` |
| `JWT_SECRET` | Yes | Long random string (use **32+ chars in production**) |
| `JWT_EXPIRES_IN` | Optional | e.g. `15m`, `1h` |
| `CORS_ORIGIN` | Yes | Next.js origin, e.g. `http://localhost:3000` |
| `SOCKET_CORS_ORIGIN` | Optional | Comma-separated if different from `CORS_ORIGIN` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Optional | Global HTTP rate limit |
| `REDIS_URL` | Optional | e.g. `redis://127.0.0.1:6379` — enables Socket.IO Redis adapter for multiple API instances |
| `HMS_ACCESS_KEY` | Yes (live classes) | 100ms dashboard → Developer |
| `HMS_SECRET` | Yes | 100ms app secret |
| `HMS_TEMPLATE_ID` | Yes | Template whose roles match the next two vars |
| `HMS_ROLE_TEACHER` | Optional | Default `host` — must exist in template |
| `HMS_ROLE_STUDENT` | Optional | Default `viewer` — must exist in template |
| `HMS_AUTH_TOKEN_TTL_SECONDS` | Optional | Client join token lifetime |
| `TEACHER_INVITE_CODE` | Optional | If set, required in body `inviteCode` when registering as `teacher` |
| `ADMIN_INVITE_CODE` | Optional | Same for `admin` |
| `HMS_WEBHOOK_SECRET` | Optional | If set, webhook HMAC verification uses it (align with 100ms dashboard) |
| `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Optional | Private bucket for recording objects; API returns signed URLs |
| `SIGNED_URL_TTL_SECONDS` | Optional | Presigned URL lifetime |

**100ms setup checklist**

1. Create app + template with at least two roles (e.g. `host` / `viewer`).
2. Put **template ID** in `HMS_TEMPLATE_ID`.
3. Match `HMS_ROLE_TEACHER` / `HMS_ROLE_STUDENT` to those role names exactly.

---

## 4. Development: install and run

### Prerequisites

- Node.js 18+ (22 OK)
- MongoDB for live classes (local install or Docker)
- 100ms account + keys for live classes

### 4.1 Install dependencies

```bash
# Frontend
npm install

# MediaSoup SFU
cd server && npm install && cd ..

# Classroom API
cd classroom-api && npm install && cd ..
```

If `npm install` at root fails on `@100mslive/react-sdk` (React 19 peer range), use:

```bash
npm install --legacy-peer-deps
```

### 4.2 Start MongoDB (and optionally Redis)

```bash
docker compose -f docker-compose.classroom.yml up -d
```

This exposes MongoDB on `27017` and Redis on `6379`.

### 4.3 Configure env files

1. Root: **`.env.local`** — set `NEXT_PUBLIC_SOCKET_URL` and `NEXT_PUBLIC_CLASSROOM_API_URL`.
2. **`classroom-api/.env`** — copy from `classroom-api/.env.example` and fill `MONGODB_URI`, `JWT_SECRET`, all `HMS_*` fields.
3. **`server/.env`** (optional for dev on one machine) — at minimum `CORS_ORIGIN=http://localhost:3000`.

### 4.4 Run processes

**Legacy MediaSoup meeting only**

```bash
npm run dev:all
# → Next on :3000, SFU on :3001
```

**Live classes only**

```bash
# Terminal 1
cd classroom-api && npm run dev

# Terminal 2 (from repo root)
npm run dev
```

**Everything at once**

```bash
npm run dev:full
```

(Ensure Mongo is up and `classroom-api/.env` is valid.)

---

## 5. Testing in development (step by step)

### 5.1 Test MediaSoup (“Video Meet”)

1. Run `npm run dev:all`.
2. Open `http://localhost:3000`, enter name, optional room id, **Join Meeting**.
3. Open a second window (or incognito) with the **same room id**.
4. Confirm video/audio; check browser console for Socket.IO / WebRTC errors.

**LAN / remote testing:** set `ANNOUNCED_IP` on the SFU to this machine’s LAN or public IP and open the WebRTC port range in the firewall.

### 5.2 Test live classes (100ms + classroom-api)

1. **Start** `classroom-api` (`npm run dev` in `classroom-api/`) and **Next** (`npm run dev` at root). Mongo must be running.
2. **Register**  
   - Open `http://localhost:3000/register`.  
   - Register a **student** (no invite code).  
   - Register a **teacher**: set role to Teacher and use `TEACHER_INVITE_CODE` from `classroom-api/.env` if you enabled it.
3. **Teacher:** log in → `http://localhost:3000/dashboard/teacher` → **Create** a class → **Start** the class.
4. **Enroll student:** on the teacher dashboard, paste the student’s **Mongo user `_id`** into the enroll field (from DB or from a second registration) → **Enroll**.
5. **Student:** log in → dashboard → **Join live** when status is live.
6. **Teacher:** **Enter** the same live class.
7. In the live room, click **Connect** if needed, then verify tiles, mic/camera, chat, raise hand, leave.

**Common issues**

- **`Join failed` / 502 from 100ms:** wrong `HMS_*` or template/role mismatch.
- **CORS:** `CORS_ORIGIN` in `classroom-api` must include exact browser origin (including port).
- **Socket.IO not connecting:** `NEXT_PUBLIC_CLASSROOM_API_URL` must match where `classroom-api` listens (scheme + host + port).
- **Student cannot join:** not **enrolled** or class not **started** (`status` must be `live`).

### 5.3 Automated test (classroom-api)

```bash
cd classroom-api && npm test
```

---

## 6. Production deployment (summary)

### 6.1 Build

```bash
npm run build
npm run build:server
npm run build:classroom
```

### 6.2 Next.js — critical

- Set **`NEXT_PUBLIC_SOCKET_URL`** and **`NEXT_PUBLIC_CLASSROOM_API_URL`** to **HTTPS** public URLs **before** `npm run build`.
- Changing them later requires a **rebuild**, not only restarting PM2.

### 6.3 SFU host

- **`ANNOUNCED_IP`**, **`WEBRTC_PORT_*`**, firewall, and HTTPS on the site that uses `getUserMedia`.
- PM2: use **one instance**, **fork** mode for the SFU (not cluster) so Socket.IO + room state stay coherent. See [`deploy/ecosystem.config.cjs`](deploy/ecosystem.config.cjs).

### 6.4 classroom-api host

- Strong **`JWT_SECRET`**, MongoDB (replica set for HA), TLS termination (nginx/Caddy).
- Optional **`REDIS_URL`** when running **multiple** API replicas for Socket.IO.
- Lock down **`/webhooks/hms`** (IP allowlist if 100ms publishes ranges; verify signatures with **`HMS_WEBHOOK_SECRET`**).
- S3 bucket **private**; only **signed URLs** returned to authorized users.

### 6.5 Reference configs

- PM2: [`deploy/ecosystem.config.cjs`](deploy/ecosystem.config.cjs) (includes `video-app-classroom-api`).
- Nginx (API + WebSocket): [`deploy/nginx-classroom-api.example.conf`](deploy/nginx-classroom-api.example.conf).
- Production env template: [`.env.production.example`](.env.production.example).

---

## 7. Scripts reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev |
| `npm run dev:server` | MediaSoup SFU dev |
| `npm run dev:all` | Next + SFU |
| `npm run dev:classroom` | classroom-api dev |
| `npm run dev:full` | Next + SFU + classroom-api |
| `npm run build` | Next production build |
| `npm run build:server` | SFU build |
| `npm run build:classroom` | classroom-api build |

---

## 8. Further reading

- MediaSoup / SFU details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (if present) and [classroom-api/docs/ARCHITECTURE.md](classroom-api/docs/ARCHITECTURE.md) for live classes.

## License

MIT
