"use strict";
/**
 * Server Configuration
 *
 * Centralized configuration for the MediaSoup SFU server.
 * Tuned for high-scale deployments (1000+ concurrent users).
 *
 * @see https://mediasoup.org/documentation/v3/scalability
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.MEDIA_CODECS = void 0;
const node_os_1 = __importDefault(require("node:os"));
/**
 * Media codecs supported by the SFU.
 * VP8/VP9 for video, Opus for audio - all widely supported in browsers.
 * preferredPayloadType is optional for RouterOptions.
 */
exports.MEDIA_CODECS = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            "x-google-start-bitrate": 1000,
        },
    },
    {
        kind: "video",
        mimeType: "video/VP9",
        clockRate: 90000,
        parameters: {
            "profile-id": 2,
            "x-google-start-bitrate": 1000,
        },
    },
    {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
            "x-google-start-bitrate": 1000,
        },
    },
];
/**
 * Server configuration
 */
exports.config = {
    /** HTTP server port */
    httpPort: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
    /** WebSocket/Socket.io path */
    wsPath: "/socket.io",
    /** Number of MediaSoup workers - use all CPU cores for max throughput */
    numWorkers: Math.min(parseInt(process.env.NUM_WORKERS || "0", 10) || node_os_1.default.cpus().length, 16),
    /** WebRTC port range for Worker - must match webRtcTransport listenInfos */
    get webRtcPortRange() {
        return {
            min: parseInt(process.env.WEBRTC_PORT_MIN || "40000", 10),
            max: parseInt(process.env.WEBRTC_PORT_MAX || "40100", 10),
        };
    },
    /** WebRTC transport options - listenInfos format for MediaSoup v3 */
    get webRtcTransport() {
        const { min: portMin, max: portMax } = this.webRtcPortRange;
        const ip = process.env.LISTEN_IP || "0.0.0.0";
        const announced = process.env.ANNOUNCED_IP;
        return {
            listenInfos: [
                {
                    protocol: "udp",
                    ip,
                    announcedAddress: announced,
                    portRange: { min: portMin, max: portMax },
                },
                {
                    protocol: "tcp",
                    ip,
                    announcedAddress: announced,
                    portRange: { min: portMin, max: portMax },
                },
            ],
            enableUdp: true,
            enableTcp: true,
            initialAvailableOutgoingBitrate: 1_000_000,
        };
    },
    /** Router options - one router per room */
    router: {
        /** RTP media codecs */
        mediaCodecs: exports.MEDIA_CODECS,
    },
};
