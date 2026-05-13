/**
 * Socket.io Signaling Handlers
 *
 * Handles all WebRTC signaling between clients and the SFU server.
 * Implements the signaling protocol for MediaSoup.
 */
import type { Server } from "socket.io";
import type { RoomManager } from "./RoomManager.js";
/** Client-to-server event names */
export declare const CLIENT_EVENTS: {
    readonly JOIN_ROOM: "join-room";
    readonly CREATE_TRANSPORT: "create-transport";
    readonly CONNECT_TRANSPORT: "connect-transport";
    readonly PRODUCE: "produce";
    readonly CONSUME: "consume";
    readonly CLOSE_PRODUCER: "close-producer";
    readonly LEAVE_ROOM: "leave-room";
    readonly GET_ROOM_STATE: "get-room-state";
    readonly CHAT_MESSAGE: "chat-message";
    readonly PRIVATE_CHAT: "private-chat";
    readonly REACTION: "reaction";
    readonly SCREEN_SHARE: "screen-share";
};
/** Server-to-client event names */
export declare const SERVER_EVENTS: {
    readonly ROOM_JOINED: "room-joined";
    readonly ROOM_STATE: "room-state";
    readonly NEW_PARTICIPANT: "new-participant";
    readonly PARTICIPANT_LEFT: "participant-left";
    readonly TRANSPORT_CREATED: "transport-created";
    readonly TRANSPORT_CONNECTED: "transport-connected";
    readonly PRODUCER_CREATED: "producer-created";
    readonly PRODUCER_CLOSED: "producer-closed";
    readonly CONSUMER_CREATED: "consumer-created";
    readonly CHAT_MESSAGE: "chat-message";
    readonly PRIVATE_CHAT: "private-chat";
    readonly REACTION: "reaction";
    readonly SCREEN_SHARE: "screen-share";
    readonly ERROR: "error";
};
/**
 * Register all signaling handlers.
 */
export declare function registerSignalingHandlers(io: Server, roomManager: RoomManager): void;
//# sourceMappingURL=signaling.d.ts.map