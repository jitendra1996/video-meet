/**
 * MediaSoup Room
 *
 * Represents a single video conference room.
 * Each room has one MediaSoup Router (SFU) that forwards media between participants.
 * Supports 100+ participants per room with proper worker distribution.
 */

import type {
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
  RtpParameters,
} from "mediasoup/types";
import { config } from "./config.js";

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
    producers: Array<{ id: string; kind: "audio" | "video" }>;
  }>;
}

export class Room {
  readonly roomId: string;
  readonly router: Router;
  private participants = new Map<string, Participant>();

  constructor(roomId: string, router: Router) {
    this.roomId = roomId;
    this.router = router;
  }

  /**
   * Add a new participant to the room.
   */
  addParticipant(
    participantId: string,
    socketId: string,
    displayName: string
  ): Participant {
    const participant: Participant = {
      id: participantId,
      socketId,
      displayName,
      screenSharing: false,
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
  removeParticipant(participantId: string): void {
    const participant = this.participants.get(participantId);
    if (!participant) return;

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
  getParticipant(participantId: string): Participant | undefined {
    return this.participants.get(participantId);
  }

  /**
   * Get all participants except the specified one.
   */
  getOtherParticipants(excludeId: string): Participant[] {
    return Array.from(this.participants.values()).filter(
      (p) => p.id !== excludeId
    );
  }

  /**
   * Get all participants.
   */
  getAllParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participant count.
   */
  get participantCount(): number {
    return this.participants.size;
  }

  /**
   * Create a WebRtcTransport for sending media.
   */
  async createSendTransport(participantId: string): Promise<WebRtcTransport> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    if (participant.transports.send) {
      participant.transports.send.close();
      participant.transports.send = undefined;
    }

    const transport = await this.router.createWebRtcTransport(
      config.webRtcTransport
    );

    participant.transports.send = transport;
    return transport;
  }

  /**
   * Create a WebRtcTransport for receiving media.
   */
  async createRecvTransport(participantId: string): Promise<WebRtcTransport> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    if (participant.transports.recv) {
      participant.transports.recv.close();
      participant.transports.recv = undefined;
    }

    const transport = await this.router.createWebRtcTransport(
      config.webRtcTransport
    );

    participant.transports.recv = transport;
    return transport;
  }

  /**
   * Get router RTP capabilities for client device initialization.
   */
  getRtpCapabilities(): RtpCapabilities {
    return this.router.rtpCapabilities;
  }

  /**
   * Create a producer (user's audio/video stream).
   */
  async createProducer(
    participantId: string,
    kind: "audio" | "video",
    rtpParameters: RtpParameters
  ): Promise<Producer> {
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
  async createConsumer(
    consumerParticipantId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer> {
    const consumerParticipant = this.participants.get(consumerParticipantId);
    if (!consumerParticipant?.transports.recv) {
      throw new Error(
        `Participant ${consumerParticipantId} has no recv transport`
      );
    }

    const producer = this.findProducer(producerId);
    if (!producer) {
      throw new Error(`Producer ${producerId} not found`);
    }

    if (
      !this.router.canConsume({
        producerId: producer.id,
        rtpCapabilities,
      })
    ) {
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
  private findProducer(producerId: string): Producer | undefined {
    for (const participant of this.participants.values()) {
      const producer = participant.producers.get(producerId);
      if (producer) return producer;
    }
    return undefined;
  }

  /**
   * Get room state for client sync (participants and their producers).
   */
  getState(): RoomState {
    return {
      roomId: this.roomId,
      participants: this.getAllParticipants().map((p) => ({
        id: p.id,
        displayName: p.displayName,
        screenSharing: p.screenSharing,
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
  get isEmpty(): boolean {
    return this.participants.size === 0;
  }
}
