/**
 * MediaSoup Room
 *
 * Represents a single video conference room.
 * Each room has one MediaSoup Router (SFU) that forwards media between participants.
 * Supports 100+ participants per room with proper worker distribution.
 */
import type { Router, WebRtcTransport, Producer, Consumer, RtpCapabilities, RtpParameters } from "mediasoup/types";
/** Participant in a room */
export interface Participant {
    id: string;
    socketId: string;
    displayName: string;
    /** True while this client reports they are presenting their screen. */
    screenSharing: boolean;
    transports: {
        send?: WebRtcTransport;
        recv?: WebRtcTransport;
    };
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}
/** Room state */
export interface RoomState {
    roomId: string;
    participants: Array<{
        id: string;
        displayName: string;
        screenSharing: boolean;
        producers: Array<{
            id: string;
            kind: "audio" | "video";
        }>;
    }>;
}
export declare class Room {
    readonly roomId: string;
    readonly router: Router;
    private participants;
    constructor(roomId: string, router: Router);
    /**
     * Add a new participant to the room.
     */
    addParticipant(participantId: string, socketId: string, displayName: string): Participant;
    /**
     * Remove a participant and cleanup their transports/producers/consumers.
     */
    removeParticipant(participantId: string): void;
    /**
     * Get a participant by ID.
     */
    getParticipant(participantId: string): Participant | undefined;
    /**
     * Get all participants except the specified one.
     */
    getOtherParticipants(excludeId: string): Participant[];
    /**
     * Get all participants.
     */
    getAllParticipants(): Participant[];
    /**
     * Get participant count.
     */
    get participantCount(): number;
    /**
     * Create a WebRtcTransport for sending media.
     */
    createSendTransport(participantId: string): Promise<WebRtcTransport>;
    /**
     * Create a WebRtcTransport for receiving media.
     */
    createRecvTransport(participantId: string): Promise<WebRtcTransport>;
    /**
     * Get router RTP capabilities for client device initialization.
     */
    getRtpCapabilities(): RtpCapabilities;
    /**
     * Create a producer (user's audio/video stream).
     */
    createProducer(participantId: string, kind: "audio" | "video", rtpParameters: RtpParameters): Promise<Producer>;
    /**
     * Create a consumer (receiving another participant's stream).
     */
    createConsumer(consumerParticipantId: string, producerId: string, rtpCapabilities: RtpCapabilities): Promise<Consumer>;
    /**
     * Find a producer by ID across all participants.
     */
    private findProducer;
    /**
     * Get room state for client sync (participants and their producers).
     */
    getState(): RoomState;
    /**
     * Check if room is empty (can be garbage collected).
     */
    get isEmpty(): boolean;
}
//# sourceMappingURL=Room.d.ts.map