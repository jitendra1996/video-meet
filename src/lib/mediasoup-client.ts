/**
 * MediaSoup Client - WebRTC SFU Client
 *
 * Handles all WebRTC operations: device setup, transports, producers, consumers.
 * Works in conjunction with Socket.io for signaling.
 *
 * @see https://mediasoup.org/documentation/v3/communication-between-client-and-server
 */

import * as mediasoupClient from "mediasoup-client";
import type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
  RtpParameters,
  DtlsParameters,
  IceCandidate,
  IceParameters,
} from "mediasoup-client/types";
import type { Socket } from "socket.io-client";

/** Signaling event names - must match server */
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

export const SERVER_EVENTS = {
  ROOM_JOINED: "room-joined",
  ROOM_STATE: "room-state",
  NEW_PARTICIPANT: "new-participant",
  PARTICIPANT_LEFT: "participant-left",
  TRANSPORT_CREATED: "transport-created",
  PRODUCER_CREATED: "producer-created",
  PRODUCER_CLOSED: "producer-closed",
  CONSUMER_CREATED: "consumer-created",
  CHAT_MESSAGE: "chat-message",
  REACTION: "reaction",
  ERROR: "error",
} as const;

/** Remote participant with their streams */
export interface RemoteParticipant {
  id: string;
  displayName: string;
  consumers: Map<string, Consumer>;
  /** Video stream for rendering (use with video srcObject) */
  videoStream: MediaStream | null;
  /** Audio stream (handled separately for volume control) */
  audioStream: MediaStream | null;
}

/** Room state from server */
export interface RoomState {
  roomId: string;
  participants: Array<{
    id: string;
    displayName: string;
    producers: Array<{ id: string; kind: "audio" | "video" }>;
  }>;
}

/** Join response from server */
export interface JoinResponse {
  participantId: string;
  rtpCapabilities: RtpCapabilities;
  roomState: RoomState;
}

/**
 * MediaSoup client for joining rooms and managing WebRTC streams.
 */
export class MediaSoupRoomClient {
  private device: mediasoupClient.Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private remoteParticipants = new Map<string, RemoteParticipant>();
  private _participantId = "";

  constructor(
    private socket: Socket,
    private roomId: string,
    participantId: string,
    private displayName: string
  ) {
    this._participantId = participantId;
  }

  get participantId(): string {
    return this._participantId;
  }

  /**
   * Join the room and initialize the device with server RTP capabilities.
   * Returns join response including participantId from server.
   */
  async join(): Promise<JoinResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        CLIENT_EVENTS.JOIN_ROOM,
        { roomId: this.roomId, displayName: this.displayName },
        (response: JoinResponse & { error?: string }) => {
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }
          if (!response?.rtpCapabilities || !response?.roomState) {
            reject(new Error("Invalid server response"));
            return;
          }

          this._participantId = response.participantId;

