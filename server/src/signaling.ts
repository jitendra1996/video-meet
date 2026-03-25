/**
 * Socket.io Signaling Handlers
 *
 * Handles all WebRTC signaling between clients and the SFU server.
 * Implements the signaling protocol for MediaSoup.
 */

import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import type {
  RtpCapabilities,
  RtpParameters,
  DtlsParameters,
} from "mediasoup/types";
import type { RoomManager } from "./RoomManager.js";

/** Client-to-server event names */
export const CLIENT_EVENTS = {
  JOIN_ROOM: "join-room",
  CREATE_TRANSPORT: "create-transport",
  CONNECT_TRANSPORT: "connect-transport",
  PRODUCE: "produce",
  CONSUME: "consume",
  CLOSE_PRODUCER: "close-producer",
  LEAVE_ROOM: "leave-room",
  GET_ROOM_STATE: "get-room-state",
  CHAT_MESSAGE: "chat-message",
  REACTION: "reaction",
} as const;

/** Server-to-client event names */
export const SERVER_EVENTS = {
  ROOM_JOINED: "room-joined",
  ROOM_STATE: "room-state",
  NEW_PARTICIPANT: "new-participant",
  PARTICIPANT_LEFT: "participant-left",
  TRANSPORT_CREATED: "transport-created",
  TRANSPORT_CONNECTED: "transport-connected",
  PRODUCER_CREATED: "producer-created",
  PRODUCER_CLOSED: "producer-closed",
  CONSUMER_CREATED: "consumer-created",
  CHAT_MESSAGE: "chat-message",
  REACTION: "reaction",
  ERROR: "error",
} as const;

/** Join room payload */
interface JoinRoomPayload {
  roomId: string;
  displayName: string;
}

/** Create transport payload */
interface CreateTransportPayload {
  roomId: string;
  participantId: string;
  direction: "send" | "recv";
}

/** Connect transport payload */
interface ConnectTransportPayload {
  roomId: string;
  participantId: string;
  transportId: string;
  dtlsParameters: DtlsParameters;
}

/** Produce payload */
interface ProducePayload {
  roomId: string;
  participantId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
}

/** Consume payload */
interface ConsumePayload {
  roomId: string;
  participantId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}

/**
 * Emit error to client.
 */
function emitError(socket: Socket, message: string, code?: string): void {
  socket.emit(SERVER_EVENTS.ERROR, { message, code });
}

/**
 * Register all signaling handlers.
 */
