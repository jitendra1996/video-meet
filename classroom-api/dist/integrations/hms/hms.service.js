import { SDK } from "@100mslive/server-sdk";
import { env } from "../../config/env.js";
import { logger } from "../../common/logger.js";
import { AppError } from "../../common/errors/AppError.js";
/**
 * Thin wrapper around @100mslive/server-sdk.
 * All 100ms credentials stay on the server — clients only receive short-lived auth tokens.
 */
export class HmsService {
    client;
    constructor() {
        this.client = new SDK(env.HMS_ACCESS_KEY, env.HMS_SECRET);
    }
    async createRoom(params) {
        try {
            const room = await this.client.rooms.create({
                name: params.name,
                description: params.description,
                template_id: env.HMS_TEMPLATE_ID,
                recording_info: params.recordingEnabled ? { enabled: true } : { enabled: false },
            });
            return { id: room.id };
        }
        catch (err) {
            logger.error({ err }, "100ms createRoom failed");
            throw new AppError(502, "Failed to create 100ms room", "HMS_ROOM_CREATE_FAILED");
        }
    }
    /**
     * Auth token for React / mobile SDKs. Scoped to room + role + user.
     */
    async getAuthToken(params) {
        try {
            const { token } = await this.client.auth.getAuthToken({
                roomId: params.roomId,
                role: params.role,
                userId: params.userId,
                validForSeconds: env.HMS_AUTH_TOKEN_TTL_SECONDS,
            });
            return token;
        }
        catch (err) {
            logger.error({ err }, "100ms getAuthToken failed");
            throw new AppError(502, "Failed to issue 100ms token", "HMS_TOKEN_FAILED");
        }
    }
    /**
     * Best-effort: start cloud recording for the active room session.
     * Exact REST path may vary by 100ms API version — adjust using official docs if this returns 404.
     */
    async startRecording(roomId) {
        try {
            await this.client.api.post(`recordings/room/${roomId}/start`, {});
        }
        catch (err) {
            logger.warn({ err, roomId }, "100ms startRecording call failed — verify API path in dashboard docs");
        }
    }
    /**
     * Remove a peer from an active session (teacher moderation).
     */
    async removePeer(roomId, peerId) {
        try {
            await this.client.api.post(`active-rooms/${roomId}/peers/${peerId}/remove`, {});
        }
        catch (err) {
            logger.error({ err, roomId, peerId }, "100ms removePeer failed");
            throw new AppError(502, "Failed to remove participant", "HMS_REMOVE_PEER_FAILED");
        }
    }
}
//# sourceMappingURL=hms.service.js.map