          this.initDevice(response.rtpCapabilities)
            .then(() => this.syncRoomState(response.roomState!))
            .then(() => resolve(response))
            .catch(reject);
        }
      );
    });
  }

  /**
   * Initialize MediaSoup device with server RTP capabilities.
   */
  private async initDevice(rtpCapabilities: RtpCapabilities): Promise<void> {
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
  }

  /**
   * Sync local state with room state (existing participants and producers).
   */
  private async syncRoomState(roomState: RoomState): Promise<void> {
    const consumePromises: Promise<void>[] = [];

    for (const p of roomState.participants) {
      if (p.id === this._participantId) continue;

      if (!this.remoteParticipants.has(p.id)) {
        this.remoteParticipants.set(p.id, {
          id: p.id,
          displayName: p.displayName,
          consumers: new Map(),
          videoStream: null,
          audioStream: null,
        });
      }

      const remote = this.remoteParticipants.get(p.id)!;
      for (const prod of p.producers) {
        if (!remote.consumers.has(prod.id)) {
          consumePromises.push(this.consumeProducer(p.id, prod.id, prod.kind));
        }
      }
    }

    await Promise.all(consumePromises);
  }

  /**
   * Create send transport and produce local media.
   */
  async sendMedia(stream: MediaStream): Promise<void> {
    if (!this.device) throw new Error("Device not initialized");

    const sendTransport = await this.createTransport("send");
    this.sendTransport = sendTransport;

    for (const track of stream.getTracks()) {
      const producer = await sendTransport.produce({
        track,
        codecOptions: track.kind === "video" ? { videoGoogleStartBitrate: 1000 } : undefined,
      });
      this.producers.set(producer.id, producer);
    }
  }

  /**
   * Produce a single track on the existing send transport.
   * Used when re-enabling video or audio after toggling off.
   * @throws Error if track.readyState is 'ended'
   */
  async produceTrack(track: MediaStreamTrack): Promise<void> {
    if (!this.sendTransport) throw new Error("No send transport");
    if (track.readyState === "ended") {
      throw new Error(`Cannot produce ${track.kind} track: track has ended`);
    }
    const producer = await this.sendTransport.produce({
      track,
      codecOptions: track.kind === "video" ? { videoGoogleStartBitrate: 1000 } : undefined,
    });
    this.producers.set(producer.id, producer);
  }

  /**
   * Create a WebRTC transport (send or recv).
   */
  private createTransport(direction: "send" | "recv"): Promise<Transport> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        CLIENT_EVENTS.CREATE_TRANSPORT,
        {
          roomId: this.roomId,
          participantId: this._participantId,
          direction,
        },
        async (response: {
          error?: string;
          id?: string;
          iceParameters?: IceParameters;
          iceCandidates?: IceCandidate[];
          dtlsParameters?: DtlsParameters;
        }) => {
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }

          const transport =
            direction === "send"
              ? this.device!.createSendTransport({
                  id: response.id!,
                  iceParameters: response.iceParameters!,
                  iceCandidates: response.iceCandidates!,
                  dtlsParameters: response.dtlsParameters!,
                })
              : this.device!.createRecvTransport({
                  id: response.id!,
                  iceParameters: response.iceParameters!,
                  iceCandidates: response.iceCandidates!,
                  dtlsParameters: response.dtlsParameters!,
                });

          transport.on(
            "connect",
            async ({ dtlsParameters }, callback, errback) => {
              this.socket.emit(
                CLIENT_EVENTS.CONNECT_TRANSPORT,
                {
                  roomId: this.roomId,
                  participantId: this._participantId,
                  transportId: transport.id,
                  dtlsParameters,
                },
                (res: { error?: string }) => {
                  if (res?.error) errback(new Error(res.error));
                  else callback();
                }
              );
            }
          );

          if (direction === "send") {
            transport.on(
              "produce",
              ({ kind, rtpParameters }, callback, errback) => {
                this.socket.emit(
                  CLIENT_EVENTS.PRODUCE,
                  {
                    roomId: this.roomId,
                    participantId: this._participantId,
                    kind,
                    rtpParameters,
                  },
                  (res: { error?: string; producerId?: string }) => {
                    if (res?.error) errback(new Error(res.error));
                    else callback({ id: res.producerId! });
                  }
                );
              }
            );
          }

          transport.on("connectionstatechange", (state) => {
            if (state === "failed" || state === "disconnected") {
              console.warn(`[MediaSoup] Transport ${direction} state:`, state);
            }
          });

          resolve(transport);
        }
      );
    });
  }

  /**
   * Consume a remote producer's stream.
   */
  private async consumeProducer(
    remoteParticipantId: string,
    producerId: string,
    kind: "audio" | "video"
  ): Promise<void> {
    const device = this.device;
    if (!device) return;

    let remote = this.remoteParticipants.get(remoteParticipantId);
    if (!remote) {
      remote = {
        id: remoteParticipantId,
        displayName: "Unknown",
        consumers: new Map(),
        videoStream: null,
        audioStream: null,
      };
      this.remoteParticipants.set(remoteParticipantId, remote);
    }

    if (!this.recvTransport) {
      this.recvTransport = await this.createTransport("recv");
    }

    return new Promise((resolve, reject) => {
      this.socket.emit(
        CLIENT_EVENTS.CONSUME,
        {
          roomId: this.roomId,
          participantId: this._participantId,
          producerId,
          rtpCapabilities: device.rtpCapabilities,
        },
        async (response: {
          error?: string;
          consumerId?: string;
          producerId?: string;
          kind?: "audio" | "video";
          rtpParameters?: RtpParameters;
        }) => {
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            const consumer = await this.recvTransport!.consume({
              id: response.consumerId!,
              producerId: response.producerId!,
              kind: response.kind!,
              rtpParameters: response.rtpParameters!,
            });

            this.consumers.set(consumer.id, consumer);
            remote!.consumers.set(producerId, consumer);

            const { track } = consumer;
            const stream = new MediaStream([track]);
            if (kind === "video") {
              remote!.videoStream = stream;
            } else {
              remote!.audioStream = stream;
            }

            resolve();
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Handle new participant from server.
   */
  onNewParticipant(
    handler: (participant: {
      id: string;
      displayName: string;
      producers: Array<{ id: string; kind: "audio" | "video" }>;
    }) => void
  ): void {
    this.socket.on(SERVER_EVENTS.NEW_PARTICIPANT, handler);
  }

  /**
   * Handle new producer from existing participant.
   */
  onProducerCreated(
    handler: (data: {
      participantId: string;
      producer: { id: string; kind: "audio" | "video" };
    }) => void
  ): void {
    this.socket.on(SERVER_EVENTS.PRODUCER_CREATED, handler);
  }

  /**
   * Handle participant left.
   */
  onParticipantLeft(handler: (data: { participantId: string }) => void): void {
    this.socket.on(SERVER_EVENTS.PARTICIPANT_LEFT, handler);
  }

  /**
   * Handle producer closed (e.g. screen share stopped).
   */
  onProducerClosed(
    handler: (data: { participantId: string; producerId: string }) => void
  ): void {
    this.socket.on(SERVER_EVENTS.PRODUCER_CLOSED, handler);
  }

  /**
   * Handle chat message.
   */
  onChatMessage(
    handler: (data: {
      participantId: string;
      displayName: string;
      message: string;
      timestamp: number;
    }) => void
  ): void {
    this.socket.on(SERVER_EVENTS.CHAT_MESSAGE, handler);
  }

  /**
   * Handle reaction.
   */
  onReaction(
    handler: (data: {
      participantId: string;
      displayName: string;
      reaction: string;
      timestamp: number;
    }) => void
  ): void {
    this.socket.on(SERVER_EVENTS.REACTION, handler);
  }

  /**
   * Close a producer (notify server and close locally).
   */
  async closeProducer(producerId: string): Promise<void> {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
      this.socket.emit(CLIENT_EVENTS.CLOSE_PRODUCER, {
        roomId: this.roomId,
        participantId: this._participantId,
        producerId,
      });
    }
  }

  /**
   * Send chat message.
   */
  sendChatMessage(message: string): void {
    this.socket.emit(CLIENT_EVENTS.CHAT_MESSAGE, {
      roomId: this.roomId,
      participantId: this._participantId,
      displayName: this.displayName,
      message,
    });
  }

  /**
   * Send reaction.
   */
  sendReaction(reaction: string): void {
    this.socket.emit(CLIENT_EVENTS.REACTION, {
      roomId: this.roomId,
      participantId: this._participantId,
      displayName: this.displayName,
      reaction,
    });
  }

  /**
   * Get video producer ID (for screen share replacement).
   */
  getVideoProducerId(): string | null {
    for (const [id, p] of this.producers) {
      if (p.kind === "video") return id;
    }
    return null;
  }

  /**
   * Get all producer IDs by kind.
   */
  getProducerIds(): { video?: string; audio?: string } {
    const result: { video?: string; audio?: string } = {};
    for (const [id, p] of this.producers) {
      if (p.kind === "video") result.video = id;
      if (p.kind === "audio") result.audio = id;
    }
    return result;
  }

  /**
   * Get all remote participants.
   * Returns new object refs so React detects stream updates.
   */
  getRemoteParticipants(): RemoteParticipant[] {
    return Array.from(this.remoteParticipants.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      consumers: p.consumers,
      videoStream: p.videoStream,
      audioStream: p.audioStream,
    }));
  }

  /**
   * Add remote participant (from NEW_PARTICIPANT event).
   */
  addRemoteParticipant(
    id: string,
    displayName: string,
    producers: Array<{ id: string; kind: "audio" | "video" }> = []
  ): void {
    const remote: RemoteParticipant = {
      id,
      displayName,
      consumers: new Map(),
      videoStream: null,
      audioStream: null,
    };
    this.remoteParticipants.set(id, remote);

    for (const p of producers) {
      this.consumeProducer(id, p.id, p.kind).catch(console.error);
    }
  }

  /**
   * Create consumer for new producer (from PRODUCER_CREATED event).
   * Calls onUpdate when done so UI can refresh.
   */
  handleNewProducer(
    participantId: string,
    producerId: string,
    kind: "audio" | "video",
    onUpdate?: () => void
  ): void {
    this.consumeProducer(participantId, producerId, kind)
      .then(() => onUpdate?.())
      .catch(console.error);
  }

  /**
   * Handle producer closed - remove consumer and update remote participant streams.
   */
  handleProducerClosed(
    participantId: string,
    producerId: string,
    onUpdate?: () => void
  ): void {
    const remote = this.remoteParticipants.get(participantId);
    if (remote) {
      const consumer = remote.consumers.get(producerId);
      if (consumer) {
        consumer.close();
        remote.consumers.delete(producerId);
        this.consumers.delete(consumer.id);
        if (remote.videoStream && consumer.kind === "video") {
          remote.videoStream = null;
        } else if (remote.audioStream && consumer.kind === "audio") {
          remote.audioStream = null;
        }
      }
      onUpdate?.();
    }
  }

  /**
   * Remove remote participant.
   */
  removeRemoteParticipant(participantId: string): void {
    const remote = this.remoteParticipants.get(participantId);
    if (remote) {
      for (const consumer of remote.consumers.values()) {
        consumer.close();
        this.consumers.delete(consumer.id);
      }
      this.remoteParticipants.delete(participantId);
    }
  }

  /**
   * Leave the room and cleanup.
   */
  leave(): void {
    this.socket.emit(CLIENT_EVENTS.LEAVE_ROOM);

    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;

    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();

    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

    this.remoteParticipants.clear();
  }
}