export function registerSignalingHandlers(
  io: Server,
  roomManager: RoomManager
): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[Signaling] Client connected: ${socket.id}`);

    /**
     * Join a room - creates room if needed, adds participant.
     */
    socket.on(
      CLIENT_EVENTS.JOIN_ROOM,
      async (payload: JoinRoomPayload, callback?: (res: unknown) => void) => {
        try {
          const { roomId, displayName } = payload;
          if (!roomId || !displayName) {
            emitError(socket, "roomId and displayName required");
            callback?.({ error: "Invalid payload" });
            return;
          }

          const room = await roomManager.getOrCreateRoom(roomId);
          const participantId = randomUUID();

          const participant = room.addParticipant(
            participantId,
            socket.id,
            displayName
          );

          const rtpCapabilities = room.getRtpCapabilities();
          const roomState = room.getState();

          // Join Socket.io room for broadcasting
          await socket.join(roomId);

          // Store participant info in socket for later use
          socket.data = {
            ...socket.data,
            roomId,
            participantId,
            participant,
          };

          // Notify the joining client
          socket.emit(SERVER_EVENTS.ROOM_JOINED, {
            participantId,
            rtpCapabilities,
            roomState,
          });

          // Notify others in the room (flat structure for client compatibility)
          socket.to(roomId).emit(SERVER_EVENTS.NEW_PARTICIPANT, {
            id: participantId,
            displayName,
            producers: [],
          });

          callback?.({ participantId, rtpCapabilities, roomState });
        } catch (err) {
          console.error("[Signaling] Join room error:", err);
          emitError(socket, (err as Error).message);
          callback?.({ error: (err as Error).message });
        }
      }
    );

    /**
     * Create a WebRTC transport (send or recv).
     */
    socket.on(
      CLIENT_EVENTS.CREATE_TRANSPORT,
      async (payload: CreateTransportPayload, callback?: (res: unknown) => void) => {
        try {
          const { roomId, participantId, direction } = payload;
          const room = roomManager.getRoom(roomId);

          if (!room) {
            emitError(socket, "Room not found");
            callback?.({ error: "Room not found" });
            return;
          }

          const transport =
            direction === "send"
              ? await room.createSendTransport(participantId)
              : await room.createRecvTransport(participantId);

          callback?.({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });
        } catch (err) {
          console.error("[Signaling] Create transport error:", err);
          emitError(socket, (err as Error).message);
          callback?.({ error: (err as Error).message });
        }
      }
    );

    /**
     * Connect a transport with DTLS parameters.
     */
    socket.on(
      CLIENT_EVENTS.CONNECT_TRANSPORT,
      async (payload: ConnectTransportPayload, callback?: (res: unknown) => void) => {
        try {
          const { roomId, participantId, transportId, dtlsParameters } = payload;
          const room = roomManager.getRoom(roomId);
          const participant = room?.getParticipant(participantId);

          if (!participant) {
            emitError(socket, "Participant not found");
            callback?.({ error: "Participant not found" });
            return;
          }

          const transport =
            participant.transports.send?.id === transportId
              ? participant.transports.send
              : participant.transports.recv;

          if (!transport) {
            emitError(socket, "Transport not found");
            callback?.({ error: "Transport not found" });
            return;
          }

          await transport.connect({ dtlsParameters });
          callback?.({ success: true });
        } catch (err) {
          console.error("[Signaling] Connect transport error:", err);
          emitError(socket, (err as Error).message);
          callback?.({ error: (err as Error).message });
        }
      }
    );

    /**
     * Produce (publish) audio/video stream.
     */
    socket.on(
      CLIENT_EVENTS.PRODUCE,
      async (payload: ProducePayload, callback?: (res: unknown) => void) => {
        try {
          const { roomId, participantId, kind, rtpParameters } = payload;
          const room = roomManager.getRoom(roomId);

          if (!room) {
            emitError(socket, "Room not found");
            callback?.({ error: "Room not found" });
            return;
          }

          const producer = await room.createProducer(
            participantId,
            kind,
            rtpParameters
          );

          // Notify others about new producer
          socket.to(roomId).emit(SERVER_EVENTS.PRODUCER_CREATED, {
            participantId,
            producer: { id: producer.id, kind },
          });

          callback?.({ producerId: producer.id });
        } catch (err) {
          console.error("[Signaling] Produce error:", err);
          emitError(socket, (err as Error).message);
          callback?.({ error: (err as Error).message });
        }
      }
    );

    /**
     * Close a producer (e.g. when stopping screen share).
     */
    socket.on(
      CLIENT_EVENTS.CLOSE_PRODUCER,
      async (
        payload: { roomId: string; participantId: string; producerId: string },
        callback?: (res: unknown) => void
      ) => {
        try {
          const { roomId, participantId, producerId } = payload;
          const room = roomManager.getRoom(roomId);
          const participant = room?.getParticipant(participantId);

          if (!participant) {
            callback?.({ error: "Participant not found" });
            return;
          }

          const producer = participant.producers.get(producerId);
          if (producer) {
            producer.close();
            participant.producers.delete(producerId);
            socket.to(roomId).emit(SERVER_EVENTS.PRODUCER_CLOSED, {
              participantId,
              producerId,
            });
          }
          callback?.({ success: true });
        } catch (err) {
          console.error("[Signaling] Close producer error:", err);
          callback?.({ error: (err as Error).message });
        }
      }
    );

    /**
     * Chat message - broadcast to room.
     */
    socket.on(
      CLIENT_EVENTS.CHAT_MESSAGE,
      (payload: {
        roomId: string;
        participantId: string;
        displayName: string;
        message: string;
      }) => {
        const { roomId, participantId, displayName, message } = payload;
        io.to(roomId).emit(SERVER_EVENTS.CHAT_MESSAGE, {
          participantId,
          displayName,
          message,
          timestamp: Date.now(),
        });
      }
    );

    /**
     * Reaction - broadcast to room (hand raise, emoji, etc.).
     */
    socket.on(
      CLIENT_EVENTS.REACTION,
      (payload: {
        roomId: string;
        participantId: string;
        displayName: string;
        reaction: string;
      }) => {
        const { roomId, participantId, displayName, reaction } = payload;
        io.to(roomId).emit(SERVER_EVENTS.REACTION, {
          participantId,
          displayName,
          reaction,
          timestamp: Date.now(),
        });
      }
    );

    /**
     * Consume (subscribe to) another participant's stream.
     */
    socket.on(
      CLIENT_EVENTS.CONSUME,
      async (payload: ConsumePayload, callback?: (res: unknown) => void) => {
        try {
          const { roomId, participantId, producerId, rtpCapabilities } = payload;
          const room = roomManager.getRoom(roomId);

          if (!room) {
            emitError(socket, "Room not found");
            callback?.({ error: "Room not found" });
            return;
          }

          const consumer = await room.createConsumer(
            participantId,
            producerId,
            rtpCapabilities
          );

          callback?.({
            consumerId: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
        } catch (err) {
          console.error("[Signaling] Consume error:", err);
          emitError(socket, (err as Error).message);
          callback?.({ error: (err as Error).message });
        }
      }
    );

    /**
     * Leave the room.
     */
    socket.on(CLIENT_EVENTS.LEAVE_ROOM, async () => {
      const { roomId, participantId } = socket.data;

      if (roomId && participantId) {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.removeParticipant(participantId);
          socket.leave(roomId);

          socket.to(roomId).emit(SERVER_EVENTS.PARTICIPANT_LEFT, {
            participantId,
          });

          await roomManager.cleanupRoom(roomId);
        }
      }
    });

    /**
     * Get current room state.
     */
    socket.on(
      CLIENT_EVENTS.GET_ROOM_STATE,
      async (roomId: string, callback?: (res: unknown) => void) => {
        const room = roomManager.getRoom(roomId);
        callback?.(room ? room.getState() : null);
      }
    );

    /**
     * Handle disconnect - leave room and cleanup.
     */
    socket.on("disconnect", async () => {
      const { roomId, participantId } = socket.data;

      if (roomId && participantId) {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.removeParticipant(participantId);
          socket.to(roomId).emit(SERVER_EVENTS.PARTICIPANT_LEFT, {
            participantId,
          });
          await roomManager.cleanupRoom(roomId);
        }
      }

      console.log(`[Signaling] Client disconnected: ${socket.id}`);
    });
  });
}
