/**
 * Thin wrapper around @100mslive/server-sdk.
 * All 100ms credentials stay on the server — clients only receive short-lived auth tokens.
 */
export declare class HmsService {
    private readonly client;
    constructor();
    createRoom(params: {
        name: string;
        description?: string;
        recordingEnabled: boolean;
    }): Promise<{
        id: string;
    }>;
    /**
     * Auth token for React / mobile SDKs. Scoped to room + role + user.
     */
    getAuthToken(params: {
        roomId: string;
        role: string;
        userId: string;
    }): Promise<string>;
    /**
     * Best-effort: start cloud recording for the active room session.
     * Exact REST path may vary by 100ms API version — adjust using official docs if this returns 404.
     */
    startRecording(roomId: string): Promise<void>;
    /**
     * Remove a peer from an active session (teacher moderation).
     */
    removePeer(roomId: string, peerId: string): Promise<void>;
}
//# sourceMappingURL=hms.service.d.ts.map