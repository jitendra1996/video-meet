/**
 * Server Configuration
 *
 * Centralized configuration for the MediaSoup SFU server.
 * Tuned for high-scale deployments (1000+ concurrent users).
 *
 * @see https://mediasoup.org/documentation/v3/scalability
 */
import type { RouterRtpCodecCapability } from "mediasoup/types";
/**
 * Media codecs supported by the SFU.
 * VP8/VP9 for video, Opus for audio - all widely supported in browsers.
 * preferredPayloadType is optional for RouterOptions.
 */
export declare const MEDIA_CODECS: RouterRtpCodecCapability[];
/**
 * Server configuration
 */
export declare const config: {
    /** HTTP server port */
    httpPort: number;
    /** WebSocket/Socket.io path */
    wsPath: string;
    /** Number of MediaSoup workers - use all CPU cores for max throughput */
    numWorkers: number;
    /** WebRTC port range for Worker - must match webRtcTransport listenInfos */
    readonly webRtcPortRange: {
        min: number;
        max: number;
    };
    /** WebRTC transport options - listenInfos format for MediaSoup v3 */
    readonly webRtcTransport: {
        listenInfos: ({
            protocol: "udp";
            ip: string;
            announcedAddress: string | undefined;
            portRange: {
                min: number;
                max: number;
            };
        } | {
            protocol: "tcp";
            ip: string;
            announcedAddress: string | undefined;
            portRange: {
                min: number;
                max: number;
            };
        })[];
        enableUdp: boolean;
        enableTcp: boolean;
        initialAvailableOutgoingBitrate: number;
    };
    /** Router options - one router per room */
    router: {
        /** RTP media codecs */
        mediaCodecs: RouterRtpCodecCapability[];
    };
};
//# sourceMappingURL=config.d.ts.map