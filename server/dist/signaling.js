"use strict";
/**
 * Socket.io Signaling Handlers
 *
 * Handles all WebRTC signaling between clients and the SFU server.
 * Implements the signaling protocol for MediaSoup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_EVENTS = exports.CLIENT_EVENTS = void 0;
exports.registerSignalingHandlers = registerSignalingHandlers;
const node_crypto_1 = require("node:crypto");
/** Client-to-server event names */
exports.CLIENT_EVENTS = {
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
};
/** Server-to-client event names */
exports.SERVER_EVENTS = {
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
};
/**
 * Emit error to client.
 */
function emitError(socket, message, code) {
    socket.emit(exports.SERVER_EVENTS.ERROR, { message, code });
}
/**
 * Register all signaling handlers.
 */
function registerSignalingHandlers(io, roomManager) {
    io.on("connection", (socket) => {
        console.log(`[Signaling] Client connected: ${socket.id}`);
        /**
         * Join a room - creates room if needed, adds participant.
         */
        socket.on(exports.CLIENT_EVENTS.JOIN_ROOM, async (payload, callback) => {
            try {
                const { roomId, displayName } = payload;
                if (!roomId || !displayName) {
                    emitError(socket, "roomId and displayName required");
                    callback?.({ error: "Invalid payload" });
                    return;
                }
                const room = await roomManager.getOrCreateRoom(roomId);
                const participantId = (0, node_crypto_1.randomUUID)();
                const participant = room.addParticipant(participantId, socket.id, displayName);
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
                socket.emit(exports.SERVER_EVENTS.ROOM_JOINED, {
                    participantId,
                    rtpCapabilities,
                    roomState,
                });
                // Notify others in the room (flat structure for client compatibility)
                socket.to(roomId).emit(exports.SERVER_EVENTS.NEW_PARTICIPANT, {
                    id: participantId,
                    displayName,
                    producers: [],
                });
                callback?.({ participantId, rtpCapabilities, roomState });
            }
            catch (err) {
                console.error("[Signaling] Join room error:", err);
                emitError(socket, err.message);
                callback?.({ error: err.message });
            }
        });
        /**
         * Create a WebRTC transport (send or recv).
         */
        socket.on(exports.CLIENT_EVENTS.CREATE_TRANSPORT, async (payload, callback) => {
            try {
                const { roomId, participantId, direction } = payload;
                const room = roomManager.getRoom(roomId);
                if (!room) {
                    emitError(socket, "Room not found");
                    callback?.({ error: "Room not found" });
                    return;
                }
                const transport = direction === "send"
                    ? await room.createSendTransport(participantId)
                    : await room.createRecvTransport(participantId);
                callback?.({
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                });
            }
            catch (err) {
                console.error("[Signaling] Create transport error:", err);
                emitError(socket, err.message);
                callback?.({ error: err.message });
            }
        });
        /**
         * Connect a transport with DTLS parameters.
         */
        socket.on(exports.CLIENT_EVENTS.CONNECT_TRANSPORT, async (payload, callback) => {
            try {
                const { roomId, participantId, transportId, dtlsParameters } = payload;
                const room = roomManager.getRoom(roomId);
                const participant = room?.getParticipant(participantId);
                if (!participant) {
                    emitError(socket, "Participant not found");
                    callback?.({ error: "Participant not found" });
                    return;
                }
                const transport = participant.transports.send?.id === transportId
                    ? participant.transports.send
                    : participant.transports.recv;
                if (!transport) {
                    emitError(socket, "Transport not found");
                    callback?.({ error: "Transport not found" });
                    return;
                }
                await transport.connect({ dtlsParameters });
                callback?.({ success: true });
            }
            catch (err) {
                console.error("[Signaling] Connect transport error:", err);
                emitError(socket, err.message);
                callback?.({ error: err.message });
            }
        });
        /**
         * Produce (publish) audio/video stream.
         */
        socket.on(exports.CLIENT_EVENTS.PRODUCE, async (payload, callback) => {
            try {
                const { roomId, participantId, kind, rtpParameters } = payload;
                const room = roomManager.getRoom(roomId);
                if (!room) {
                    emitError(socket, "Room not found");
                    callback?.({ error: "Room not found" });
                    return;
                }
                const producer = await room.createProducer(participantId, kind, rtpParameters);
                // Notify others about new producer
                socket.to(roomId).emit(exports.SERVER_EVENTS.PRODUCER_CREATED, {
                    participantId,
                    producer: { id: producer.id, kind },
                });
                callback?.({ producerId: producer.id });
            }
            catch (err) {
                console.error("[Signaling] Produce error:", err);
                emitError(socket, err.message);
                callback?.({ error: err.message });
            }
        });
        /**
         * Close a producer (e.g. when stopping screen share).
         */
        socket.on(exports.CLIENT_EVENTS.CLOSE_PRODUCER, async (payload, callback) => {
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
                    socket.to(roomId).emit(exports.SERVER_EVENTS.PRODUCER_CLOSED, {
                        participantId,
                        producerId,
                    });
                }
                callback?.({ success: true });
            }
            catch (err) {
                console.error("[Signaling] Close producer error:", err);
                callback?.({ error: err.message });
            }
        });
        /**
         * Chat message - broadcast to room.
         */
        socket.on(exports.CLIENT_EVENTS.CHAT_MESSAGE, (payload) => {
            const { roomId, participantId, displayName, message } = payload;
            io.to(roomId).emit(exports.SERVER_EVENTS.CHAT_MESSAGE, {
                participantId,
                displayName,
                message,
                timestamp: Date.now(),
            });
        });
        /**
         * Reaction - broadcast to room (hand raise, emoji, etc.).
         */
        socket.on(exports.CLIENT_EVENTS.REACTION, (payload) => {
            const { roomId, participantId, displayName, reaction } = payload;
            io.to(roomId).emit(exports.SERVER_EVENTS.REACTION, {
                participantId,
                displayName,
                reaction,
                timestamp: Date.now(),
            });
        });
        /**
         * Consume (subscribe to) another participant's stream.
         */
        socket.on(exports.CLIENT_EVENTS.CONSUME, async (payload, callback) => {
            try {
                const { roomId, participantId, producerId, rtpCapabilities } = payload;
                const room = roomManager.getRoom(roomId);
                if (!room) {
                    emitError(socket, "Room not found");
                    callback?.({ error: "Room not found" });
                    return;
                }
                const consumer = await room.createConsumer(participantId, producerId, rtpCapabilities);
                callback?.({
                    consumerId: consumer.id,
                    producerId: consumer.producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                });
            }
            catch (err) {
                console.error("[Signaling] Consume error:", err);
                emitError(socket, err.message);
                callback?.({ error: err.message });
            }
        });
        /**
         * Leave the room.
         */
        socket.on(exports.CLIENT_EVENTS.LEAVE_ROOM, async () => {
            const { roomId, participantId } = socket.data;
            if (roomId && participantId) {
                const room = roomManager.getRoom(roomId);
                if (room) {
                    room.removeParticipant(participantId);
                    socket.leave(roomId);
                    socket.to(roomId).emit(exports.SERVER_EVENTS.PARTICIPANT_LEFT, {
                        participantId,
                    });
                    await roomManager.cleanupRoom(roomId);
                }
            }
        });
        /**
         * Get current room state.
         */
        socket.on(exports.CLIENT_EVENTS.GET_ROOM_STATE, async (roomId, callback) => {
            const room = roomManager.getRoom(roomId);
            callback?.(room ? room.getState() : null);
        });
        /**
         * Handle disconnect - leave room and cleanup.
         */
        socket.on("disconnect", async () => {
            const { roomId, participantId } = socket.data;
            if (roomId && participantId) {
                const room = roomManager.getRoom(roomId);
                if (room) {
                    room.removeParticipant(participantId);
                    socket.to(roomId).emit(exports.SERVER_EVENTS.PARTICIPANT_LEFT, {
                        participantId,
                    });
                    await roomManager.cleanupRoom(roomId);
                }
            }
            console.log(`[Signaling] Client disconnected: ${socket.id}`);
        });
    });
}
