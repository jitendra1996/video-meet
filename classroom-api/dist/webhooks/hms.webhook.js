import { logger } from "../common/logger.js";
import { env } from "../config/env.js";
import { Recording } from "../modules/recording/recording.model.js";
import { LiveClass } from "../modules/live-class/live-class.model.js";
import crypto from "node:crypto";
/**
 * 100ms sends webhooks for session events, recording status, etc.
 * Configure the webhook URL in the 100ms dashboard to point to POST /webhooks/hms
 *
 * Signature verification: if HMS_WEBHOOK_SECRET is set, we expect
 * header `X-100ms-Signature` = HMAC-SHA256(rawBody, secret) in hex (adjust to match dashboard format).
 */
export async function hmsWebhookHandler(req, res) {
    try {
        const raw = req.body;
        if (env.HMS_WEBHOOK_SECRET) {
            const sig = req.headers["x-100ms-signature"];
            if (typeof sig !== "string") {
                res.status(401).json({ ok: false });
                return;
            }
            const expected = crypto
                .createHmac("sha256", env.HMS_WEBHOOK_SECRET)
                .update(raw)
                .digest("hex");
            const a = Buffer.from(sig, "utf8");
            const b = Buffer.from(expected, "utf8");
            if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
                res.status(401).json({ ok: false });
                return;
            }
        }
        const payload = JSON.parse(raw.toString("utf8"));
        const event = typeof payload.event === "string" ? payload.event : "unknown";
        logger.info({ event }, "100ms webhook received");
        // Normalize: adapt keys to your dashboard webhook payload (room_id, recording, etc.)
        const data = payload.data;
        const roomId = data?.room_id ??
            data?.roomId ??
            payload.room_id ??
            "";
        if (roomId) {
            const live = await LiveClass.findOne({ hmsRoomId: roomId }).exec();
            if (live && event.toLowerCase().includes("recording") && data) {
                const playback = data.playback_url ??
                    data.recording_url ??
                    data.url;
                const recordingId = data.recording_id ?? data.id ?? undefined;
                const s3Key = data.s3_key ?? data.asset_path;
                await Recording.create({
                    liveClassId: live._id,
                    hmsRecordingId: recordingId,
                    status: playback || s3Key ? "ready" : "processing",
                    providerPlaybackUrl: playback,
                    s3Key,
                });
            }
        }
        res.json({ ok: true });
    }
    catch (err) {
        logger.error({ err }, "hms webhook error");
        res.status(400).json({ ok: false });
    }
}
//# sourceMappingURL=hms.webhook.js.map