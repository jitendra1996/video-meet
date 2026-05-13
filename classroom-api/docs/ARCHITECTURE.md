# Classroom API — architecture

## Overview

The `classroom-api` service is a Node.js (Express + TypeScript) application that orchestrates **live online classes** with:

- **100ms** for real-time media (rooms and auth tokens are created server-side only).
- **MongoDB** for durable data (users, classes, chat, attendance, recordings metadata, notifications).
- **Socket.IO** for low-latency chat, typing hints, attendance pings, raise-hand signals, and teacher “mute all” broadcasts.
- **Optional Redis** via `@socket.io/redis-adapter` so multiple API instances share room presence (horizontal scaling).

The legacy **MediaSoup SFU** in `/server` remains available for peer mesh/SFU meetings from the home page; it is separate from this stack.

## Layers

| Layer | Responsibility |
|--------|----------------|
| `modules/*` | Domain models, repositories, services, controllers, routes |
| `integrations/*` | 100ms SDK, S3 signed URLs |
| `infrastructure/*` | Mongo connection, Socket.IO registration, Redis adapter |
| `common/*` | JWT, validation, errors, logging, middleware |
| `webhooks/*` | 100ms webhook ingestion (recording URLs / S3 keys) |

## Security notes

- JWTs are issued only by `classroom-api`; the browser never sees 100ms app secrets.
- 100ms **auth tokens** are short-lived and scoped to room + role + user id.
- Use **helmet**, **rate limiting**, **CORS**, **Zod** validation, and **sanitize-html** on chat bodies.
- Configure **HMS_WEBHOOK_SECRET** and verify signatures before trusting webhook payloads.
- Serve recordings from **private S3** and expose **signed GET URLs** only after authorization checks.

## Scaling

- Run multiple stateless `classroom-api` processes behind a load balancer with **sticky sessions** optional for Socket.IO (or enable Redis adapter and use websocket upgrade consistently).
- MongoDB replica set for HA; index fields as defined in Mongoose schemas.
- 100ms handles media scale-out; your API scales for signaling, chat, and REST.

## Environment

See `classroom-api/.env.example`. Critical variables: `MONGODB_URI`, `JWT_SECRET`, `HMS_*`, optional `REDIS_URL` and `AWS_*` for recordings.
