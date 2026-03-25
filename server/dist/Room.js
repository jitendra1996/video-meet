"use strict";
/**
 * MediaSoup Room
 *
 * Represents a single video conference room.
 * Each room has one MediaSoup Router (SFU) that forwards media between participants.
 * Supports 100+ participants per room with proper worker distribution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const config_js_1 = require("./config.js");
class Room {
    roomId;
    router;
    participants = new Map();
    constructor(roomId, router) {
        this.roomId = roomId;
        this.router = router;
    }
    /**
     * Add a new participant to the room.
     */
    addParticipant(participantId, socketId, displayName) {
        const participant = {
            id: participantId,
            socketId,
            displayName,
            transports: {},
            producers: new Map(),
            consumers: new Map(),
        };
        this.participants.set(participantId, participant);
        return participant;
    }
    /**
     * Remove a participant and cleanup their transports/producers/consumers.
     */
    removeParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant)
            return;
        // Close all transports (cascades to producers/consumers)
        if (participant.transports.send) {
            participant.transports.send.close();
        }
        if (participant.transports.recv) {
            participant.transports.recv.close();
        }
        this.participants.delete(participantId);
    }
    /**
     * Get a participant by ID.
     */
    getParticipant(participantId) {
        return this.participants.get(participantId);
    }
    /**
     * Get all participants except the specified one.
     */
    getOtherParticipants(excludeId) {
        return Array.from(this.participants.values()).filter((p) => p.id !== excludeId);
    }
    /**
     * Get all participants.
     */
    getAllParticipants() {
        return Array.from(this.participants.values());
    }
    /**
     * Get participant count.
     */
    get participantCount() {
        return this.participants.size;
    }
    /**
     * Create a WebRtcTransport for sending media.
     */
    async createSendTransport(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) {
            throw new Error(`Participant ${participantId} not found`);
        }
        const transport = await this.router.createWebRtcTransport(config_js_1.config.webRtcTransport);
        participant.transports.send = transport;
        return transport;
    }
    /**
     * Create a WebRtcTransport for receiving media.
     */
    async createRecvTransport(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) {
            throw new Error(`Participant ${participantId} not found`);
        }
        const transport = await this.router.createWebRtcTransport(config_js_1.config.webRtcTransport);
        participant.transports.recv = transport;
        return transport;
    }
    /**
     * Get router RTP capabilities for client device initialization.
     */
    getRtpCapabilities() {
        return this.router.rtpCapabilities;
    }
    /**
     * Create a producer (user's audio/video stream).
     */
    async createProducer(participantId, kind, rtpParameters) {
        const participant = this.participants.get(participantId);
        if (!participant?.transports.send) {
            throw new Error(`Participant ${participantId} has no send transport`);
        }
        const producer = await participant.transports.send.produce({
            kind,
            rtpParameters,
        });
        participant.producers.set(producer.id, producer);
        return producer;
    }
    /**
     * Create a consumer (receiving another participant's stream).
     */
    async createConsumer(consumerParticipantId, producerId, rtpCapabilities) {
        const consumerParticipant = this.participants.get(consumerParticipantId);
        if (!consumerParticipant?.transports.recv) {
            throw new Error(`Participant ${consumerParticipantId} has no recv transport`);
        }
        const producer = this.findProducer(producerId);
        if (!producer) {
            throw new Error(`Producer ${producerId} not found`);
        }
        if (!this.router.canConsume({
            producerId: producer.id,
            rtpCapabilities,
        })) {
            throw new Error("Client cannot consume this producer");
        }
        const consumer = await consumerParticipant.transports.recv.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: false,
        });
        consumerParticipant.consumers.set(consumer.id, consumer);
        return consumer;
    }
    /**
     * Find a producer by ID across all participants.
     */
    findProducer(producerId) {
        for (const participant of this.participants.values()) {
            const producer = participant.producers.get(producerId);
            if (producer)
                return producer;
        }
        return undefined;
    }
    /**
     * Get room state for client sync (participants and their producers).
     */
    getState() {
        return {
            roomId: this.roomId,
            participants: this.getAllParticipants().map((p) => ({
                id: p.id,
                displayName: p.displayName,
                producers: Array.from(p.producers.values()).map((pr) => ({
                    id: pr.id,
                    kind: pr.kind,
                })),
            })),
        };
    }
    /**
     * Check if room is empty (can be garbage collected).
     */
    get isEmpty() {
        return this.participants.size === 0;
    }
}
exports.Room = Room;
