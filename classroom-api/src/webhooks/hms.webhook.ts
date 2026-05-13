import type { Request, Response } from "express";
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
export async function hmsWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const raw = req.body as Buffer;
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

    const payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    const event = typeof payload.event === "string" ? payload.event : "unknown";
    logger.info({ event }, "100ms webhook received");

    // Normalize: adapt keys to your dashboard webhook payload (room_id, recording, etc.)
    const data = payload.data as Record<string, unknown> | undefined;
    const roomId =
      (data?.room_id as string) ??
      (data?.roomId as string) ??
      (payload.room_id as string) ??
      "";

    if (roomId) {
      const live = await LiveClass.findOne({ hmsRoomId: roomId }).exec();
      if (live && event.toLowerCase().includes("recording") && data) {
        const playback =
          (data.playback_url as string) ??
          (data.recording_url as string) ??
          (data.url as string);
        const recordingId =
          (data.recording_id as string) ?? (data.id as string) ?? undefined;
        const s3Key = (data.s3_key as string) ?? (data.asset_path as string);

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
  } catch (err) {
    logger.error({ err }, "hms webhook error");
    res.status(400).json({ ok: false });
  }
}
